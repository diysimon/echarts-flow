import type { EdgeEnd, Point, PortSide, ResolvedEdge, ResolvedNode, Viewport } from '../types';
import type { FlowTheme } from '../theme/flowTheme';
import type { LaneBox, Rect, TitleBox } from '../layout/laneLayout';

export const FLOW_NODE_SERIES_TYPE = 'flowNode';
export const FLOW_EDGE_SERIES_TYPE = 'flowEdge';
export const FLOW_LANE_SERIES_TYPE = 'flowLane';
export const FLOW_GRID_SERIES_TYPE = 'flowGrid';
export const FLOW_OVERLAY_SERIES_TYPE = 'flowOverlay';
export const FLOW_NODE_SERIES_ID = 'echarts-flow-node';
export const FLOW_EDGE_SERIES_ID = 'echarts-flow-edge';
export const FLOW_LANE_SERIES_ID = 'echarts-flow-lane';
export const FLOW_GRID_SERIES_ID = 'echarts-flow-grid';
export const FLOW_OVERLAY_SERIES_ID = 'echarts-flow-overlay';
export const DRAFT_EDGE_ID = '__echarts_flow_draft__';

/** Every payload carries the device pixel ratio, so shapes and text snap to device pixels. */
interface PixelGridPayload {
  /** Device pixels per CSS pixel. Defaults to 1. */
  pixelRatio?: number;
}

interface LabelPayload {
  /** Skip labels whose on-screen font size is below this many pixels. Defaults to 0: always draw. */
  minLabelPixels?: number;
}

export interface FlowNodePayload extends PixelGridPayload, LabelPayload {
  nodes: ResolvedNode[];
  viewport: Viewport;
  selectedIds: string[];
  /** Node whose ports are shown; also the drop target while connecting. */
  hoveredId: string | null;
  isEditable: boolean;
  theme: FlowTheme;
}

export interface RenderedEdge extends ResolvedEdge {
  isDraft: boolean;
  /** Target node is running, so the edge shows a flowing dash. */
  isRunning: boolean;
}

export interface FlowEdgePayload extends PixelGridPayload, LabelPayload {
  edges: RenderedEdge[];
  viewport: Viewport;
  selectedIds: string[];
  theme: FlowTheme;
}

export interface FlowLanePayload extends PixelGridPayload {
  lanes: LaneBox[];
  /** Rendered as the data item after the last lane. */
  title: TitleBox | null;
  viewport: Viewport;
  theme: FlowTheme;
}

export interface FlowGridPayload extends PixelGridPayload {
  viewport: Viewport;
  theme: FlowTheme;
  /**
   * Fill the grid with a repeating tile instead of drawing every dot. Much
   * faster on canvas; the SVG renderer cannot place such a pattern, so it
   * keeps the path.
   */
  shouldUsePattern?: boolean;
}

/**
 * Line shown while dragging when the moving nodes line up with another node.
 * Axis 'x' is a vertical line at x = position from y = start to y = end;
 * axis 'y' is a horizontal one. World coordinates.
 */
export interface AlignGuide {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
}

/** Draggable handle on one end of the selected edge, for reconnecting it. */
export interface EdgeHandle {
  edgeId: string;
  end: EdgeEnd;
  point: Point;
}

/** Editor feedback drawn above everything: selection box, guides, edge handles. */
export interface FlowOverlayPayload extends PixelGridPayload {
  viewport: Viewport;
  theme: FlowTheme;
  /** Box-selection rectangle in world coordinates. */
  selectionBox: Rect | null;
  guides: AlignGuide[];
  edgeHandles: EdgeHandle[];
}

/**
 * Attached to rendered elements via `info` and returned in ECharts event params,
 * so the editor knows what was hit.
 */
export type FlowHitInfo =
  | { role: 'node'; nodeId: string }
  | { role: 'port'; nodeId: string; side: PortSide }
  | { role: 'edge'; edgeId: string }
  | { role: 'lane'; laneId: string }
  | { role: 'title' }
  | { role: 'edge-end'; edgeId: string; end: EdgeEnd };

const HIT_ROLES = new Set(['node', 'port', 'edge', 'lane', 'title', 'edge-end']);

export function isFlowHitInfo(value: unknown): value is FlowHitInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return HIT_ROLES.has((value as { role?: string }).role ?? '');
}
