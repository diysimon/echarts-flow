import type { Point, PortSide } from '../types';
import { SIDE_NORMALS, simplifyPoints } from './edgeRoute';

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Axis-aligned segment, normalized so that a <= b along its axis. */
export interface Segment {
  isHorizontal: boolean;
  /** y for horizontal segments, x for vertical ones. */
  at: number;
  a: number;
  b: number;
}

export interface RouteRequest {
  start: Point;
  startSide: PortSide;
  end: Point;
  endSide: PortSide;
  sourceBox: Box;
  targetBox: Box;
  /** Straight run out of each port, so arrowheads sit on a clean segment. */
  stubLength: number;
}

export interface RouterContext {
  obstacles: Box[];
  /** Preferred vertical lines (x), such as just inside lane borders. */
  channelsX: number[];
  /** Preferred horizontal lines (y). */
  channelsY: number[];
  /** Segments of edges routed earlier; overlapping them is penalized. */
  occupied: Segment[];
  /** Routes are kept inside this box when set, e.g. the lane table. */
  bounds: Box | null;
}

const COST = {
  bend: 24,
  /** Running through a node is almost never acceptable. */
  nodeHit: 10000,
  /** Per pixel of a segment lying on top of an earlier edge. */
  overlap: 6,
  crossing: 12,
  /** Per pixel outside the bounds. */
  outside: 4,
};
/** Clearance kept between a route and the nodes it passes. */
const NODE_MARGIN = 16;
/** Spacing between parallel edges sharing a channel. */
const TRACK_SPACING = 8;
const TRACK_OFFSETS = [0, TRACK_SPACING, -TRACK_SPACING, TRACK_SPACING * 2, -TRACK_SPACING * 2, TRACK_SPACING * 3, -TRACK_SPACING * 3];
/** Two parallel segments closer than this count as overlapping. */
const OVERLAP_TOLERANCE = 3;
/** Nodes farther than this from the edge's bounding box don't add candidate channels. */
const NEARBY_DISTANCE = 240;

export function toSegments(points: Point[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const isHorizontal = Math.abs(from.y - to.y) < Math.abs(from.x - to.x);
    segments.push(isHorizontal
      ? { isHorizontal, at: from.y, a: Math.min(from.x, to.x), b: Math.max(from.x, to.x) }
      : { isHorizontal, at: from.x, a: Math.min(from.y, to.y), b: Math.max(from.y, to.y) });
  }
  return segments;
}

/** Whether a segment passes through the inside of a box (touching its border is fine). */
export function isSegmentHittingBox(segment: Segment, box: Box): boolean {
  const INSET = 1;
  const [acrossMin, acrossMax, alongMin, alongMax] = segment.isHorizontal
    ? [box.minY, box.maxY, box.minX, box.maxX]
    : [box.minX, box.maxX, box.minY, box.maxY];
  const isAcrossInside = segment.at > acrossMin + INSET && segment.at < acrossMax - INSET;
  return isAcrossInside && segment.b > alongMin + INSET && segment.a < alongMax - INSET;
}

function calcOverlapLength(segment: Segment, other: Segment): number {
  if (segment.isHorizontal !== other.isHorizontal || Math.abs(segment.at - other.at) > OVERLAP_TOLERANCE) {
    return 0;
  }
  return Math.max(0, Math.min(segment.b, other.b) - Math.max(segment.a, other.a));
}

function isCrossing(segment: Segment, other: Segment): boolean {
  if (segment.isHorizontal === other.isHorizontal) {
    return false;
  }
  return other.at > segment.a && other.at < segment.b && segment.at > other.a && segment.at < other.b;
}

function calcOutsideLength(segment: Segment, bounds: Box): number {
  const [acrossMin, acrossMax, alongMin, alongMax] = segment.isHorizontal
    ? [bounds.minY, bounds.maxY, bounds.minX, bounds.maxX]
    : [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY];
  const length = segment.b - segment.a;
  if (segment.at < acrossMin || segment.at > acrossMax) {
    return Math.max(length, 1);
  }
  return Math.max(0, alongMin - segment.a) + Math.max(0, segment.b - alongMax);
}

