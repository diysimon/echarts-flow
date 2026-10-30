import type { FlowDirection, FlowGraph, FlowLane } from '../types';
import { calcLaneSize, getNodeLaneId } from '../layout/laneLayout';
import type { FlowTheme } from '../theme/flowTheme';

type CrossAxis = 'x' | 'y';

function getCrossAxis(direction: FlowDirection): CrossAxis {
  return direction === 'TB' ? 'x' : 'y';
}

/** Start of each lane band across the flow, in lane order. */
function calcLaneStarts(lanes: FlowLane[], theme: FlowTheme): number[] {
  let offset = 0;
  return lanes.map((lane) => {
    const start = offset;
    offset += calcLaneSize(lane, theme);
    return start;
  });
}

export function addLane(graph: FlowGraph, lane: FlowLane): FlowGraph {
  const lanes = graph.lanes ?? [];
  if (lanes.some((existing) => existing.id === lane.id)) {
    throw new Error(`Lane id "${lane.id}" already exists`);
  }
  return { ...graph, lanes: [...lanes, lane] };
}

/**
 * Updates a lane. When its size changes, nodes in later lanes shift by the
 * same amount so they stay inside their own lane.
 */
export function updateLane(
  graph: FlowGraph,
  laneId: string,
  patch: Partial<Omit<FlowLane, 'id'>>,
  direction: FlowDirection,
  theme: FlowTheme,
): FlowGraph {
  const lanes = graph.lanes ?? [];
  const index = lanes.findIndex((lane) => lane.id === laneId);
  if (index < 0) {
    return graph;
  }
  const nextLane = { ...lanes[index], ...patch };
  const delta = calcLaneSize(nextLane, theme) - calcLaneSize(lanes[index], theme);
  const laterLaneIds = new Set(lanes.slice(index + 1).map((lane) => lane.id));
  const axis = getCrossAxis(direction);
  return {
    ...graph,
    lanes: lanes.map((lane, laneIndex) => (laneIndex === index ? nextLane : lane)),
    nodes: delta === 0
      ? graph.nodes
      : graph.nodes.map((node) => {
        const isInLaterLane = laterLaneIds.has(getNodeLaneId(node, lanes) ?? '');
        return isInLaterLane && node[axis] != null ? { ...node, [axis]: (node[axis] as number) + delta } : node;
      }),
  };
}

/**
 * Removes a lane. Its nodes move to the neighboring lane (the previous one,
 * or the next when removing the first), and later lanes close the gap.
 */
export function removeLane(graph: FlowGraph, laneId: string, direction: FlowDirection, theme: FlowTheme): FlowGraph {
  const lanes = graph.lanes ?? [];
  const index = lanes.findIndex((lane) => lane.id === laneId);
  if (index < 0) {
    return graph;
  }
  const remaining = lanes.filter((lane) => lane.id !== laneId);
  const removedSize = calcLaneSize(lanes[index], theme);
  const neighbor = remaining[Math.max(index - 1, 0)];
  const starts = calcLaneStarts(lanes, theme);
  const neighborIndex = neighbor ? lanes.indexOf(neighbor) : -1;
  const neighborCenter = neighbor ? starts[neighborIndex] + calcLaneSize(neighbor, theme) / 2 - (neighborIndex > index ? removedSize : 0) : 0;
  const laterLaneIds = new Set(lanes.slice(index + 1).map((lane) => lane.id));
  const axis = getCrossAxis(direction);

  return {
    ...graph,
    lanes: remaining,
    nodes: graph.nodes.map((node) => {
      const nodeLaneId = getNodeLaneId(node, lanes);
      if (nodeLaneId === laneId) {
        return { ...node, laneId: neighbor?.id, [axis]: neighborCenter };
      }
      if (laterLaneIds.has(nodeLaneId ?? '') && node[axis] != null) {
        return { ...node, [axis]: (node[axis] as number) - removedSize };
      }
      return node;
    }),
  };
}

export function setNodeLanes(graph: FlowGraph, laneIds: Map<string, string>): FlowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const laneId = laneIds.get(node.id);
      return laneId && laneId !== node.laneId ? { ...node, laneId } : node;
    }),
  };
}
