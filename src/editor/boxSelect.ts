import type { FlowEdge, FlowSelection, Point, ResolvedNode } from '../types';
import type { Rect } from '../layout/laneLayout';

/** Normalized rectangle between two corner points, in either drag direction. */
export function calcRectFromPoints(start: Point, end: Point): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function isNodeTouchingRect(node: ResolvedNode, rect: Rect): boolean {
  return (
    node.x + node.width / 2 >= rect.x &&
    node.x - node.width / 2 <= rect.x + rect.width &&
    node.y + node.height / 2 >= rect.y &&
    node.y - node.height / 2 <= rect.y + rect.height
  );
}

/**
 * Nodes the box touches, plus the edges between two of those nodes. Touching
 * rather than fully enclosing lets a quick drag pick up nodes at the edge.
 */
export function selectInRect(nodes: ResolvedNode[], edges: FlowEdge[], rect: Rect): FlowSelection {
  const nodeIds = nodes.filter((node) => isNodeTouchingRect(node, rect)).map((node) => node.id);
  const selected = new Set(nodeIds);
  const edgeIds = edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target)).map((edge) => edge.id);
  return { nodeIds, edgeIds };
}

/** Union of two selections, keeping the order of first appearance. */
export function mergeSelections(base: FlowSelection, extra: FlowSelection): FlowSelection {
  const merge = (a: string[], b: string[]) => [...a, ...b.filter((id) => !a.includes(id))];
  return { nodeIds: merge(base.nodeIds, extra.nodeIds), edgeIds: merge(base.edgeIds, extra.edgeIds) };
}
