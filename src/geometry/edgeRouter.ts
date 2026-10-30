import type { EdgeAppearance, EdgeRoute, FlowDirection, FlowEdge, FlowNodeShape, Point, PortSide, ResolvedNode } from '../types';
import type { LaneLayout } from '../layout/laneLayout';
import { calcEdgeRoute, calcPolylineMidpoint, choosePorts, SIDE_NORMALS, type PortChoice } from './edgeRoute';
import { calcSlant, getPortPosition, PORT_SIDES } from './nodeShape';
import { routeOrthogonal, toSegments, type Box, type RouterContext, type Segment } from './orthogonalRouter';

export interface EdgeRoutingOptions {
  /** Route orthogonal edges around nodes and apart from each other. Defaults to true. */
  isSmart?: boolean;
  /** Above this many nodes, fall back to simple routing to keep dragging smooth. Defaults to 150. */
  maxSmartNodes?: number;
  /** Spread several edges on one node side apart instead of sharing one port. Defaults to true. */
  shouldSpreadPorts?: boolean;
}

export interface RoutableEdge {
  edge: FlowEdge;
  source: ResolvedNode;
  target: ResolvedNode;
  appearance: EdgeAppearance;
}

const DEFAULT_MAX_SMART_NODES = 150;
/** Gap between edges that share a node side. */
const PORT_SPACING = 16;
/** Spread ports stay within this share of the side, away from rounded corners. */
const PORT_SPREAD_RATIO = 0.7;
/** Lane borders get channels this far inside each lane. */
const LANE_CHANNEL_INSET = 14;
const MIN_STUB = 16;
const STUB_ARROW_PADDING = 6;
/** Labels sit this far along the route past the stub, close to the source like gateway labels. */
const LABEL_DISTANCE = 28;
/** Obstacles are slightly larger than nodes so routes don't graze their borders. */
const OBSTACLE_PADDING = 6;
const CONNECTION_ORDER: Record<PortChoice['connection'], number> = { forward: 0, side: 1, back: 2 };

const SPREAD_SIDES: Partial<Record<FlowNodeShape, PortSide[]>> = {
  process: ['top', 'right', 'bottom', 'left'],
  subprocess: ['top', 'right', 'bottom', 'left'],
  document: ['top', 'right', 'left'],
  // The cap arc is nearly flat close to the center, so small offsets stay on the outline.
  database: ['top', 'right', 'bottom', 'left'],
  text: ['top', 'right', 'bottom', 'left'],
  start: ['top', 'bottom'],
  end: ['top', 'bottom'],
  io: ['top', 'right', 'bottom', 'left'],
  hexagon: ['top', 'bottom'],
};

interface EdgeEnds {
  item: RoutableEdge;
  choice: PortChoice;
  start: Point;
  end: Point;
}

interface PortSlot {
  endIndex: number;
  isStart: boolean;
  node: ResolvedNode;
  other: ResolvedNode;
}

/** How directly a side faces the other node: 1 straight ahead, -1 straight behind. */
function calcFacingScore(node: ResolvedNode, side: PortSide, other: ResolvedNode): number {
  const normal = SIDE_NORMALS[side];
  const dx = other.x - node.x;
  const dy = other.y - node.y;
  const length = Math.hypot(dx, dy) || 1;
  return (normal.x * dx + normal.y * dy) / length;
}

function getSlotSide(ends: EdgeEnds[], slot: PortSlot): PortSide {
  const { choice } = ends[slot.endIndex];
  return slot.isStart ? choice.startSide : choice.endSide;
}

function setSlotSide(ends: EdgeEnds[], slot: PortSlot, side: PortSide): void {
  const end = ends[slot.endIndex];
  end.choice = slot.isStart ? { ...end.choice, startSide: side } : { ...end.choice, endSide: side };
}

/**
 * Diamonds and circles have a single port point per side, so edges sharing
 * a side would start on top of each other. Keep the edge that side faces
 * best and move the others to free sides facing their other end, the way a
 * decision sends "yes" down and "no" sideways.
 */
