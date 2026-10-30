import type { ECElementEvent, EChartsType, ElementEvent } from 'echarts';
import type {
  EdgeEnd,
  FlowDirection,
  FlowEdge,
  FlowGraph,
  FlowLane,
  FlowNode,
  FlowNodeShape,
  FlowSelection,
  FlowStatus,
  Point,
  ResolvedEdge,
  ResolvedNode,
  Viewport,
} from '../types';
import { buildFlowOptionFromScene, buildFlowScene, calcFitViewport, CULL_MARGIN_RATIO } from '../option/buildFlowOption';
import { calcFlowLayout, fillMissingPositions, type FlowLayoutOptions } from '../layout/calcFlowLayout';
import { findLaneAt, type LaneLayout } from '../layout/laneLayout';
import {
  calcNodesBounds,
  calcViewBounds,
  clampScale,
  isBoundsInside,
  panBy,
  toScreen,
  toWorld,
  zoomAt,
  type Bounds,
  type ZoomLimits,
} from '../geometry/viewport';
import { RouteCache, type EdgeRoutingOptions } from '../geometry/edgeRouter';
import { isFlowHitInfo, type AlignGuide, type FlowHitInfo } from '../render/flowPayload';
import { watchDevicePixelRatio } from '../render/pixelRatioSync';
import type { FlowTheme, FlowThemeName } from '../theme/flowTheme';
import { resolveFlowTheme } from '../theme/themeRegistry';
import { toDrawio } from '../export/drawio';
import { exportFlowPng, exportFlowSvg, type FlowImageOptions } from '../export/exportImage';
import { toMermaid } from '../export/mermaid';
import { calcAlignment } from './alignGuides';
import { calcRectFromPoints, mergeSelections, selectInRect } from './boxSelect';
import { copyElements, pasteElements, type FlowClipboard } from './clipboard';
import { FlowHistory } from './flowHistory';
import { LabelInput } from './LabelInput';
import { ViewTransformer } from './viewTransform';
import { isNudgeCommand, resolveShortcut, type EditorCommand } from './keyboardShortcuts';
import { addLane, removeLane, setNodeLanes, updateLane } from './laneOps';
import { DEFAULT_EDIT_OPTIONS, isEditAllowed, mergeEditOptions, type FlowEditOptions } from './editOptions';
import {
  addEdge,
  addNode,
  canConnect,
  collectElementIds,
  createUniqueId,
  moveNodes,
  reconnectEdge,
  removeElements,
  setNodePositions,
  snapToGrid,
  updateEdge,
  updateNode,
} from './graphOps';

export type FlowEditorChart = EChartsType;

export interface FlowEditorOptions {
  graph?: FlowGraph;
  /** Flow direction; with lanes, TB makes columns and LR makes rows. */
  direction?: FlowDirection;
  /** Which interactions are allowed; see `FlowEditOptions`. Change later with `setEditOptions()`. */
  edit?: Partial<FlowEditOptions>;
  /** Shorthand for `edit.isEnabled`. */
  isEditable?: boolean;
  /** Shorthand for `edit.shouldSnapToGrid`. */
  shouldSnapToGrid?: boolean;
  /** Built-in theme name or a custom theme object. Defaults to 'light'. */
  theme?: FlowTheme | FlowThemeName;
  /** Auto layout tuning: node and rank gaps, compact lanes. */
  layout?: Omit<FlowLayoutOptions, 'direction' | 'theme'>;
  /** Edge routing: obstacle avoidance, port spreading, and the size limit for both. */
  routing?: EdgeRoutingOptions;
  onChange?(graph: FlowGraph): void;
  onSelectionChange?(selection: FlowSelection): void;
}

export interface AddNodeInput extends Partial<Omit<FlowNode, 'id' | 'shape'>> {
  shape: FlowNodeShape;
}

type DragNodeInteraction = {
  type: 'drag-node';
  startScreen: Point;
  origins: Map<string, Point>;
  before: FlowGraph;
  hasMoved: boolean;
  guides: AlignGuide[];
};

type Interaction =
  | DragNodeInteraction
  | { type: 'pan'; lastScreen: Point }
  | { type: 'connect'; sourceId: string; cursor: Point }
  | { type: 'box-select'; start: Point; current: Point; base: FlowSelection }
  /** `graph` is the graph without the edge being moved, drawn while it is dragged. */
  | { type: 'reconnect'; edgeId: string; end: EdgeEnd; fixedNodeId: string; cursor: Point; graph: FlowGraph };

/** Pointer travel in pixels before a press on a node becomes a drag. */
const DRAG_THRESHOLD = 3;
const ZOOM_BUTTON_FACTOR = 1.2;
/** Offset applied when a new node would land on top of an existing one. */
const STACK_OFFSET = 30;
const MAX_STACK_ATTEMPTS = 20;
const LANE_INPUT_WIDTH = 140;
/** Graphs larger than this use simple edge routing while nodes are dragged. */
const DRAG_SMART_ROUTING_LIMIT = 60;
/** World distance between a copy and its original; repeated pastes step further. */
const PASTE_OFFSET = 20;
/** Shift + arrow moves this many steps at once. */
const NUDGE_LARGE_FACTOR = 10;

const NUDGE_DIRECTIONS: Record<'nudge-left' | 'nudge-right' | 'nudge-up' | 'nudge-down', Point> = {
  'nudge-left': { x: -1, y: 0 },
  'nudge-right': { x: 1, y: 0 },
  'nudge-up': { x: 0, y: -1 },
  'nudge-down': { x: 0, y: 1 },
};

