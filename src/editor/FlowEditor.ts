import type { ECElementEvent, EChartsType, ElementEvent } from 'echarts';
import type {
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
import { buildFlowOptionFromScene, buildFlowScene, calcFitViewport } from '../option/buildFlowOption';
import { calcFlowLayout, fillMissingPositions, type FlowLayoutOptions } from '../layout/calcFlowLayout';
import { findLaneAt, type LaneLayout } from '../layout/laneLayout';
import { clampScale, panBy, toScreen, toWorld, zoomAt, type ZoomLimits } from '../geometry/viewport';
import { RouteCache, type EdgeRoutingOptions } from '../geometry/edgeRouter';
import { isFlowHitInfo, type FlowHitInfo } from '../render/flowPayload';
import type { FlowTheme, FlowThemeName } from '../theme/flowTheme';
import { resolveFlowTheme } from '../theme/themeRegistry';
import { FlowHistory } from './flowHistory';
import { LabelInput } from './LabelInput';
import { resolveShortcut, type EditorCommand } from './keyboardShortcuts';
import { addLane, removeLane, setNodeLanes, updateLane } from './laneOps';
import { DEFAULT_EDIT_OPTIONS, isEditAllowed, mergeEditOptions, type FlowEditOptions } from './editOptions';
import {
  addEdge,
  addNode,
  canConnect,
  collectElementIds,
  createUniqueId,
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

type Interaction =
  | { type: 'drag-node'; startScreen: Point; origins: Map<string, Point>; before: FlowGraph; hasMoved: boolean }
  | { type: 'pan'; lastScreen: Point }
  | { type: 'connect'; sourceId: string; cursor: Point };

/** Pointer travel in pixels before a press on a node becomes a drag. */
const DRAG_THRESHOLD = 3;
const ZOOM_BUTTON_FACTOR = 1.2;
/** Offset applied when a new node would land on top of an existing one. */
const STACK_OFFSET = 30;
const MAX_STACK_ATTEMPTS = 20;
const LANE_INPUT_WIDTH = 140;
/** Graphs larger than this use simple edge routing while nodes are dragged. */
const DRAG_SMART_ROUTING_LIMIT = 60;

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

  dispose(): void {
    this.cancelScheduledRender();
    this.cancelInteraction();
    this.labelInput.close();
    this.unbindEvents();
  }

  private renderNow(isAnimated: boolean): void {
    this.cancelScheduledRender();
    const config = {
      direction: this.direction,
      viewport: this.viewport,
      selection: this.selection,
      hoveredNodeId: this.hoveredNodeId,
      draftEdge: this.interaction?.type === 'connect'
        ? { sourceId: this.interaction.sourceId, target: this.interaction.cursor }
        : null,
      // Ports only appear when the user may draw connections.
      isEditable: isEditAllowed(this.editOptions, 'canConnect'),
      animation: isAnimated,
      theme: this.theme,
      layout: this.layout,
      routing: this.getRoutingOptions(),
      routeCache: this.routeCache,
    };
    const scene = buildFlowScene(this.graph, config);
    this.renderedNodes = scene.nodes;
    this.renderedEdges = scene.edges;
    this.renderedLanes = scene.lanes;
    this.chart.setOption(buildFlowOptionFromScene(scene, config));
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

  /** Coalesces pointer-driven updates into one frame; these follow the pointer, so no animation. */
  private scheduleRender(): void {
    if (this.pendingFrame !== null) {
      return;
    }
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.renderNow(false);
    });
  }

  private cancelScheduledRender(): void {
    if (this.pendingFrame !== null) {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }
  }

  private getScreenPoint(event: { clientX: number; clientY: number }): Point {
    const rect = this.container.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private setHoveredNode(nodeId: string | null): void {
    if (this.hoveredNodeId === nodeId) {
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
    if (info.role === 'edge') {
      if (this.editOptions.canSelect) {
        const edgeIds = isAdditive ? toggleId(this.selection.edgeIds, info.edgeId) : [info.edgeId];
        this.setSelection({ nodeIds: isAdditive ? this.selection.nodeIds : [], edgeIds });
      }
      return;
    }
    // Lane headers and the title behave like empty canvas.
    if (info.role === 'lane' || info.role === 'title') {
      this.pressBlank(screen, isAdditive);
      return;
    }
    this.pressNode(info.nodeId, screen, isAdditive);
  };

  private pressBlank(screen: Point, isAdditive: boolean): void {
    if (!isAdditive && this.editOptions.canSelect) {
      this.setSelection({ nodeIds: [], edgeIds: [] });
    }
    if (this.editOptions.canPan) {
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
      this.startInteraction({ type: 'drag-node', startScreen: screen, origins, before: this.graph, hasMoved: false });
    }
  }

  private readonly handleBlankMouseDown = (event: ElementEvent): void => {
    const nativeEvent = event.event as unknown as MouseEvent;
    // Element hits are handled by the chart-level handler.
    if (event.target || nativeEvent.button !== 0) {
      return;
    }
    this.focusContainer();
    this.pressBlank(this.getScreenPoint(nativeEvent), this.editOptions.canMultiSelect && nativeEvent.shiftKey);
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
    } else if (interaction.type === 'connect') {
      interaction.cursor = toWorld(this.viewport, screen);
    } else {
      this.dragNodes(interaction, screen);
    }
    this.scheduleRender();
  };

  private dragNodes(interaction: Extract<Interaction, { type: 'drag-node' }>, screen: Point): void {
    const dx = screen.x - interaction.startScreen.x;
    const dy = screen.y - interaction.startScreen.y;
    if (!interaction.hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }
    interaction.hasMoved = true;
    const positions = new Map<string, Point>();
    interaction.origins.forEach((origin, nodeId) => {
      const moved = { x: origin.x + dx / this.viewport.scale, y: origin.y + dy / this.viewport.scale };
      positions.set(nodeId, this.snapPoint(moved));
    });
    // Positions update live; history is recorded once on release.
    this.graph = setNodePositions(this.graph, positions);
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
    if (info.role === 'edge') {
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
    this.scheduleRender();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const command = resolveShortcut(event);
    if (!command || this.labelInput.isOpen || !this.editOptions.hasKeyboardShortcuts) {
      return;
    }
    event.preventDefault();
    this.runCommand(command);
  };

  private runCommand(command: EditorCommand): void {
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
    if (!isEditAllowed(this.editOptions, 'canUndo')) {
      return;
    }
    if (command === 'undo') {
      this.undo();
    } else {
      this.redo();
    }
  }
}
