import { Graph, layout } from '@dagrejs/dagre';
import type { FlowDirection, FlowGraph, FlowNode, Point } from '../types';
import { resolveNode } from '../geometry/nodeShape';
import type { FlowTheme } from '../theme/flowTheme';
import { lightTheme } from '../theme/lightThemes';
import { getNodeLaneId } from './laneLayout';

export interface FlowLayoutOptions {
  direction?: FlowDirection;
  /** Gap between nodes in the same rank. */
  nodeSep?: number;
  /** Gap between ranks. */
  rankSep?: number;
  /** Node sizes depend on theme fonts and padding. Defaults to the light theme. */
  theme?: FlowTheme;
  /**
   * With lanes, restart every lane at the top instead of keeping one global
   * rank order. Gives compact, side-by-side columns like hand-drawn swimlanes,
   * at the cost of some edges pointing backwards across lanes.
   */
  isLaneCompact?: boolean;
}

interface Size {
  width: number;
  height: number;
}

const DEFAULT_NODE_SEP = 50;
const DEFAULT_RANK_SEP = 60;
/** Room reserved for an edge label so labelled edges get longer ranks. */
const EDGE_LABEL_SIZE = { width: 40, height: 20 };

function hasPosition(node: FlowNode): boolean {
  return node.x != null && node.y != null;
}

function measureNodes(graph: FlowGraph, theme: FlowTheme): Map<string, Size> {
  const lanes = graph.lanes ?? [];
  const laneStyles = new Map(lanes.map((lane) => [lane.id, lane.nodeStyle]));
  const sizes = new Map<string, Size>();
  graph.nodes.forEach((node) => {
    const laneId = getNodeLaneId(node, lanes);
    const { width, height } = resolveNode(node, theme, laneId ? laneStyles.get(laneId) : undefined);
    sizes.set(node.id, { width, height });
  });
  return sizes;
}

