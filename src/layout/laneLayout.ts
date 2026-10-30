import type { FlowDirection, FlowGraph, FlowLane, FlowLaneStyle, FlowNode, Point, ResolvedNode } from '../types';
import type { FlowTheme } from '../theme/flowTheme';
import { pickDefined } from '../style/resolveAppearance';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaneBox extends Rect {
  id: string;
  label: string;
  index: number;
  header: Rect;
  style: Required<FlowLaneStyle>;
  /** Columns in TB, rows in LR; decides header text orientation. */
  isColumn: boolean;
}

export interface TitleBox extends Rect {
  text: string;
}

export interface LaneLayout {
  lanes: LaneBox[];
  title: TitleBox | null;
}

/** A node's lane: its own laneId when valid, otherwise the first lane. */
export function getNodeLaneId(node: FlowNode, lanes: FlowLane[]): string | undefined {
  if (lanes.length === 0) {
    return undefined;
  }
  return lanes.some((lane) => lane.id === node.laneId) ? node.laneId : lanes[0].id;
}

export function calcLaneSize(lane: FlowLane, theme: FlowTheme): number {
  return Math.max(lane.size ?? theme.lane.minSize, theme.lane.headerSize);
}

function resolveLaneStyle(lane: FlowLane, index: number, theme: FlowTheme): Required<FlowLaneStyle> {
  return {
    fill: index % 2 === 0 ? theme.lane.fill : theme.lane.alternateFill,
    headerFill: theme.lane.headerFill,
    headerTextColor: theme.lane.headerTextColor,
    borderColor: theme.lane.borderColor,
    ...pickDefined(lane.style),
  };
}

/** How far the lanes extend along the flow: past the furthest node, and at least one lane deep. */
function calcFlowLength(nodes: ResolvedNode[], direction: FlowDirection, theme: FlowTheme): number {
  const isVertical = direction === 'TB';
  const furthest = Math.max(0, ...nodes.map((node) => (isVertical ? node.y + node.height / 2 : node.x + node.width / 2)));
  return Math.max(furthest + theme.lane.padding, theme.lane.headerSize + theme.lane.minSize);
}

/**
 * Lane rectangles in world space. Lanes start at the origin and stack across
 * the flow: columns left to right in TB, rows top to bottom in LR. The title
 * sits above the lanes.
 */
export function calcLaneLayout(graph: FlowGraph, nodes: ResolvedNode[], theme: FlowTheme, direction: FlowDirection): LaneLayout {
  const lanes = graph.lanes ?? [];
  if (lanes.length === 0) {
    return { lanes: [], title: null };
  }
  const isColumn = direction === 'TB';
  const length = calcFlowLength(nodes, direction, theme);
  const { headerSize } = theme.lane;
  let offset = 0;
  const boxes = lanes.map((lane, index) => {
    const size = calcLaneSize(lane, theme);
    const rect: Rect = isColumn ? { x: offset, y: 0, width: size, height: length } : { x: 0, y: offset, width: length, height: size };
    const header: Rect = isColumn
      ? { x: offset, y: 0, width: size, height: headerSize }
      : { x: 0, y: offset, width: headerSize, height: size };
    offset += size;
    return { ...rect, id: lane.id, label: lane.label, index, header, style: resolveLaneStyle(lane, index, theme), isColumn };
  });
  const totalWidth = isColumn ? offset : length;
  const title = graph.title
    ? { text: graph.title, x: 0, y: -theme.title.height, width: totalWidth, height: theme.title.height }
    : null;
  return { lanes: boxes, title };
}

/** Lane whose band contains the point across the flow; points outside snap to the nearest lane. */
export function findLaneAt(layout: LaneLayout, point: Point): LaneBox | null {
  const { lanes } = layout;
  if (lanes.length === 0) {
    return null;
  }
  const isColumn = lanes[0].isColumn;
  const across = isColumn ? point.x : point.y;
  const hit = lanes.find((lane) => {
    const start = isColumn ? lane.x : lane.y;
    const size = isColumn ? lane.width : lane.height;
    return across >= start && across < start + size;
  });
  if (hit) {
    return hit;
  }
  const firstStart = isColumn ? lanes[0].x : lanes[0].y;
  return across < firstStart ? lanes[0] : lanes[lanes.length - 1];
}
