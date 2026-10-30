export type FlowNodeShape =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'io'
  | 'circle'
  | 'hexagon'
  | 'document'
  | 'database'
  | 'subprocess'
  | 'text';

export type FlowStatus = 'pending' | 'running' | 'done' | 'error';

/** TB lays lanes out as columns, LR as rows. */
export type FlowDirection = 'TB' | 'LR';

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export type ArrowType =
  | 'triangle'
  | 'triangle-open'
  | 'vee'
  | 'circle'
  | 'circle-open'
  | 'diamond'
  | 'diamond-open'
  | 'none';

export type EdgeRouting = 'orthogonal' | 'straight' | 'curved';

export type TextOverflow = 'wrap' | 'truncate';

export type FontWeight = 'normal' | 'bold' | number;

export interface Point {
  x: number;
  y: number;
}

/** Per-node overrides; unset fields fall back to the lane, then the theme. */
export interface FlowNodeStyle {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[] | null;
  textColor?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  radius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetY?: number;
  opacity?: number;
}

/** Per-edge overrides; unset fields fall back to the theme. */
export interface FlowEdgeStyle {
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[] | null;
  routing?: EdgeRouting;
  cornerRadius?: number;
  sourceArrow?: ArrowType;
  targetArrow?: ArrowType;
  arrowSize?: number;
  labelColor?: string;
  labelBackground?: string;
  labelBorder?: string;
  labelFontSize?: number;
  opacity?: number;
}

export interface FlowLaneStyle {
  fill?: string;
  headerFill?: string;
  headerTextColor?: string;
  borderColor?: string;
}

export interface FlowNode {
  id: string;
  label: string;
  shape: FlowNodeShape;
  /** Center x in world coordinates. Missing coordinates are filled by auto layout. */
  x?: number;
  /** Center y in world coordinates. */
  y?: number;
  width?: number;
  height?: number;
  status?: FlowStatus;
  /** Swimlane this node belongs to. Unknown or missing ids fall into the first lane. */
  laneId?: string;
  style?: FlowNodeStyle;
  /** A locked node cannot be moved, renamed or deleted in the editor. Edges can still attach to it. */
  isLocked?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: FlowEdgeStyle;
  /** A locked edge cannot be renamed or deleted in the editor. */
  isLocked?: boolean;
}

export interface FlowLane {
  id: string;
  label: string;
  /** Thickness across the flow direction. Auto layout fills it in. */
  size?: number;
  style?: FlowLaneStyle;
  /** Default style for nodes in this lane, below each node's own style. */
  nodeStyle?: FlowNodeStyle;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes?: FlowLane[];
  /** Drawn as a header above the lanes. */
  title?: string;
}

/** Fully resolved node appearance, after theme, lane and node styles are merged. */
export interface NodeAppearance {
  fill: string;
  stroke: string;
  lineWidth: number;
  activeLineWidth: number;
  lineDash: number[] | null;
  textColor: string;
  fontSize: number;
  fontWeight: FontWeight;
  lineHeight: number;
  textOverflow: TextOverflow;
  radius: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  opacity: number;
}

/** A node whose position, size and appearance are fully determined. */
export interface ResolvedNode extends FlowNode {
  x: number;
  y: number;
  width: number;
  height: number;
  appearance: NodeAppearance;
  /** Label split into display lines, matching the size used for layout. */
  lines: string[];
}

export interface EdgeRoute {
  /** Polyline points, or [start, control1, control2, end] when `isCurve` is set. */
  points: Point[];
  isCurve: boolean;
  labelPosition: Point;
}

export interface EdgeAppearance {
  stroke: string;
  lineWidth: number;
  activeLineWidth: number;
  lineDash: number[] | null;
  routing: EdgeRouting;
  cornerRadius: number;
  sourceArrow: ArrowType;
  targetArrow: ArrowType;
  arrowSize: number;
  labelColor: string;
  labelBackground: string;
  labelBorder: string;
  labelFontSize: number;
  opacity: number;
}

export interface ResolvedEdge extends FlowEdge, EdgeRoute {
  appearance: EdgeAppearance;
}

/** Maps world coordinates to screen pixels: screen = world * scale + offset. */
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface FlowSelection {
  nodeIds: string[];
  edgeIds: string[];
}

/** Temporary edge drawn while the user drags from a port. */
export interface DraftEdge {
  sourceId: string;
  /** Cursor position in world coordinates. */
  target: Point;
}
