import type { CustomSeriesOption, CustomSeriesRenderItem, EChartsCoreOption } from 'echarts';
import { zrUtil } from 'echarts/core';
import type { DraftEdge, EdgeRoute, FlowDirection, FlowGraph, FlowSelection, ResolvedNode, Viewport } from '../types';
import { calcDraftRoute, calcPolylineMidpoint } from '../geometry/edgeRoute';
import { routeEdges, type EdgeRoutingOptions, type RoutableEdge, type RouteCache } from '../geometry/edgeRouter';
import { resolveNode } from '../geometry/nodeShape';
import {
  calcNodesBounds,
  calcRectsBounds,
  calcViewBounds,
  fitBounds,
  IDENTITY_VIEWPORT,
  isBoundsOverlapping,
  mergeBounds,
  type Bounds,
  type ZoomLimits,
} from '../geometry/viewport';
import { fillMissingPositions, type FlowLayoutOptions } from '../layout/calcFlowLayout';
import { calcLaneLayout, getNodeLaneId, type LaneLayout, type Rect } from '../layout/laneLayout';
import { resolveEdgeAppearance } from '../style/resolveAppearance';
import type { FlowTheme, FlowThemeName } from '../theme/flowTheme';
import { resolveFlowTheme } from '../theme/themeRegistry';
import { toZrColor } from '../render/flowColor';
import {
  DRAFT_EDGE_ID,
  FLOW_EDGE_SERIES_ID,
  FLOW_EDGE_SERIES_TYPE,
  FLOW_GRID_SERIES_ID,
  FLOW_GRID_SERIES_TYPE,
  FLOW_LANE_SERIES_ID,
  FLOW_LANE_SERIES_TYPE,
  FLOW_NODE_SERIES_ID,
  FLOW_NODE_SERIES_TYPE,
  FLOW_OVERLAY_SERIES_ID,
  FLOW_OVERLAY_SERIES_TYPE,
  FLOW_OVERVIEW_SERIES_ID,
  FLOW_OVERVIEW_SERIES_TYPE,
  type AlignGuide,
  type EdgeHandle,
  type FlowEdgePayload,
  type FlowGridPayload,
  type FlowLanePayload,
  type FlowNodePayload,
  type FlowOverlayPayload,
  type FlowOverviewPayload,
  type RenderedEdge,
} from '../render/flowPayload';

export interface FlowOptionConfig {
  /** Flow direction; with lanes, TB makes columns and LR makes rows. */
  direction?: FlowDirection;
  viewport?: Viewport;
  selection?: FlowSelection;
  hoveredNodeId?: string | null;
  draftEdge?: DraftEdge | null;
  isEditable?: boolean;
  /** Turn off during drag and pan so elements follow the pointer without lag. */
  animation?: boolean;
  /** Built-in theme name or a custom theme object. Defaults to 'light'. */
  theme?: FlowTheme | FlowThemeName;
  /** Auto layout tuning, used for nodes without positions and lanes without sizes. */
  layout?: Omit<FlowLayoutOptions, 'direction' | 'theme'>;
  /** Edge routing: obstacle avoidance, port spreading, and the size limit for both. */
  routing?: EdgeRoutingOptions;
  /** Reuses routes while the graph object is unchanged; see `RouteCache`. */
  routeCache?: RouteCache;
  /** Box-selection rectangle in world coordinates, drawn while the user drags it. */
  selectionBox?: Rect | null;
  /** Alignment guides shown while nodes are dragged. */
  guides?: AlignGuide[];
  /** Edge whose two ends get draggable handles for reconnecting. */
  handleEdgeId?: string | null;
  /**
   * Chart size in pixels. When set, only nodes and edges within one view size
   * of the visible area are drawn, which keeps zoomed-in large graphs fast.
   */
  viewSize?: { width: number; height: number };
  /**
   * Device pixels per CSS pixel, usually `chart.getDevicePixelRatio()`. Lines
   * and text snap to the device pixel grid, which keeps them sharp at
   * fractional ratios such as 90% or 110% browser zoom. Defaults to 1.
   */
  pixelRatio?: number;
  /**
   * Renderer of the chart. With 'canvas' the background grid is filled with a
   * repeating tile, which paints far faster than one path per dot. Left unset,
   * the grid is a path, which works with both renderers.
   */
  renderer?: 'canvas' | 'svg';
  /**
   * Skip node and edge labels whose on-screen font size is below this many
   * pixels. Far zoomed out, such labels are unreadable, and skipping them
   * saves thousands of text elements on big graphs. Defaults to 0: always draw.
   */
  minLabelPixels?: number;
  /**
   * 'overview' draws nodes and edges in batches: one path per style and one
   * canvas of labels, so thousands of visible nodes render in a few
   * milliseconds, but they cannot be hit. Selected and hovered nodes, selected,
   * running and draft edges, and nodes with gradient fills keep their own
   * elements. 'auto', the default, picks 'overview' when more than
   * `overviewNodeCount` nodes would be drawn, counting the culling margin
   * around the view. Needs `renderer: 'canvas'` and `viewSize`; otherwise
   * everything is drawn in detail.
   */
  detailLevel?: DetailLevel;
  /** Drawn node count above which 'auto' switches to the overview. Defaults to 300. */
  overviewNodeCount?: number;
}