function separateSinglePortSides(ends: EdgeEnds[]): void {
  const slotsByNode = new Map<string, PortSlot[]>();
  ends.forEach((end, endIndex) => {
    [
      { endIndex, isStart: true, node: end.item.source, other: end.item.target },
      { endIndex, isStart: false, node: end.item.target, other: end.item.source },
    ].forEach((slot) => slotsByNode.set(slot.node.id, [...(slotsByNode.get(slot.node.id) ?? []), slot]));
  });
  slotsByNode.forEach((slots) => {
    const { node } = slots[0];
    if (SPREAD_SIDES[node.shape]?.length) {
      return;
    }
    const usedSides = new Set(slots.map((slot) => getSlotSide(ends, slot)));
    PORT_SIDES.forEach((side) => {
      const sharing = slots.filter((slot) => getSlotSide(ends, slot) === side);
      if (sharing.length < 2) {
        return;
      }
      sharing.sort((a, b) => calcFacingScore(node, side, b.other) - calcFacingScore(node, side, a.other));
      sharing.slice(1).forEach((slot) => {
        const freeSides = PORT_SIDES.filter((candidate) => !usedSides.has(candidate));
        if (freeSides.length === 0) {
          return;
        }
        const bestSide = freeSides.reduce((best, candidate) => (
          calcFacingScore(node, candidate, slot.other) > calcFacingScore(node, best, slot.other) ? candidate : best
        ));
        // A side facing away would force a loop around the node; sharing the vertex reads better.
        if (calcFacingScore(node, bestSide, slot.other) < 0) {
          return;
        }
        setSlotSide(ends, slot, bestSide);
        usedSides.add(bestSide);
      });
    });
  });
}


function toBox(node: ResolvedNode, padding = 0): Box {
  return {
    minX: node.x - node.width / 2 - padding,
    minY: node.y - node.height / 2 - padding,
    maxX: node.x + node.width / 2 + padding,
    maxY: node.y + node.height / 2 + padding,
  };
}

function isHorizontalSide(side: PortSide): boolean {
  return side === 'top' || side === 'bottom';
}

/**
 * Port positions for every edge end. Ends sharing a node side are spread
 * along it, ordered by where the other end lies, so their lines don't cross
 * right at the node.
 */
function assignPorts(items: { item: RoutableEdge; choice: PortChoice }[], shouldSpread: boolean): EdgeEnds[] {
  const ends: EdgeEnds[] = items.map(({ item, choice }) => ({ item, choice, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }));
  if (shouldSpread) {
    separateSinglePortSides(ends);
  }
  ends.forEach((end) => {
    end.start = getPortPosition(end.item.source, end.choice.startSide);
    end.end = getPortPosition(end.item.target, end.choice.endSide);
  });
  if (!shouldSpread) {
    return ends;
  }
  const groups = new Map<string, PortSlot[]>();
  ends.forEach((end, endIndex) => {
    const slots: PortSlot[] = [
      { endIndex, isStart: true, node: end.item.source, other: end.item.target },
      { endIndex, isStart: false, node: end.item.target, other: end.item.source },
    ];
    slots.forEach((slot) => {
      const key = `${slot.node.id}:${getSlotSide(ends, slot)}`;
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    });
  });
  groups.forEach((slots) => {
    const { node } = slots[0];
    const side = getSlotSide(ends, slots[0]);
    if (slots.length < 2 || !SPREAD_SIDES[node.shape]?.includes(side)) {
      return;
    }
    const isAlongX = isHorizontalSide(side);
    const sideLength = (isAlongX ? node.width : node.height) * PORT_SPREAD_RATIO;
    const spacing = Math.min(PORT_SPACING, sideLength / (slots.length - 1));
    slots.sort((a, b) => (isAlongX ? a.other.x - b.other.x : a.other.y - b.other.y));
    const offsets = slots.map((_, index) => (index - (slots.length - 1) / 2) * spacing);
    // An end facing the other node head-on moves to line up with it, so the edge stays
    // straight instead of taking a small jog, as long as it keeps clear of its neighbors.
    slots.forEach((slot, index) => {
      const end = ends[slot.endIndex];
      const point = slot.isStart ? end.start : end.end;
      const otherPoint = slot.isStart ? end.end : end.start;
      const aligned = isAlongX ? otherPoint.x - point.x : otherPoint.y - point.y;
      const isClearOfNeighbors = offsets.every((offset, otherIndex) => otherIndex === index || Math.abs(offset - aligned) >= spacing / 2);
      if (Math.abs(aligned) <= sideLength / 2 && isClearOfNeighbors) {
        offsets[index] = aligned;
      }
    });
    slots.forEach((slot, index) => {
      const offset = offsets[index];
      const end = ends[slot.endIndex];
      const point = slot.isStart ? end.start : end.end;
      // The sides of an io parallelogram lean, so moving down a side also moves it inwards.
      const slantShift = node.shape === 'io' && !isAlongX ? -offset * calcSlant(node.height) / node.height : 0;
      const moved = isAlongX ? { x: point.x + offset, y: point.y } : { x: point.x + slantShift, y: point.y + offset };
      if (slot.isStart) {
        end.start = moved;
      } else {
        end.end = moved;
      }
    });
  });
  return ends;
}

/** Point a fixed distance along the polyline, but never past its middle. */
function calcLabelPosition(points: Point[], distance: number): Point {
  const midpoint = calcPolylineMidpoint(points);
  const total = toSegments(points).reduce((sum, segment) => sum + segment.b - segment.a, 0);
  if (distance >= total / 2) {
    return midpoint;
  }
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (walked + length >= distance && length > 0) {
      const ratio = (distance - walked) / length;
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    walked += length;
  }
  return midpoint;
}