const DEFAULT_LABELS: Record<FlowNodeShape, string> = {
  start: '开始',
  end: '结束',
  process: '处理',
  decision: '判断',
  io: '输入/输出',
  circle: '节点',
  hexagon: '准备',
  document: '文档',
  database: '数据库',
  subprocess: '子流程',
  text: '文本',
};

const EMPTY_GRAPH: FlowGraph = { nodes: [], edges: [] };

function isSameSelection(a: FlowSelection, b: FlowSelection): boolean {
  const isSameList = (x: string[], y: string[]) => x.length === y.length && x.every((id, index) => id === y[index]);
  return isSameList(a.nodeIds, b.nodeIds) && isSameList(a.edgeIds, b.edgeIds);
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function readHitInfo(params: ECElementEvent): FlowHitInfo | null {
  const info = (params as { info?: unknown }).info;
  return isFlowHitInfo(info) ? info : null;
}

function readNativeEvent(params: ECElementEvent): MouseEvent | null {
  const nativeEvent = params.event?.event;
  return nativeEvent instanceof MouseEvent ? nativeEvent : null;
}

/**
 * Interactive flowchart editor on top of an ECharts instance.
 * The chart must have the flow extension and a renderer installed.
 */
export class FlowEditor {
  private graph: FlowGraph;
  private viewport: Viewport = { x: 0, y: 0, scale: 1 };
  private selection: FlowSelection = { nodeIds: [], edgeIds: [] };
  private hoveredNodeId: string | null = null;
  private interaction: Interaction | null = null;
  private editOptions: FlowEditOptions;
  private theme: FlowTheme | FlowThemeName;
  private layout: Omit<FlowLayoutOptions, 'direction' | 'theme'>;
  private renderedNodes: ResolvedNode[] = [];
  private renderedEdges: ResolvedEdge[] = [];
  private renderedLanes: LaneLayout = { lanes: [], title: null };
  private pendingFrame: number | null = null;
  private stopWatchingPixelRatio: () => void = () => {};
  private clipboard: FlowClipboard | null = null;
  /** Pastes since the last copy, so each paste lands one step further away. */
  private pasteCount = 0;
  /** Viewport of the last full render; pan and zoom frames transform that drawing. */
  private renderedViewport: Viewport = this.viewport;
  private settleTimer: number | null = null;
  /** A frame is pending that must rebuild the drawing, not just move it. */
  private needsFullRender = false;
  private readonly viewTransformer: ViewTransformer;
  private readonly history = new FlowHistory();
  private readonly routeCache = new RouteCache();
  private readonly labelInput: LabelInput;
  private readonly container: HTMLElement;
  private readonly direction: FlowDirection;

  constructor(private readonly chart: FlowEditorChart, private readonly options: FlowEditorOptions = {}) {
    this.container = chart.getDom();
    this.direction = options.direction ?? 'TB';
    this.editOptions = mergeEditOptions(DEFAULT_EDIT_OPTIONS, {
      isEnabled: options.isEditable,
      shouldSnapToGrid: options.shouldSnapToGrid,
      ...options.edit,
    });
    this.theme = options.theme ?? 'light';
    this.layout = options.layout ?? {};
    this.graph = this.fillLayout(options.graph ?? EMPTY_GRAPH);
    this.labelInput = new LabelInput(this.container);
    this.viewTransformer = new ViewTransformer(chart);
    this.prepareContainer();
    this.bindEvents();
    this.fitView();
  }

  getGraph(): FlowGraph {
    return this.graph;
  }

  /** Replaces the graph. Pass `shouldRecord` to make the replacement undoable. */
  setGraph(graph: FlowGraph, shouldRecord = false): void {
    const positioned = this.fillLayout(graph);
    if (shouldRecord) {
      this.commit(positioned);
      return;
    }
    this.history.clear();
    this.graph = positioned;
    this.pruneSelection();
    this.render();
  }

  getSelection(): FlowSelection {
    return this.selection;
  }

  setSelection(selection: FlowSelection): void {
    if (isSameSelection(selection, this.selection)) {
      return;
    }
    this.selection = selection;
    this.options.onSelectionChange?.(selection);
    this.render();
  }

  getViewport(): Viewport {
    return this.viewport;
  }

  /** Adds a node, by default at the visible center, and selects it. Returns the new id. */
  addNode(input: AddNodeInput): string {
    const id = createUniqueId('node', collectElementIds(this.graph));
    const position = this.findFreePosition(input.x != null && input.y != null ? { x: input.x, y: input.y } : this.getVisibleCenter());
    const laneId = input.laneId ?? findLaneAt(this.renderedLanes, position)?.id;
    const node: FlowNode = { ...input, id, label: input.label ?? DEFAULT_LABELS[input.shape], ...position, laneId };
    this.commit(addNode(this.graph, node));
    this.setSelection({ nodeIds: [id], edgeIds: [] });
    return id;
  }

  updateNode(nodeId: string, patch: Partial<Omit<FlowNode, 'id'>>): void {
    this.commit(updateNode(this.graph, nodeId, patch));
  }

  updateEdge(edgeId: string, patch: Partial<Omit<FlowEdge, 'id'>>): void {
    this.commit(updateEdge(this.graph, edgeId, patch));
  }

  /** Appends a lane after the last one. Returns the new id. */
  addLane(input: Partial<Omit<FlowLane, 'id'>> = {}): string {
    const id = createUniqueId('lane', (this.graph.lanes ?? []).map((lane) => lane.id));
    const size = input.size ?? this.getTheme().lane.minSize;
    this.commit(addLane(this.graph, { label: `泳道 ${(this.graph.lanes?.length ?? 0) + 1}`, ...input, size, id }));
    return id;
  }

  /** Updates a lane; a size change shifts nodes in later lanes along with it. */
  updateLane(laneId: string, patch: Partial<Omit<FlowLane, 'id'>>): void {
    this.commit(updateLane(this.graph, laneId, patch, this.direction, this.getTheme()));
  }

  /** Removes a lane and moves its nodes into the neighboring lane. */
  removeLane(laneId: string): void {
    this.commit(removeLane(this.graph, laneId, this.direction, this.getTheme()));
  }

  setTitle(title: string | undefined): void {
    this.commit({ ...this.graph, title });
  }

  /** Runtime status is monitoring state, not an edit, so it bypasses undo history. */
  setNodeStatus(nodeId: string, status: FlowStatus | undefined): void {
    this.graph = updateNode(this.graph, nodeId, { status });
    this.options.onChange?.(this.graph);
    this.render();
  }

  /**
   * Connects two nodes. Returns the edge id, or null when the connection is
   * a self loop, a duplicate, or rejected by `validateConnection`.
   */
  connect(sourceId: string, targetId: string, label?: string): string | null {
    if (!canConnect(this.graph, sourceId, targetId)) {
      return null;
    }
    const isValid = this.editOptions.validateConnection?.(sourceId, targetId, this.graph) ?? true;
    if (!isValid) {
      return null;
    }
    const id = createUniqueId('edge', collectElementIds(this.graph));
    this.commit(addEdge(this.graph, { id, source: sourceId, target: targetId, label }));
    return id;
  }

  /** Deletes the selection, skipping locked nodes and edges. `beforeDelete` can cancel it. */
  deleteSelection(): void {
    const lockedNodeIds = new Set(this.graph.nodes.filter((node) => node.isLocked).map((node) => node.id));
    const lockedEdgeIds = new Set(this.graph.edges.filter((edge) => edge.isLocked).map((edge) => edge.id));
    const deletable: FlowSelection = {
      nodeIds: this.selection.nodeIds.filter((id) => !lockedNodeIds.has(id)),
      edgeIds: this.selection.edgeIds.filter((id) => !lockedEdgeIds.has(id)),
    };
    if (deletable.nodeIds.length === 0 && deletable.edgeIds.length === 0) {
      return;
    }
    const isConfirmed = this.editOptions.beforeDelete?.(deletable, this.graph) ?? true;
    if (isConfirmed) {
      this.commit(removeElements(this.graph, deletable));
    }
  }

  undo(): void {
    this.restore(this.history.undo(this.graph));
  }

  /** Selects every node and edge. */
  selectAll(): void {
    this.setSelection({ nodeIds: this.graph.nodes.map((node) => node.id), edgeIds: this.graph.edges.map((edge) => edge.id) });
  }

  /** Copies the selected nodes and the edges between them. Returns false when no node is selected. */
  copySelection(): boolean {
    const clipboard = copyElements(this.graph, this.selection);
    if (!clipboard) {
      return false;
    }
    this.clipboard = clipboard;
    this.pasteCount = 0;
    return true;
  }

  /** Copies, then deletes the selection; locked elements and `beforeDelete` apply as in `deleteSelection()`. */
  cutSelection(): void {
    if (this.copySelection()) {
      this.deleteSelection();
    }
  }

  /** Pastes the last copy, offset from the original, and selects the copies. */
  paste(): void {
    if (!this.clipboard) {
      return;
    }
    this.pasteCount++;
    this.insertCopies(this.clipboard, PASTE_OFFSET * this.pasteCount);
  }

  /** Copies the selected nodes in place, offset by one step, without touching the clipboard. */
  duplicateSelection(): void {
    const copies = copyElements(this.graph, this.selection);
    if (copies) {
      this.insertCopies(copies, PASTE_OFFSET);
    }
  }

  /** Moves the selected, unlocked nodes by a world offset as one undoable step. */
  moveSelection(dx: number, dy: number): void {
    this.commit(moveNodes(this.graph, this.selection.nodeIds, dx, dy));
  }

  /**
   * Moves one end of an edge to another node. Returns false when the edge is
   * locked, the result would be a self loop or duplicate, or
   * `validateConnection` rejects it.
   */
  reconnectEdge(edgeId: string, end: EdgeEnd, nodeId: string): boolean {
    const edge = this.graph.edges.find((item) => item.id === edgeId);
    if (!edge || edge.isLocked) {
      return false;
    }
    const next = reconnectEdge(this.graph, edgeId, end, nodeId);
    if (next === this.graph) {
      return false;
    }
    const source = end === 'source' ? nodeId : edge.source;
    const target = end === 'target' ? nodeId : edge.target;
    if (!(this.editOptions.validateConnection?.(source, target, this.graph) ?? true)) {
      return false;
    }
    this.commit(next);
    return true;
  }

  redo(): void {
    this.restore(this.history.redo(this.graph));
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  /** Re-runs automatic layout on all nodes as one undoable step, then fits the view. */
  autoLayout(): void {
    this.commit(calcFlowLayout(this.graph, this.getLayoutOptions()));
    this.fitView();
  }

  fitView(): void {
    this.viewport = calcFitViewport(
      this.graph,
      this.chart.getWidth(),
      this.chart.getHeight(),
      { direction: this.direction, theme: this.theme, layout: this.layout },
      this.getZoomLimits(),
    );
    this.render();
  }

  zoomIn(): void {
    this.zoomAroundCenter(ZOOM_BUTTON_FACTOR);
  }

  zoomOut(): void {
    this.zoomAroundCenter(1 / ZOOM_BUTTON_FACTOR);
  }

  setEditable(isEditable: boolean): void {
    this.setEditOptions({ isEnabled: isEditable });
  }

  getEditOptions(): FlowEditOptions {
    return this.editOptions;
  }

  /** Changes allowed interactions at runtime; unspecified options keep their current value. */
  setEditOptions(patch: Partial<FlowEditOptions>): void {
    this.editOptions = mergeEditOptions(this.editOptions, patch);
    // Stop anything the new options no longer allow, such as a drag in progress.
    this.cancelInteraction();
    if (!isEditAllowed(this.editOptions, 'canEditLabels')) {
      this.labelInput.close();
    }
    if (!this.editOptions.canSelect) {
      this.setSelectionSilently({ nodeIds: [], edgeIds: [] });
    }
    this.viewport = { ...this.viewport, scale: clampScale(this.viewport.scale, this.getZoomLimits()) };
    this.render();
  }

  /** Moves and zooms the view directly; the scale is kept within the zoom limits. */
  setViewport(viewport: Viewport): void {
    this.viewport = { ...viewport, scale: clampScale(viewport.scale, this.getZoomLimits()) };
    this.render();
  }

  /** Sets the zoom level around the center of the chart. */
  setZoom(scale: number): void {
    this.zoomAroundCenter(scale / this.viewport.scale);
  }

  setTheme(theme: FlowTheme | FlowThemeName): void {
    this.theme = theme;
    this.render();
  }

  /** Changes auto layout tuning; takes effect on the next `autoLayout()`. */
  setLayoutOptions(layout: Omit<FlowLayoutOptions, 'direction' | 'theme'>): void {
    this.layout = layout;
  }

  /** Pushes the current state to the chart immediately. */
  render(): void {
    this.renderNow(this.interaction === null);
  }

  /** The whole graph as an SVG document, drawn with the editor's theme and without selection. */
  exportSvg(options: Omit<FlowImageOptions, 'direction' | 'theme' | 'layout' | 'routing'> = {}): string {
    return exportFlowSvg(this.graph, { ...this.getExportConfig(), ...options });
  }

  /** The whole graph as a PNG data URL, drawn with the editor's theme and without selection. */
  exportPng(options: Omit<FlowImageOptions, 'direction' | 'theme' | 'layout' | 'routing'> = {}): string {
    return exportFlowPng(this.graph, { ...this.getExportConfig(), ...options });
  }

  /** The graph as a Mermaid flowchart; see `toMermaid` for what carries over. */
  exportMermaid(): string {
    return toMermaid(this.graph, { direction: this.direction });
  }

  /** The graph as an uncompressed draw.io file with current positions and lanes. */
  exportDrawio(): string {
    return toDrawio(this.graph, { direction: this.direction, theme: this.theme, layout: this.layout });
  }

  private getExportConfig() {
    return { direction: this.direction, theme: this.theme, layout: this.layout, routing: this.options.routing };
  }

  dispose(): void {
    this.cancelScheduledRender();
    this.cancelInteraction();
    this.labelInput.close();
    this.unbindEvents();
  }

  private renderNow(isAnimated: boolean): void {
    this.cancelScheduledRender();
    this.viewTransformer.reset();
    const interaction = this.interaction;
    const config = {
      direction: this.direction,
      viewport: this.viewport,
      viewSize: { width: this.chart.getWidth(), height: this.chart.getHeight() },
      selection: this.selection,
      hoveredNodeId: this.hoveredNodeId,
      draftEdge: this.getDraftEdge(),
      // Ports only appear when the user may draw connections.
      isEditable: isEditAllowed(this.editOptions, 'canConnect'),
      animation: isAnimated,
      theme: this.theme,
      layout: this.layout,
      routing: this.getRoutingOptions(),
      routeCache: this.routeCache,
      selectionBox: interaction?.type === 'box-select' ? calcRectFromPoints(interaction.start, interaction.current) : null,
      guides: interaction?.type === 'drag-node' ? interaction.guides : [],
      handleEdgeId: this.getHandleEdgeId(),
    };
    // The edge being reconnected is hidden and drawn as a draft that follows the pointer.
    const graph = interaction?.type === 'reconnect' ? interaction.graph : this.graph;
    const scene = buildFlowScene(graph, config);
    this.renderedNodes = scene.nodes;
    this.renderedEdges = scene.edges;
    this.renderedLanes = scene.lanes;
    this.renderedViewport = this.viewport;
    this.chart.setOption(buildFlowOptionFromScene(scene, config));
  }

  private getDraftEdge() {
    const interaction = this.interaction;
    if (interaction?.type === 'connect') {
      return { sourceId: interaction.sourceId, target: interaction.cursor };
    }
    if (interaction?.type === 'reconnect') {
      return { sourceId: interaction.fixedNodeId, target: interaction.cursor, isReversed: interaction.end === 'source' };
    }
    return null;
  }

  /** A single selected, unlocked edge shows handles on its ends for reconnecting. */
  private getHandleEdgeId(): string | null {
    const { edgeIds, nodeIds } = this.selection;
    if (!isEditAllowed(this.editOptions, 'canReconnect') || edgeIds.length !== 1 || nodeIds.length > 0 || this.interaction) {
      return null;
    }
    const edge = this.graph.edges.find((item) => item.id === edgeIds[0]);
    return edge && !edge.isLocked ? edge.id : null;
  }

  /**
   * Smart routing reruns on every frame while nodes move; on bigger graphs
   * use the simple router during the drag and route properly on release.
   */
  private getRoutingOptions(): EdgeRoutingOptions {
    const routing = this.options.routing ?? {};
    const isDragging = this.interaction?.type === 'drag-node';
    return isDragging && this.graph.nodes.length > DRAG_SMART_ROUTING_LIMIT ? { ...routing, isSmart: false } : routing;
  }

  private getTheme(): FlowTheme {
    return resolveFlowTheme(this.theme);
  }

  private getLayoutOptions(): FlowLayoutOptions {
    return { ...this.layout, direction: this.direction, theme: this.getTheme() };
  }

  /** Positions missing nodes and sizes missing lanes with the current theme's metrics. */
  private fillLayout(graph: FlowGraph): FlowGraph {
    return fillMissingPositions(graph, this.getLayoutOptions());
  }

  private insertCopies(clipboard: FlowClipboard, offset: number): void {
    const result = pasteElements(this.graph, clipboard, { x: offset, y: offset });
    this.commit(result.graph);
    this.setSelection(result.selection);
  }

  private commit(next: FlowGraph): void {
    if (next === this.graph) {
      return;
    }
    this.history.record(this.graph);
    this.graph = next;
    this.pruneSelection();
    this.options.onChange?.(next);
    this.render();
  }

  private restore(graph: FlowGraph | null): void {
    if (!graph) {
      return;
    }
    this.graph = graph;
    this.pruneSelection();
    this.options.onChange?.(graph);
    this.render();
  }

  /** Drops selected ids that no longer exist after a change. */
  private pruneSelection(): void {
    const nodeIds = new Set(this.graph.nodes.map((node) => node.id));
    const edgeIds = new Set(this.graph.edges.map((edge) => edge.id));
    this.setSelectionSilently({
      nodeIds: this.selection.nodeIds.filter((id) => nodeIds.has(id)),
      edgeIds: this.selection.edgeIds.filter((id) => edgeIds.has(id)),
    });
    if (this.hoveredNodeId && !nodeIds.has(this.hoveredNodeId)) {
      this.hoveredNodeId = null;
    }
  }

  /** Updates selection and notifies, without rendering; the caller renders. */
  private setSelectionSilently(selection: FlowSelection): void {
    if (isSameSelection(selection, this.selection)) {
      return;
    }
    this.selection = selection;
    this.options.onSelectionChange?.(selection);
  }

  private getVisibleCenter(): Point {
    return toWorld(this.viewport, { x: this.chart.getWidth() / 2, y: this.chart.getHeight() / 2 });
  }

  private snapPoint(point: Point): Point {
    const { shouldSnapToGrid, gridSize } = this.editOptions;
    if (!shouldSnapToGrid) {
      return point;
    }
    return { x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) };
  }

  /** Shifts the position diagonally until it no longer sits on an existing node center. */
  private findFreePosition(preferred: Point): Point {
    let position = this.snapPoint(preferred);
    for (let attempt = 0; attempt < MAX_STACK_ATTEMPTS; attempt++) {
      const isTaken = this.graph.nodes.some((node) => node.x === position.x && node.y === position.y);
      if (!isTaken) {
        break;
      }
      position = { x: position.x + STACK_OFFSET, y: position.y + STACK_OFFSET };
    }
    return position;
  }

  private getZoomLimits(): ZoomLimits {
    return { min: this.editOptions.minZoom, max: this.editOptions.maxZoom };
  }

  private zoomAroundCenter(factor: number): void {
    const center = { x: this.chart.getWidth() / 2, y: this.chart.getHeight() / 2 };
    this.viewport = zoomAt(this.viewport, center, factor, this.getZoomLimits());
    this.render();
  }

  private cancelScheduledRender(): void {
    this.needsFullRender = false;
    if (this.pendingFrame !== null) {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }
    if (this.settleTimer !== null) {
      window.clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  /**
   * Pan and zoom frames move the existing drawing instead of rebuilding it.
   * Falls back to a full render once the view leaves the culled area or the
   * transform is unavailable.
   */
  private scheduleViewUpdate(): void {
    this.requestFrame();
  }

  /** Coalesces pointer-driven updates into one frame; these follow the pointer, so no animation. */
  private scheduleRender(): void {
    this.needsFullRender = true;
    this.requestFrame();
  }

  private requestFrame(): void {
    if (this.pendingFrame !== null) {
      return;
    }
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      const isFull = this.needsFullRender;
      this.needsFullRender = false;
      if (isFull || !this.applyViewTransform()) {
        this.renderNow(false);
      }
    });
  }

  private applyViewTransform(): boolean {
    const width = this.chart.getWidth();
    const height = this.chart.getHeight();
    const drawn = calcViewBounds(this.renderedViewport, width, height, CULL_MARGIN_RATIO);
    if (!isBoundsInside(calcViewBounds(this.viewport, width, height), drawn)) {
      return false;
    }
    const gridStep = this.getTheme().grid.size * this.renderedViewport.scale;
    return this.viewTransformer.apply(this.renderedViewport, this.viewport, gridStep);
  }

  /** Wheel zoom has no end event, so redraw sharply once the wheel has been still for a moment. */
  private scheduleSettledRender(): void {
    const WHEEL_SETTLE_DELAY = 150;
    if (this.settleTimer !== null) {
      window.clearTimeout(this.settleTimer);
    }
    this.settleTimer = window.setTimeout(() => {
      this.settleTimer = null;
      this.renderNow(false);
    }, WHEEL_SETTLE_DELAY);
  }

  private getScreenPoint(event: { clientX: number; clientY: number }): Point {
    const rect = this.container.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private setHoveredNode(nodeId: string | null): void {
    // Hover only matters while idle or while picking an edge's target; skipping it
    // during a pan keeps pan frames on the fast path.
    const isPickingTarget = this.interaction?.type === 'connect' || this.interaction?.type === 'reconnect';
    if (this.hoveredNodeId === nodeId || (this.interaction && !isPickingTarget)) {
      return;
    }
    this.hoveredNodeId = nodeId;
    this.scheduleRender();
  }

  private prepareContainer(): void {
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    // Keyboard shortcuts need the container to be focusable.
    if (!this.container.hasAttribute('tabindex')) {
      this.container.tabIndex = 0;
    }
  }

  private bindEvents(): void {
    this.chart.on('mousedown', this.handleElementMouseDown);
    this.chart.on('mouseover', this.handleElementMouseOver);
    this.chart.on('mouseout', this.handleElementMouseOut);
    this.chart.on('dblclick', this.handleElementDoubleClick);
    this.chart.getZr().on('mousedown', this.handleBlankMouseDown);
    this.chart.getZr().on('globalout', this.handlePointerLeave);
    this.container.addEventListener('wheel', this.handleWheel, { passive: false });
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.stopWatchingPixelRatio = watchDevicePixelRatio(this.chart);
  }

  private unbindEvents(): void {
    this.chart.off('mousedown', this.handleElementMouseDown);
    this.chart.off('mouseover', this.handleElementMouseOver);
    this.chart.off('mouseout', this.handleElementMouseOut);
    this.chart.off('dblclick', this.handleElementDoubleClick);
    this.chart.getZr().off('mousedown', this.handleBlankMouseDown);
    this.chart.getZr().off('globalout', this.handlePointerLeave);
    this.container.removeEventListener('wheel', this.handleWheel);
    this.container.removeEventListener('keydown', this.handleKeyDown);
    this.stopWatchingPixelRatio();
  }

  private startInteraction(interaction: Interaction): void {
    this.cancelInteraction();
    this.interaction = interaction;
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private cancelInteraction(): void {
    this.interaction = null;
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
  }

  private focusContainer(): void {
    this.container.focus({ preventScroll: true });
  }

  private readonly handleElementMouseDown = (params: ECElementEvent): void => {
    const info = readHitInfo(params);
    const nativeEvent = readNativeEvent(params);
    if (!info || !nativeEvent || nativeEvent.button !== 0) {
      return;
    }
    this.focusContainer();
    const screen = this.getScreenPoint(nativeEvent);
    const isAdditive = this.editOptions.canMultiSelect && (nativeEvent.shiftKey || nativeEvent.metaKey || nativeEvent.ctrlKey);

    if (info.role === 'port' && isEditAllowed(this.editOptions, 'canConnect')) {
      this.startInteraction({ type: 'connect', sourceId: info.nodeId, cursor: toWorld(this.viewport, screen) });
      this.render();
      return;
    }
    if (info.role === 'edge-end') {
      this.startReconnect(info.edgeId, info.end, screen);
      return;
    }
    if (info.role === 'edge') {
      if (this.editOptions.canSelect) {
        const edgeIds = isAdditive ? toggleId(this.selection.edgeIds, info.edgeId) : [info.edgeId];
        this.setSelection({ nodeIds: isAdditive ? this.selection.nodeIds : [], edgeIds });
      }
      return;
    }
    // Lane headers and the title behave like empty canvas.
    if (info.role === 'lane' || info.role === 'title') {
      this.pressBlank(screen, nativeEvent.shiftKey);
      return;
    }
    this.pressNode(info.nodeId, screen, isAdditive);
  };

  private startReconnect(edgeId: string, end: EdgeEnd, screen: Point): void {
    const edge = this.graph.edges.find((item) => item.id === edgeId);
    if (!edge || !isEditAllowed(this.editOptions, 'canReconnect')) {
      return;
    }
    this.startInteraction({
      type: 'reconnect',
      edgeId,
      end,
      fixedNodeId: end === 'source' ? edge.target : edge.source,
      cursor: toWorld(this.viewport, screen),
      graph: { ...this.graph, edges: this.graph.edges.filter((item) => item.id !== edgeId) },
    });
    this.render();
  }

  /**
   * Dragging empty canvas pans or draws a selection box, per `blankDragAction`;
   * Shift switches to the other one. A Shift box adds to the selection.
   */
  private pressBlank(screen: Point, isShift: boolean): void {
    const { canSelect, canMultiSelect, canBoxSelect, canPan, blankDragAction } = this.editOptions;
    const isKeepingSelection = isShift && canMultiSelect;
    if (!isKeepingSelection && canSelect) {
      this.setSelection({ nodeIds: [], edgeIds: [] });
    }
    const wantsBoxSelect = (blankDragAction === 'boxSelect') !== isShift;
    if (wantsBoxSelect && canBoxSelect && canSelect) {
      const start = toWorld(this.viewport, screen);
      const base = isKeepingSelection ? this.selection : { nodeIds: [], edgeIds: [] };
      this.startInteraction({ type: 'box-select', start, current: start, base });
      return;
    }
    if (canPan) {
      this.startInteraction({ type: 'pan', lastScreen: screen });
    }
  }

  /** Selects the pressed node and arms a drag of every selected, unlocked node. */
  private pressNode(nodeId: string, screen: Point, isAdditive: boolean): void {
    if (this.editOptions.canSelect) {
      const isSelected = this.selection.nodeIds.includes(nodeId);
      if (isAdditive) {
        this.setSelection({ ...this.selection, nodeIds: toggleId(this.selection.nodeIds, nodeId) });
      } else if (!isSelected) {
        this.setSelection({ nodeIds: [nodeId], edgeIds: [] });
      }
    }
    if (!isEditAllowed(this.editOptions, 'canMoveNodes')) {
      return;
    }
    // Without selection, a press still drags the pressed node on its own.
    const dragIds = new Set(this.editOptions.canSelect ? this.selection.nodeIds : [nodeId]);
    if (!dragIds.has(nodeId)) {
      return;
    }
    const origins = new Map<string, Point>();
    this.graph.nodes
      .filter((node) => dragIds.has(node.id) && !node.isLocked)
      .forEach((node) => origins.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 }));
    if (origins.size > 0) {
      this.startInteraction({ type: 'drag-node', startScreen: screen, origins, before: this.graph, hasMoved: false, guides: [] });
    }
  }

  private readonly handleBlankMouseDown = (event: ElementEvent): void => {
    const nativeEvent = event.event as unknown as MouseEvent;
    // Element hits are handled by the chart-level handler.
    if (event.target || nativeEvent.button !== 0) {
      return;
    }
    this.focusContainer();
    this.pressBlank(this.getScreenPoint(nativeEvent), nativeEvent.shiftKey);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const interaction = this.interaction;
    if (!interaction) {
      return;
    }
    const screen = this.getScreenPoint(event);
    if (interaction.type === 'pan') {
      this.viewport = panBy(this.viewport, screen.x - interaction.lastScreen.x, screen.y - interaction.lastScreen.y);
      interaction.lastScreen = screen;
      this.scheduleViewUpdate();
      return;
    }
    if (interaction.type === 'connect' || interaction.type === 'reconnect') {
      interaction.cursor = toWorld(this.viewport, screen);
    } else if (interaction.type === 'box-select') {
      interaction.current = toWorld(this.viewport, screen);
      const rect = calcRectFromPoints(interaction.start, interaction.current);
      this.setSelectionSilently(mergeSelections(interaction.base, selectInRect(this.renderedNodes, this.graph.edges, rect)));
    } else {
      this.dragNodes(interaction, screen);
    }
    this.scheduleRender();
  };

  private dragNodes(interaction: DragNodeInteraction, screen: Point): void {
    const dx = screen.x - interaction.startScreen.x;
    const dy = screen.y - interaction.startScreen.y;
    if (!interaction.hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }
    interaction.hasMoved = true;
    const worldDx = dx / this.viewport.scale;
    const worldDy = dy / this.viewport.scale;
    const alignment = this.calcDragAlignment(interaction, worldDx, worldDy);
    interaction.guides = alignment?.guides ?? [];
    const positions = new Map<string, Point>();
    interaction.origins.forEach((origin, nodeId) => {
      const snapped = this.snapPoint({ x: origin.x + worldDx, y: origin.y + worldDy });
      // An alignment snap wins over the grid on its axis.
      positions.set(nodeId, {
        x: alignment?.dx != null ? origin.x + worldDx + alignment.dx : snapped.x,
        y: alignment?.dy != null ? origin.y + worldDy + alignment.dy : snapped.y,
      });
    });
    // Positions update live; history is recorded once on release.
    this.graph = setNodePositions(this.graph, positions);
  }

  /** Lines up the box around the dragged nodes with the nodes that stay put. */
  private calcDragAlignment(interaction: DragNodeInteraction, worldDx: number, worldDy: number) {
    if (!this.editOptions.shouldShowAlignGuides) {
      return null;
    }
    const moving: ResolvedNode[] = [];
    const others: Bounds[] = [];
    this.renderedNodes.forEach((node) => {
      const origin = interaction.origins.get(node.id);
      if (origin) {
        moving.push({ ...node, x: origin.x + worldDx, y: origin.y + worldDy });
      } else {
        others.push(calcNodesBounds([node]) as Bounds);
      }
    });
    const movingBounds = calcNodesBounds(moving);
    if (!movingBounds || others.length === 0) {
      return null;
    }
    return calcAlignment(movingBounds, others, this.editOptions.alignThreshold / this.viewport.scale);
  }

  private readonly handlePointerUp = (): void => {
    const interaction = this.interaction;
    this.cancelInteraction();
    if (interaction?.type === 'drag-node' && interaction.hasMoved) {
      if (isEditAllowed(this.editOptions, 'canChangeLane')) {
        this.graph = this.assignDroppedLanes(Array.from(interaction.origins.keys()));
      }
      this.history.record(interaction.before);
      this.options.onChange?.(this.graph);
    }
    if (interaction?.type === 'connect' && this.hoveredNodeId) {
      this.connect(interaction.sourceId, this.hoveredNodeId);
    }
    if (interaction?.type === 'reconnect' && this.hoveredNodeId) {
      this.reconnectEdge(interaction.edgeId, interaction.end, this.hoveredNodeId);
    }
    this.render();
  };

  /** Dropping a node into another lane's band moves it into that lane. */
  private assignDroppedLanes(nodeIds: string[]): FlowGraph {
    if (this.renderedLanes.lanes.length === 0) {
      return this.graph;
    }
    const droppedIds = new Set(nodeIds);
    const laneIds = new Map<string, string>();
    this.graph.nodes
      .filter((node) => droppedIds.has(node.id))
      .forEach((node) => {
        const lane = findLaneAt(this.renderedLanes, { x: node.x ?? 0, y: node.y ?? 0 });
        if (lane) {
          laneIds.set(node.id, lane.id);
        }
      });
    return setNodeLanes(this.graph, laneIds);
  }

  private readonly handleElementMouseOver = (params: ECElementEvent): void => {
    const info = readHitInfo(params);
    if (info && (info.role === 'node' || info.role === 'port')) {
      this.setHoveredNode(info.nodeId);
    }
  };

  private readonly handleElementMouseOut = (params: ECElementEvent): void => {
    const info = readHitInfo(params);
    if (info && (info.role === 'node' || info.role === 'port') && info.nodeId === this.hoveredNodeId) {
      this.setHoveredNode(null);
    }
  };

  /** Element mouseout does not fire when the pointer leaves the chart straight from a node. */
  private readonly handlePointerLeave = (): void => {
    this.setHoveredNode(null);
  };

  private readonly handleElementDoubleClick = (params: ECElementEvent): void => {
    const info = readHitInfo(params);
    if (!isEditAllowed(this.editOptions, 'canEditLabels') || !info) {
      return;
    }
    if (info.role === 'edge' || info.role === 'edge-end') {
      const isLocked = this.graph.edges.some((edge) => edge.id === info.edgeId && edge.isLocked);
      if (!isLocked) {
        this.editEdgeLabel(info.edgeId);
      }
    } else if (info.role === 'lane') {
      this.editLaneLabel(info.laneId);
    } else if (info.role === 'title') {
      this.editTitle();
    } else {
      const isLocked = this.graph.nodes.some((node) => node.id === info.nodeId && node.isLocked);
      if (!isLocked) {
        this.editNodeLabel(info.nodeId);
      }
    }
  };

  private editLaneLabel(laneId: string): void {
    const lane = this.renderedLanes.lanes.find((item) => item.id === laneId);
    if (!lane) {
      return;
    }
    const { header } = lane;
    this.labelInput.open({
      value: lane.label,
      center: toScreen(this.viewport, { x: header.x + header.width / 2, y: header.y + header.height / 2 }),
      width: LANE_INPUT_WIDTH,
      onCommit: (value) => {
        if (value && value !== lane.label) {
          this.updateLane(laneId, { label: value });
        }
      },
    });
  }

  private editTitle(): void {
    const { title } = this.renderedLanes;
    if (!title) {
      return;
    }
    this.labelInput.open({
      value: title.text,
      center: toScreen(this.viewport, { x: title.x + title.width / 2, y: title.y + title.height / 2 }),
      width: Math.max(title.width * this.viewport.scale / 2, LANE_INPUT_WIDTH),
      // Clearing the title removes the title bar.
      onCommit: (value) => {
        if (value !== title.text) {
          this.setTitle(value || undefined);
        }
      },
    });
  }

  private editNodeLabel(nodeId: string): void {
    const node = this.renderedNodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }
    this.labelInput.open({
      value: node.label,
      center: toScreen(this.viewport, node),
      width: node.width * this.viewport.scale,
      onCommit: (value) => {
        // An empty node label is almost always a mistake, so keep the old one.
        if (value && value !== node.label) {
          this.updateNode(nodeId, { label: value });
        }
      },
    });
  }

  private editEdgeLabel(edgeId: string): void {
    const EDGE_INPUT_WIDTH = 100;
    const edge = this.renderedEdges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }
    this.labelInput.open({
      value: edge.label ?? '',
      center: toScreen(this.viewport, edge.labelPosition),
      width: EDGE_INPUT_WIDTH,
      onCommit: (value) => {
        // Clearing an edge label is valid and removes it.
        if (value !== (edge.label ?? '')) {
          this.updateEdge(edgeId, { label: value || undefined });
        }
      },
    });
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    // Without wheel zoom, let the page scroll normally.
    if (!this.editOptions.canZoom) {
      return;
    }
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * this.editOptions.wheelZoomSpeed);
    this.viewport = zoomAt(this.viewport, this.getScreenPoint(event), factor, this.getZoomLimits());
    this.scheduleViewUpdate();
    this.scheduleSettledRender();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const command = resolveShortcut(event);
    if (!command || this.labelInput.isOpen || !this.editOptions.hasKeyboardShortcuts) {
      return;
    }
    event.preventDefault();
    this.runCommand(command, event.shiftKey);
  };

  private runCommand(command: EditorCommand, isShift: boolean): void {
    if (command === 'cancel') {
      this.cancelInteraction();
      this.setSelectionSilently({ nodeIds: [], edgeIds: [] });
      this.render();
      return;
    }
    if (command === 'delete') {
      if (isEditAllowed(this.editOptions, 'canDelete')) {
        this.deleteSelection();
      }
      return;
    }
    if (isNudgeCommand(command)) {
      this.nudgeSelection(NUDGE_DIRECTIONS[command], isShift);
      return;
    }
    if (command === 'select-all') {
      if (this.editOptions.canSelect && this.editOptions.canMultiSelect) {
        this.selectAll();
      }
      return;
    }
    if (command === 'copy' || command === 'cut' || command === 'paste' || command === 'duplicate') {
      this.runClipboardCommand(command);
      return;
    }
    if (!isEditAllowed(this.editOptions, 'canUndo')) {
      return;
    }
    if (command === 'undo') {
      this.undo();
    } else {
      this.redo();
    }
  }

  /** One arrow press moves one grid step, or one pixel with snapping off; Shift moves ten. */
  private nudgeSelection(direction: Point, isLarge: boolean): void {
    if (!isEditAllowed(this.editOptions, 'canMoveNodes')) {
      return;
    }
    const { shouldSnapToGrid, gridSize } = this.editOptions;
    const step = (shouldSnapToGrid ? gridSize : 1) * (isLarge ? NUDGE_LARGE_FACTOR : 1);
    this.moveSelection(direction.x * step, direction.y * step);
  }

  /** Copying only reads the graph, so it works on a read-only canvas too. */
  private runClipboardCommand(command: 'copy' | 'cut' | 'paste' | 'duplicate'): void {
    if (command === 'copy') {
      if (this.editOptions.canCopyPaste) {
        this.copySelection();
      }
      return;
    }
    if (!isEditAllowed(this.editOptions, 'canCopyPaste')) {
      return;
    }
    if (command === 'cut') {
      if (isEditAllowed(this.editOptions, 'canDelete')) {
        this.cutSelection();
      }
    } else if (command === 'paste') {
      this.paste();
    } else {
      this.duplicateSelection();
    }
  }
}