export type DetailLevel = 'auto' | 'detail' | 'overview';

export interface FlowOption extends EChartsCoreOption {
  series: CustomSeriesOption[];
}

export interface FlowScene {
  nodes: ResolvedNode[];
  edges: RenderedEdge[];
  lanes: LaneLayout;
  theme: FlowTheme;
}

const UPDATE_ANIMATION_DURATION = 300;
const GRID_SERIES_Z = 0;
const LANE_SERIES_Z = 1;
const EDGE_SERIES_Z = 2;
const NODE_SERIES_Z = 3;
const OVERLAY_SERIES_Z = 4;
const EMPTY_SELECTION: FlowSelection = { nodeIds: [], edgeIds: [] };
/** Culling keeps one view size around the visible area, so a short pan never reaches undrawn space. */
export const CULL_MARGIN_RATIO = 1;
export const DEFAULT_OVERVIEW_NODE_COUNT = 300;

function calcEdgeBounds(edge: RenderedEdge): Bounds {
  const xs = edge.points.map((point) => point.x);
  const ys = edge.points.map((point) => point.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/**
 * Nodes the detailed series would draw: those within one view size of the
 * visible area. This, not the visible count, is what a render costs.
 */
export function countDrawnNodes(nodes: ResolvedNode[], viewport: Viewport, viewSize: { width: number; height: number }): number {
  const area = calcViewBounds(viewport, viewSize.width, viewSize.height, CULL_MARGIN_RATIO);
  return nodes.reduce((count, node) => count + (isBoundsOverlapping(calcNodesBounds([node]) as Bounds, area) ? 1 : 0), 0);
}

function resolveIsOverview(drawnNodeCount: number, config: FlowOptionConfig): boolean {
  const level = config.detailLevel ?? 'auto';
  if (level === 'detail' || config.renderer !== 'canvas' || !config.viewSize) {
    return false;
  }
  return level === 'overview' || drawnNodeCount > (config.overviewNodeCount ?? DEFAULT_OVERVIEW_NODE_COUNT);
}

/** Batched paths share one bounding box, which would stretch a gradient across all of them. */
function hasGradient(node: ResolvedNode): boolean {
  const { fill, stroke, accent } = node.appearance;
  return [fill, stroke, accent].some((color) => color !== null && typeof color !== 'string');
}

interface SceneSplit {
  detail: Pick<FlowScene, 'nodes' | 'edges'>;
  overview: Pick<FlowScene, 'nodes' | 'edges'>;
}

/**
 * In the overview, items that react to the user or animate keep their own
 * elements: selected, hovered and gradient nodes, and selected, running and
 * draft edges. Everything else is batched.
 */
function splitForOverview({ nodes, edges }: Pick<FlowScene, 'nodes' | 'edges'>, config: FlowOptionConfig): SceneSplit {
  const selection = config.selection ?? EMPTY_SELECTION;
  const hotNodeIds = new Set([...selection.nodeIds, ...(config.hoveredNodeId ? [config.hoveredNodeId] : [])]);
  const hotEdgeIds = new Set([...selection.edgeIds, ...(config.handleEdgeId ? [config.handleEdgeId] : [])]);
  const isHotNode = (node: ResolvedNode) => hotNodeIds.has(node.id) || hasGradient(node);
  const isHotEdge = (edge: RenderedEdge) => edge.isDraft || edge.isRunning || hotEdgeIds.has(edge.id);
  return {
    detail: { nodes: nodes.filter(isHotNode), edges: edges.filter(isHotEdge) },
    overview: { nodes: nodes.filter((node) => !isHotNode(node)), edges: edges.filter((edge) => !isHotEdge(edge)) },
  };
}

/**
 * Drops nodes and edges outside the view plus `marginRatio` view sizes around
 * it. The draft edge always stays.
 */
function cullScene(
  scene: Pick<FlowScene, 'nodes' | 'edges'>,
  viewport: Viewport,
  viewSize: FlowOptionConfig['viewSize'],
  marginRatio = CULL_MARGIN_RATIO,
): Pick<FlowScene, 'nodes' | 'edges'> {
  if (!viewSize) {
    return scene;
  }
  const area = calcViewBounds(viewport, viewSize.width, viewSize.height, marginRatio);
  const nodes = scene.nodes.filter((node) => isBoundsOverlapping(calcNodesBounds([node]) as Bounds, area));
  const edges = scene.edges.filter((edge) => edge.isDraft || isBoundsOverlapping(calcEdgeBounds(edge), area));
  return { nodes, edges };
}

function buildEdgeHandles(edges: RenderedEdge[], edgeId: string | null | undefined): EdgeHandle[] {
  const edge = edgeId ? edges.find((item) => item.id === edgeId && !item.isDraft) : undefined;
  if (!edge || edge.points.length < 2) {
    return [];
  }
  return [
    { edgeId: edge.id, end: 'source', point: edge.points[0] },
    { edgeId: edge.id, end: 'target', point: edge.points[edge.points.length - 1] },
  ];
}

/** Fills missing positions, then resolves size and appearance so every node can be drawn. */
export function resolveNodes(
  graph: FlowGraph,
  theme: FlowTheme,
  direction: FlowDirection = 'TB',
  layout: FlowOptionConfig['layout'] = {},
): ResolvedNode[] {
  const positioned = fillMissingPositions(graph, { ...layout, direction, theme });
  const lanes = positioned.lanes ?? [];
  const laneStyles = new Map(lanes.map((lane) => [lane.id, lane.nodeStyle]));
  return positioned.nodes.map((node) => {
    const laneId = getNodeLaneId(node, lanes);
    return resolveNode(node, theme, laneId ? laneStyles.get(laneId) : undefined);
  });
}

function buildRenderedEdges(
  graph: FlowGraph,
  nodes: ResolvedNode[],
  lanes: LaneLayout,
  theme: FlowTheme,
  config: FlowOptionConfig,
): RenderedEdge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const routable: RoutableEdge[] = [];
  graph.edges.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (source && target && source !== target) {
      routable.push({ edge, source, target, appearance: resolveEdgeAppearance(edge, theme) });
    }
  });
  const direction = config.direction ?? 'TB';
  const routing = config.routing ?? {};
  const cacheKey = [graph, theme, direction, routing.isSmart, routing.maxSmartNodes, routing.shouldSpreadPorts];
  const cached = config.routeCache?.get(cacheKey);
  const routes = cached ?? routeEdges(routable, nodes, direction, lanes, routing);
  if (!cached) {
    config.routeCache?.set(cacheKey, routes);
  }
  const edges: RenderedEdge[] = routable.map(({ edge, target, appearance }) => ({
    ...edge,
    ...(routes.get(edge.id) as EdgeRoute),
    appearance,
    isDraft: false,
    isRunning: target.status === 'running',
  }));

  const draftSource = config.draftEdge ? nodeMap.get(config.draftEdge.sourceId) : undefined;
  if (config.draftEdge && draftSource) {
    const route = calcDraftRoute(draftSource, config.draftEdge.target);
    // A dragged source end keeps the arrow on the fixed target node.
    const points = config.draftEdge.isReversed ? [...route].reverse() : route;
    const draft = { id: DRAFT_EDGE_ID, source: draftSource.id, target: '' };
    edges.push({
      ...draft,
      points,
      isCurve: false,
      labelPosition: calcPolylineMidpoint(points),
      appearance: resolveEdgeAppearance(draft, theme),
      isDraft: true,
      isRunning: false,
    });
  }
  return edges;
}