/** Runs dagre and returns every node's center position, keyed by node id. */
function runDagre(graph: FlowGraph, options: FlowLayoutOptions, sizes: Map<string, Size>): Map<string, Point> {
  const dagreGraph = new Graph({ multigraph: true });
  dagreGraph.setGraph({
    rankdir: options.direction ?? 'TB',
    nodesep: options.nodeSep ?? DEFAULT_NODE_SEP,
    ranksep: options.rankSep ?? DEFAULT_RANK_SEP,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  graph.nodes.forEach((node) => dagreGraph.setNode(node.id, { ...sizes.get(node.id) } as Size));
  graph.edges
    .filter((edge) => sizes.has(edge.source) && sizes.has(edge.target) && edge.source !== edge.target)
    .forEach((edge) => dagreGraph.setEdge(edge.source, edge.target, edge.label ? { ...EDGE_LABEL_SIZE } : {}, edge.id));

  layout(dagreGraph);

  const positions = new Map<string, Point>();
  graph.nodes.forEach((node) => {
    const { x = 0, y = 0 } = dagreGraph.node(node.id);
    positions.set(node.id, { x, y });
  });
  return positions;
}

/**
 * Keeps dagre's ranks along the flow but moves every node into its lane band
 * across the flow. Nodes sharing a lane and a rank sit side by side, centered
 * in the lane, in dagre's order. Returns positions and the lane sizes that fit them.
 */
function placeInLanes(
  graph: FlowGraph,
  dagrePositions: Map<string, Point>,
  sizes: Map<string, Size>,
  options: FlowLayoutOptions,
  theme: FlowTheme,
): { positions: Map<string, Point>; laneSizes: Map<string, number> } {
  const lanes = graph.lanes ?? [];
  const isVertical = (options.direction ?? 'TB') === 'TB';
  const main: keyof Point = isVertical ? 'y' : 'x';
  const cross: keyof Point = isVertical ? 'x' : 'y';
  const mainSize: keyof Size = isVertical ? 'height' : 'width';
  const crossSize: keyof Size = isVertical ? 'width' : 'height';
  const nodeSep = options.nodeSep ?? DEFAULT_NODE_SEP;
  const { padding, headerSize, minSize } = theme.lane;

  const getPosition = (id: string) => dagrePositions.get(id) as Point;
  const getSize = (id: string) => sizes.get(id) as Size;
  const minMain = Math.min(...graph.nodes.map((node) => getPosition(node.id)[main] - getSize(node.id)[mainSize] / 2));
  const mainShift = headerSize + padding - minMain;

  // laneId -> rank coordinate -> node ids
  const groups = new Map<string, Map<number, string[]>>(lanes.map((lane) => [lane.id, new Map()]));
  graph.nodes.forEach((node) => {
    const ranks = groups.get(getNodeLaneId(node, lanes) as string) as Map<number, string[]>;
    const rankKey = Math.round(getPosition(node.id)[main]);
    ranks.set(rankKey, [...(ranks.get(rankKey) ?? []), node.id]);
  });

  const calcRowSpan = (ids: string[]) => ids.reduce((sum, id) => sum + getSize(id)[crossSize], 0) + nodeSep * (ids.length - 1);
  const rankSep = options.rankSep ?? DEFAULT_RANK_SEP;
  const positions = new Map<string, Point>();
  const laneSizes = new Map<string, number>();
  let laneStart = 0;
  lanes.forEach((lane) => {
    const ranks = groups.get(lane.id) as Map<number, string[]>;
    const widest = Math.max(0, ...Array.from(ranks.values()).map(calcRowSpan));
    const laneSize = Math.max(widest + padding * 2, minSize);
    // Compact lanes stack their own ranks from the header down, skipping ranks used only by other lanes.
    let compactCursor = headerSize + padding;
    Array.from(ranks.keys()).sort((a, b) => a - b).forEach((rankKey) => {
      const ids = ranks.get(rankKey) as string[];
      const rankDepth = Math.max(...ids.map((id) => getSize(id)[mainSize]));
      const compactMain = compactCursor + rankDepth / 2;
      compactCursor += rankDepth + rankSep;
      const ordered = [...ids].sort((a, b) => getPosition(a)[cross] - getPosition(b)[cross]);
      let cursor = laneStart + laneSize / 2 - calcRowSpan(ordered) / 2;
      ordered.forEach((id) => {
        const size = getSize(id)[crossSize];
        const mainValue = options.isLaneCompact ? compactMain : getPosition(id)[main] + mainShift;
        positions.set(id, { [main]: mainValue, [cross]: cursor + size / 2 } as unknown as Point);
        cursor += size + nodeSep;
      });
    });
    laneSizes.set(lane.id, laneSize);
    laneStart += laneSize;
  });
  return { positions, laneSizes };
}

/** Lays out every node, discarding existing positions. With lanes, also sizes every lane. */
export function calcFlowLayout(graph: FlowGraph, options: FlowLayoutOptions = {}): FlowGraph {
  if (graph.nodes.length === 0) {
    return graph;
  }
  const theme = options.theme ?? lightTheme;
  const sizes = measureNodes(graph, theme);
  const dagrePositions = runDagre(graph, options, sizes);
  if (!graph.lanes?.length) {
    return { ...graph, nodes: graph.nodes.map((node) => ({ ...node, ...dagrePositions.get(node.id) })) };
  }
  const { positions, laneSizes } = placeInLanes(graph, dagrePositions, sizes, options, theme);
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node, ...positions.get(node.id) })),
    lanes: graph.lanes.map((lane) => ({ ...lane, size: laneSizes.get(lane.id) })),
  };
}

/**
 * Lays out only what is missing: nodes without a position and lanes without
 * a size. Positioned nodes and sized lanes stay as they are.
 */
export function fillMissingPositions(graph: FlowGraph, options: FlowLayoutOptions = {}): FlowGraph {
  const hasMissingLaneSize = (graph.lanes ?? []).some((lane) => lane.size == null);
  if (graph.nodes.every(hasPosition) && !hasMissingLaneSize) {
    return graph;
  }
  const laidOut = calcFlowLayout(graph, options);
  return {
    ...graph,
    nodes: graph.nodes.map((node, index) => (hasPosition(node) ? node : laidOut.nodes[index])),
    lanes: graph.lanes?.map((lane, index) => (lane.size != null ? lane : laidOut.lanes?.[index] ?? lane)),
  };
}