/**
 * Holds the last routing result so panning, zooming and hovering don't
 * reroute. A hit requires the very same graph object, so graphs must be
 * treated as immutable (replace, never mutate) when a cache is used.
 */
export class RouteCache {
  private key: unknown[] | null = null;
  private routes: Map<string, EdgeRoute> | null = null;

  get(key: unknown[]): Map<string, EdgeRoute> | null {
    const isHit = this.key !== null && this.key.length === key.length && this.key.every((part, index) => part === key[index]);
    return isHit ? this.routes : null;
  }

  set(key: unknown[], routes: Map<string, EdgeRoute>): void {
    this.key = key;
    this.routes = routes;
  }
}

/**
 * Lane borders become preferred channels just inside each lane, and routes
 * are kept inside the lane bodies (not over the headers or outside the table).
 */
function buildLaneGuides(lanes: LaneLayout): Pick<RouterContext, 'channelsX' | 'channelsY' | 'bounds'> {
  if (lanes.lanes.length === 0) {
    return { channelsX: [], channelsY: [], bounds: null };
  }
  const isColumn = lanes.lanes[0].isColumn;
  const borders = lanes.lanes.flatMap((lane) => (isColumn ? [lane.x, lane.x + lane.width] : [lane.y, lane.y + lane.height]));
  const channels = Array.from(new Set(borders)).flatMap((border) => [border + LANE_CHANNEL_INSET, border - LANE_CHANNEL_INSET]);
  const first = lanes.lanes[0];
  const bounds: Box = {
    minX: Math.min(...lanes.lanes.map((lane) => lane.x)) + (isColumn ? 0 : first.header.width),
    minY: Math.min(...lanes.lanes.map((lane) => lane.y)) + (isColumn ? first.header.height : 0),
    maxX: Math.max(...lanes.lanes.map((lane) => lane.x + lane.width)),
    maxY: Math.max(...lanes.lanes.map((lane) => lane.y + lane.height)),
  };
  return isColumn ? { channelsX: channels, channelsY: [], bounds } : { channelsX: [], channelsY: channels, bounds };
}

function calcManhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Routes all edges of a graph together. Orthogonal edges are routed one by
 * one around the nodes, each avoiding the lines placed before it: forward
 * edges first, then edges between side-by-side nodes, then back edges.
 * Straight and curved edges, and very large graphs, use the simple router.
 */
export function routeEdges(
  items: RoutableEdge[],
  nodes: ResolvedNode[],
  direction: FlowDirection,
  lanes: LaneLayout,
  options: EdgeRoutingOptions = {},
): Map<string, EdgeRoute> {
  const routes = new Map<string, EdgeRoute>();
  const isSmart = (options.isSmart ?? true) && nodes.length <= (options.maxSmartNodes ?? DEFAULT_MAX_SMART_NODES);
  const smartItems = isSmart ? items.filter((item) => item.appearance.routing === 'orthogonal') : [];
  items
    .filter((item) => !smartItems.includes(item))
    .forEach((item) => routes.set(item.edge.id, calcEdgeRoute(item.source, item.target, direction, nodes, item.appearance.routing)));
  if (smartItems.length === 0) {
    return routes;
  }

  const ends = assignPorts(
    smartItems.map((item) => ({ item, choice: choosePorts(item.source, item.target, direction) })),
    options.shouldSpreadPorts ?? true,
  ).sort((a, b) => CONNECTION_ORDER[a.choice.connection] - CONNECTION_ORDER[b.choice.connection]
    || calcManhattan(a.start, a.end) - calcManhattan(b.start, b.end));
  const paddedBoxes = new Map(nodes.map((node) => [node.id, toBox(node, OBSTACLE_PADDING)]));
  const guides = buildLaneGuides(lanes);
  const occupied: Segment[] = [];

  ends.forEach(({ item, choice, start, end }) => {
    const obstacles = nodes
      .filter((node) => node.id !== item.source.id && node.id !== item.target.id)
      .map((node) => paddedBoxes.get(node.id) as Box);
    const stubLength = Math.max(MIN_STUB, item.appearance.arrowSize + STUB_ARROW_PADDING);
    const points = routeOrthogonal(
      {
        start,
        startSide: choice.startSide,
        end,
        endSide: choice.endSide,
        sourceBox: toBox(item.source),
        targetBox: toBox(item.target),
        stubLength,
      },
      { ...guides, obstacles, occupied },
    );
    occupied.push(...toSegments(points));
    routes.set(item.edge.id, { points, isCurve: false, labelPosition: calcLabelPosition(points, stubLength + LABEL_DISTANCE) });
  });
  return routes;
}