function calcRouteCost(points: Point[], request: RouteRequest, context: RouterContext): number {
  // Score the raw path: simplifying first would merge a run that doubles back
  // through the target into its entry stub and hide the hit.
  const segments = toSegments(points).filter((segment) => segment.b - segment.a > 0);
  let cost = (simplifyPoints(points).length - 2) * COST.bend;
  segments.forEach((segment, index) => {
    cost += segment.b - segment.a;
    // The first and last segments leave and enter the own nodes, possibly from inset ports.
    if (index > 0 && isSegmentHittingBox(segment, request.sourceBox)) {
      cost += COST.nodeHit;
    }
    if (index < segments.length - 1 && isSegmentHittingBox(segment, request.targetBox)) {
      cost += COST.nodeHit;
    }
    context.obstacles.forEach((box) => {
      if (isSegmentHittingBox(segment, box)) {
        cost += COST.nodeHit;
      }
    });
    context.occupied.forEach((other) => {
      cost += calcOverlapLength(segment, other) * COST.overlap;
      if (isCrossing(segment, other)) {
        cost += COST.crossing;
      }
    });
    if (context.bounds) {
      cost += calcOutsideLength(segment, context.bounds) * COST.outside;
    }
  });
  return cost;
}

function moveOut(point: Point, side: PortSide, distance: number): Point {
  const normal = SIDE_NORMALS[side];
  return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

function expandBox(box: Box, margin: number): Box {
  return { minX: box.minX - margin, minY: box.minY - margin, maxX: box.maxX + margin, maxY: box.maxY + margin };
}

function isBoxOverlapping(a: Box, b: Box): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function isSegmentInBox(segment: Segment, box: Box): boolean {
  const [acrossMin, acrossMax, alongMin, alongMax] = segment.isHorizontal
    ? [box.minY, box.maxY, box.minX, box.maxX]
    : [box.minX, box.maxX, box.minY, box.maxY];
  return segment.at >= acrossMin && segment.at <= acrossMax && segment.b >= alongMin && segment.a <= alongMax;
}

function unique(values: number[]): number[] {
  return Array.from(new Set(values.map((value) => Math.round(value))));
}

type Family = 'vertical-channel' | 'horizontal-channel';

/**
 * Finds a tidy orthogonal route: leave each port with a short stub, then
 * connect the stubs through one vertical channel (x) or one horizontal
 * channel (y). Candidate channels come from the endpoints, the gaps beside
 * nearby nodes and the preferred channels; the cheapest route wins, then
 * its channel is nudged onto a free parallel track.
 */
export function routeOrthogonal(request: RouteRequest, context: RouterContext): Point[] {
  const { start, end, stubLength } = request;
  const startStub = moveOut(start, request.startSide, stubLength);
  const endStub = moveOut(end, request.endSide, stubLength);
  const area = expandBox({
    minX: Math.min(startStub.x, endStub.x),
    minY: Math.min(startStub.y, endStub.y),
    maxX: Math.max(startStub.x, endStub.x),
    maxY: Math.max(startStub.y, endStub.y),
  }, NEARBY_DISTANCE);
  const nearby = [...context.obstacles, request.sourceBox, request.targetBox].filter((box) => isBoxOverlapping(box, area));
  const isInArea = (value: number, min: number, max: number) => value >= min && value <= max;
  // Candidate routes stay inside the area, so only nearby obstacles and lines can affect their cost.
  const localContext: RouterContext = {
    ...context,
    obstacles: context.obstacles.filter((box) => isBoxOverlapping(box, area)),
    occupied: context.occupied.filter((segment) => isSegmentInBox(segment, area)),
  };

  const xs = unique([
    startStub.x,
    endStub.x,
    (startStub.x + endStub.x) / 2,
    ...nearby.flatMap((box) => [box.minX - NODE_MARGIN, box.maxX + NODE_MARGIN]),
    ...context.channelsX.filter((x) => isInArea(x, area.minX, area.maxX)),
  ]);
  const ys = unique([
    startStub.y,
    endStub.y,
    (startStub.y + endStub.y) / 2,
    ...nearby.flatMap((box) => [box.minY - NODE_MARGIN, box.maxY + NODE_MARGIN]),
    ...context.channelsY.filter((y) => isInArea(y, area.minY, area.maxY)),
  ]);
  const build = (family: Family, value: number): Point[] => (family === 'vertical-channel'
    ? [start, startStub, { x: value, y: startStub.y }, { x: value, y: endStub.y }, endStub, end]
    : [start, startStub, { x: startStub.x, y: value }, { x: endStub.x, y: value }, endStub, end]);

  let best = { family: 'vertical-channel' as Family, value: xs[0], cost: Infinity };
  const consider = (family: Family, value: number) => {
    const cost = calcRouteCost(build(family, value), request, localContext);
    if (cost < best.cost) {
      best = { family, value, cost };
    }
  };
  xs.forEach((x) => consider('vertical-channel', x));
  ys.forEach((y) => consider('horizontal-channel', y));
  const { family: baseFamily, value: baseValue } = best;
  TRACK_OFFSETS.forEach((offset) => consider(baseFamily, baseValue + offset));
  return simplifyPoints(build(best.family, best.value));
}
