import type { EdgeRoute, EdgeRouting, FlowDirection, Point, PortSide, ResolvedNode } from '../types';
import { calcBezierPoint } from './edgePath';
import { getPortPosition, PORT_SIDES } from './nodeShape';

/** Minimum clearance between two nodes for a forward connection. */
const MIN_GAP = 20;
/** Distance a back edge keeps from the outermost node edge. */
const DETOUR_GAP = 30;
/** Curves bulge at least this far out of their ports. */
const MIN_CURVE_HANDLE = 30;
/** Back-edge curves overshoot the detour line a little so they clear the nodes. */
const BACK_CURVE_FACTOR = 1.3;
const EPSILON = 0.5;

type Axis = 'x' | 'y';
export type Connection = 'forward' | 'back' | 'side';

export interface PortChoice {
  connection: Connection;
  startSide: PortSide;
  endSide: PortSide;
}

export const SIDE_NORMALS: Record<PortSide, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

function calcGap(from: ResolvedNode, to: ResolvedNode, axis: Axis): number {
  const size = axis === 'y' ? 'height' : 'width';
  return (to[axis] - to[size] / 2) - (from[axis] + from[size] / 2);
}

/**
 * Forward edges follow the flow. Edges against the flow loop around a side
 * only when both nodes share a column (or row in LR); otherwise, as between
 * swimlanes, they connect the facing sides directly.
 */
export function choosePorts(source: ResolvedNode, target: ResolvedNode, direction: FlowDirection): PortChoice {
  const isVertical = direction === 'TB';
  const mainAxis: Axis = isVertical ? 'y' : 'x';
  const crossAxis: Axis = isVertical ? 'x' : 'y';
  if (calcGap(source, target, mainAxis) >= MIN_GAP) {
    return isVertical
      ? { connection: 'forward', startSide: 'bottom', endSide: 'top' }
      : { connection: 'forward', startSide: 'right', endSide: 'left' };
  }
  const isSeparatedAcross = Math.max(calcGap(source, target, crossAxis), calcGap(target, source, crossAxis)) >= MIN_GAP;
  if (calcGap(target, source, mainAxis) >= MIN_GAP && !isSeparatedAcross) {
    const side: PortSide = isVertical ? 'right' : 'bottom';
    return { connection: 'back', startSide: side, endSide: side };
  }
  if (isVertical) {
    const isAfter = target.x >= source.x;
    return { connection: 'side', startSide: isAfter ? 'right' : 'left', endSide: isAfter ? 'left' : 'right' };
  }
  const isAfter = target.y >= source.y;
  return { connection: 'side', startSide: isAfter ? 'bottom' : 'top', endSide: isAfter ? 'top' : 'bottom' };
}

/** Orthogonal connection with one bend line halfway between the endpoints. */
function routeStep(start: Point, end: Point, axis: Axis): Point[] {
  if (axis === 'y') {
    const midY = (start.y + end.y) / 2;
    return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
  }
  const midX = (start.x + end.x) / 2;
  return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
}

/** Coordinate of the detour line that clears both endpoints and every obstacle in between. */
function calcDetourCoordinate(source: ResolvedNode, target: ResolvedNode, side: PortSide, obstacles: ResolvedNode[]): number {
  const isRight = side === 'right';
  const along: Axis = isRight ? 'y' : 'x';
  const alongSize = isRight ? 'height' : 'width';
  const acrossAxis: Axis = isRight ? 'x' : 'y';
  const acrossSize = isRight ? 'width' : 'height';
  const spanStart = Math.min(source[along] - source[alongSize] / 2, target[along] - target[alongSize] / 2);
  const spanEnd = Math.max(source[along] + source[alongSize] / 2, target[along] + target[alongSize] / 2);
  const blockers = [
    source,
    target,
    ...obstacles.filter((node) => node[along] + node[alongSize] / 2 > spanStart && node[along] - node[alongSize] / 2 < spanEnd),
  ];
  return Math.max(...blockers.map((node) => node[acrossAxis] + node[acrossSize] / 2)) + DETOUR_GAP;
}

function routeDetour(start: Point, end: Point, side: PortSide, detour: number): Point[] {
  if (side === 'right') {
    return [start, { x: detour, y: start.y }, { x: detour, y: end.y }, end];
  }
  return [start, { x: start.x, y: detour }, { x: end.x, y: detour }, end];
}

function isSamePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function isCollinear(a: Point, b: Point, c: Point): boolean {
  const isVertical = Math.abs(a.x - b.x) < EPSILON && Math.abs(b.x - c.x) < EPSILON;
  const isHorizontal = Math.abs(a.y - b.y) < EPSILON && Math.abs(b.y - c.y) < EPSILON;
  return isVertical || isHorizontal;
}

/** Drops duplicate points and middle points of straight runs. */
export function simplifyPoints(points: Point[]): Point[] {
  const deduped = points.filter((point, index) => index === 0 || !isSamePoint(point, points[index - 1]));
  return deduped.filter((point, index) => {
    if (index === 0 || index === deduped.length - 1) {
      return true;
    }
    return !isCollinear(deduped[index - 1], point, deduped[index + 1]);
  });
}

function calcDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Point halfway along the polyline, measured by length. */
export function calcPolylineMidpoint(points: Point[]): Point {
  const segmentLengths = points.slice(1).map((point, index) => calcDistance(points[index], point));
  const halfLength = segmentLengths.reduce((sum, length) => sum + length, 0) / 2;
  let walked = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const length = segmentLengths[i];
    if (walked + length >= halfLength && length > 0) {
      const ratio = (halfLength - walked) / length;
      const from = points[i];
      const to = points[i + 1];
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    walked += length;
  }
  return points[0];
}

function movePoint(point: Point, side: PortSide, distance: number): Point {
  const normal = SIDE_NORMALS[side];
  return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

function buildPolylineRoute(points: Point[]): EdgeRoute {
  const simplified = simplifyPoints(points);
  return { points: simplified, isCurve: false, labelPosition: calcPolylineMidpoint(simplified) };
}

function buildCurveRoute(start: Point, startHandle: Point, endHandle: Point, end: Point): EdgeRoute {
  const points = [start, startHandle, endHandle, end];
  return { points, isCurve: true, labelPosition: calcBezierPoint(points, 0.5) };
}

/** Straight back edges go directly against the flow instead of looping around. */
function chooseStraightPorts(choice: PortChoice, direction: FlowDirection): PortChoice {
  if (choice.connection !== 'back') {
    return choice;
  }
  return direction === 'TB'
    ? { ...choice, startSide: 'top', endSide: 'bottom' }
    : { ...choice, startSide: 'left', endSide: 'right' };
}

/**
 * Routes an edge between two nodes. `obstacles` are other nodes that back
 * edges must loop around.
 */
export function calcEdgeRoute(
  source: ResolvedNode,
  target: ResolvedNode,
  direction: FlowDirection = 'TB',
  obstacles: ResolvedNode[] = [],
  routing: EdgeRouting = 'orthogonal',
): EdgeRoute {
  const choice = routing === 'straight' ? chooseStraightPorts(choosePorts(source, target, direction), direction) : choosePorts(source, target, direction);
  const start = getPortPosition(source, choice.startSide);
  const end = getPortPosition(target, choice.endSide);

  if (routing === 'straight') {
    return buildPolylineRoute([start, end]);
  }
  if (choice.connection === 'back') {
    const detour = calcDetourCoordinate(source, target, choice.startSide, obstacles);
    if (routing === 'orthogonal') {
      return buildPolylineRoute(routeDetour(start, end, choice.startSide, detour));
    }
    const startAcross = choice.startSide === 'right' ? start.x : start.y;
    const endAcross = choice.startSide === 'right' ? end.x : end.y;
    const handle = (detour - Math.min(startAcross, endAcross)) * BACK_CURVE_FACTOR;
    return buildCurveRoute(start, movePoint(start, choice.startSide, handle), movePoint(end, choice.endSide, handle), end);
  }
  const axis: Axis = choice.startSide === 'top' || choice.startSide === 'bottom' ? 'y' : 'x';
  if (routing === 'orthogonal') {
    return buildPolylineRoute(routeStep(start, end, axis));
  }
  const handle = Math.max(Math.abs(end[axis] - start[axis]) / 2, MIN_CURVE_HANDLE);
  return buildCurveRoute(start, movePoint(start, choice.startSide, handle), movePoint(end, choice.endSide, handle), end);
}

/** Straight line from the port closest to the cursor, used while connecting. */
export function calcDraftRoute(source: ResolvedNode, cursor: Point): Point[] {
  const nearestSide = PORT_SIDES.reduce((best, side) => {
    const isCloser = calcDistance(getPortPosition(source, side), cursor) < calcDistance(getPortPosition(source, best), cursor);
    return isCloser ? side : best;
  });
  return [getPortPosition(source, nearestSide), cursor];
}
