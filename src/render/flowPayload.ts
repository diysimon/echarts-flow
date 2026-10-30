import type { PortSide, ResolvedEdge, ResolvedNode, Viewport } from '../types';
import type { FlowTheme } from '../theme/flowTheme';
import type { LaneBox, TitleBox } from '../layout/laneLayout';

export const FLOW_NODE_SERIES_TYPE = 'flowNode';
export const FLOW_EDGE_SERIES_TYPE = 'flowEdge';
export const FLOW_LANE_SERIES_TYPE = 'flowLane';
export const FLOW_GRID_SERIES_TYPE = 'flowGrid';
export const FLOW_NODE_SERIES_ID = 'echarts-flow-node';
export const FLOW_EDGE_SERIES_ID = 'echarts-flow-edge';
export const FLOW_LANE_SERIES_ID = 'echarts-flow-lane';
export const FLOW_GRID_SERIES_ID = 'echarts-flow-grid';
export const DRAFT_EDGE_ID = '__echarts_flow_draft__';

export interface FlowNodePayload {
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

export interface FlowEdgePayload {
  edges: RenderedEdge[];
  viewport: Viewport;
  selectedIds: string[];
  theme: FlowTheme;
}

export interface FlowLanePayload {
  lanes: LaneBox[];
  /** Rendered as the data item after the last lane. */
  title: TitleBox | null;
  viewport: Viewport;
  theme: FlowTheme;
}

export interface FlowGridPayload {
  viewport: Viewport;
  theme: FlowTheme;
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
  | { role: 'title' };

const HIT_ROLES = new Set(['node', 'port', 'edge', 'lane', 'title']);

export function isFlowHitInfo(value: unknown): value is FlowHitInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return HIT_ROLES.has((value as { role?: string }).role ?? '');
}
