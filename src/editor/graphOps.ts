import type { EdgeEnd, FlowEdge, FlowGraph, FlowNode, FlowSelection } from '../types';

export function createUniqueId(prefix: string, existingIds: Iterable<string>): string {
  const usedIds = new Set(existingIds);
  let index = usedIds.size + 1;
  while (usedIds.has(`${prefix}-${index}`)) {
    index++;
  }
  return `${prefix}-${index}`;
}

export function collectElementIds(graph: FlowGraph): string[] {
  return [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)];
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function addNode(graph: FlowGraph, node: FlowNode): FlowGraph {
  if (graph.nodes.some((existing) => existing.id === node.id)) {
    throw new Error(`Node id "${node.id}" already exists`);
  }
  return { ...graph, nodes: [...graph.nodes, node] };
}

export function updateNode(graph: FlowGraph, nodeId: string, patch: Partial<Omit<FlowNode, 'id'>>): FlowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
  };
}

/** Sets absolute positions; nodes not listed keep their position. */
export function setNodePositions(graph: FlowGraph, positions: Map<string, { x: number; y: number }>): FlowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, x: position.x, y: position.y } : node;
    }),
  };
}

/** Removes the selected nodes and edges, plus every edge attached to a removed node. */
export function removeElements(graph: FlowGraph, selection: FlowSelection): FlowGraph {
  const removedNodeIds = new Set(selection.nodeIds);
  const removedEdgeIds = new Set(selection.edgeIds);
  return {
    nodes: graph.nodes.filter((node) => !removedNodeIds.has(node.id)),
    edges: graph.edges.filter(
      (edge) => !removedEdgeIds.has(edge.id) && !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target),
    ),
  };
}

/** Both ends must exist, differ, and not already be connected in the same direction. */
export function canConnect(graph: FlowGraph, sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) {
    return false;
  }
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
    return false;
  }
  return !graph.edges.some((edge) => edge.source === sourceId && edge.target === targetId);
}

export function addEdge(graph: FlowGraph, edge: FlowEdge): FlowGraph {
  if (!canConnect(graph, edge.source, edge.target)) {
    return graph;
  }
  return { ...graph, edges: [...graph.edges, edge] };
}

export function updateEdge(graph: FlowGraph, edgeId: string, patch: Partial<Omit<FlowEdge, 'id'>>): FlowGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
  };
}

/** Shifts the given nodes by a world offset; locked nodes stay put. */
export function moveNodes(graph: FlowGraph, nodeIds: string[], dx: number, dy: number): FlowGraph {
  const movedIds = new Set(nodeIds);
  const isMovable = (node: FlowNode) => movedIds.has(node.id) && !node.isLocked;
  if (!graph.nodes.some(isMovable)) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (isMovable(node) ? { ...node, x: (node.x ?? 0) + dx, y: (node.y ?? 0) + dy } : node)),
  };
}

/**
 * Moves one end of an edge to another node. Returns the graph unchanged when
 * the result would be a self loop or duplicate a connection.
 */
export function reconnectEdge(graph: FlowGraph, edgeId: string, end: EdgeEnd, nodeId: string): FlowGraph {
  const edge = graph.edges.find((item) => item.id === edgeId);
  if (!edge || edge[end] === nodeId) {
    return graph;
  }
  const next = { ...edge, [end]: nodeId };
  const others = { ...graph, edges: graph.edges.filter((item) => item.id !== edgeId) };
  if (!canConnect(others, next.source, next.target)) {
    return graph;
  }
  return updateEdge(graph, edgeId, { [end]: nodeId });
}