/** Resolves everything needed to draw: nodes, routed edges and lane boxes. */
export function buildFlowScene(graph: FlowGraph, config: FlowOptionConfig = {}): FlowScene {
  const theme = resolveFlowTheme(config.theme);
  const direction = config.direction ?? 'TB';
  const positioned = fillMissingPositions(graph, { ...config.layout, direction, theme });
  const nodes = resolveNodes(positioned, theme, direction);
  const lanes = calcLaneLayout(positioned, nodes, theme, direction);
  return { nodes, edges: buildRenderedEdges(positioned, nodes, lanes, theme, config), lanes, theme };
}

/** Viewport that fits nodes, lanes and the title into a container of the given size. */
export function calcFitViewport(
  graph: FlowGraph,
  width: number,
  height: number,
  config: Pick<FlowOptionConfig, 'direction' | 'theme' | 'layout'> = {},
  zoomLimits?: ZoomLimits,
): Viewport {
  const scene = buildFlowScene(graph, config);
  const laneRects = [...scene.lanes.lanes, ...(scene.lanes.title ? [scene.lanes.title] : [])];
  const bounds = mergeBounds(calcNodesBounds(scene.nodes), calcRectsBounds(laneRects));
  return fitBounds(bounds, width, height, undefined, zoomLimits);
}

/**
 * Converts a flow graph into ECharts series. Requires the flow extension to be
 * installed with `echarts.use(flowExtension)`.
 */
export function buildFlowOption(graph: FlowGraph, config: FlowOptionConfig = {}): FlowOption {
  return buildFlowOptionFromScene(buildFlowScene(graph, config), config);
}

export function buildFlowOptionFromScene(scene: FlowScene, config: FlowOptionConfig = {}): FlowOption {
  const { lanes, theme } = scene;
  const viewport = config.viewport ?? IDENTITY_VIEWPORT;
  const selection = config.selection ?? EMPTY_SELECTION;
  const { nodes, edges } = cullScene(scene, viewport, config.viewSize);
  const pixelRatio = config.pixelRatio ?? 1;
  const isOverview = resolveIsOverview(nodes.length, config);
  // The overview is redrawn on every pan and zoom frame, so it needs no margin.
  const split = isOverview
    ? splitForOverview(cullScene({ nodes, edges }, viewport, config.viewSize, 0), config)
    : { detail: { nodes, edges }, overview: { nodes: [], edges: [] } };

  const gridPayload: FlowGridPayload = { viewport, theme, pixelRatio, shouldUsePattern: config.renderer === 'canvas' };
  const lanePayload: FlowLanePayload = { lanes: lanes.lanes, title: lanes.title, viewport, theme, pixelRatio };
  const minLabelPixels = config.minLabelPixels ?? 0;
  const edgeBase = { viewport, selectedIds: selection.edgeIds, theme, pixelRatio, minLabelPixels };
  const nodeBase = {
    viewport,
    selectedIds: selection.nodeIds,
    hoveredId: config.hoveredNodeId ?? null,
    isEditable: config.isEditable ?? false,
    theme,
    pixelRatio,
    minLabelPixels,
    // In the overview nodes are tiny and the editor hit-tests them itself, so
    // ports would only blanket the node and hijack its press into a connection.
    arePortsHidden: isOverview,
  };
  const edgePayload: FlowEdgePayload = { ...edgeBase, edges: split.detail.edges };
  const nodePayload: FlowNodePayload = { ...nodeBase, nodes: split.detail.nodes };
  const overviewPayload: FlowOverviewPayload = {
    edges: { ...edgeBase, edges: split.overview.edges },
    nodes: { ...nodeBase, nodes: split.overview.nodes },
  };
  const overlayPayload: FlowOverlayPayload = {
    viewport,
    theme,
    pixelRatio,
    selectionBox: config.selectionBox ?? null,
    guides: config.guides ?? [],
    edgeHandles: buildEdgeHandles(edges, config.handleEdgeId),
  };
  const laneItems = [...lanes.lanes.map((lane) => lane.id), ...(lanes.title ? ['__title__'] : [])];

  // Registered custom series are referenced by name; the typings only know functions.
  // setOption deep-clones options; the payload is rebuilt on every render and only
  // read by renderItem, so it is passed by reference (about 6 ms on 1000 nodes).
  const buildSeries = (id: string, type: string, z: number, payload: object, data: object[]): CustomSeriesOption => {
    zrUtil.setAsPrimitive(payload);
    return {
      type: 'custom',
      coordinateSystem: 'none',
      animation: config.animation ?? true,
      animationDurationUpdate: UPDATE_ANIMATION_DURATION,
      animationEasingUpdate: 'cubicOut',
      id,
      z,
      renderItem: type as unknown as CustomSeriesRenderItem,
      itemPayload: payload as Record<string, unknown>,
      data,
    };
  };

  return {
    backgroundColor: toZrColor(theme.background),
    series: [
      buildSeries(FLOW_GRID_SERIES_ID, FLOW_GRID_SERIES_TYPE, GRID_SERIES_Z, gridPayload, [{ id: 'grid', value: [0] }]),
      buildSeries(FLOW_LANE_SERIES_ID, FLOW_LANE_SERIES_TYPE, LANE_SERIES_Z, lanePayload, laneItems.map((id) => ({ id, value: [0] }))),
      // Below the detailed edges, so selected and running edges stay on top.
      buildSeries(FLOW_OVERVIEW_SERIES_ID, FLOW_OVERVIEW_SERIES_TYPE, EDGE_SERIES_Z, overviewPayload, isOverview ? [{ id: 'overview', value: [0] }] : []),
      buildSeries(
        FLOW_EDGE_SERIES_ID,
        FLOW_EDGE_SERIES_TYPE,
        EDGE_SERIES_Z,
        edgePayload,
        edgePayload.edges.map((edge) => ({ id: edge.id, name: edge.label ?? '', value: [0] })),
      ),
      buildSeries(
        FLOW_NODE_SERIES_ID,
        FLOW_NODE_SERIES_TYPE,
        NODE_SERIES_Z,
        nodePayload,
        nodePayload.nodes.map((node) => ({ id: node.id, name: node.label, value: [node.x, node.y] })),
      ),
      buildSeries(FLOW_OVERLAY_SERIES_ID, FLOW_OVERLAY_SERIES_TYPE, OVERLAY_SERIES_Z, overlayPayload, [{ id: 'overlay', value: [0] }]),
    ],
  };
}
