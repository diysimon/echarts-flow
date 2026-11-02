import type { Point, ResolvedNode } from '../types';

/** Distance from `point` to the segment from `start` to `end`. */
function calcSegmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

/** Whether a world point is inside the node's outline; slanted shapes use their box. */
export function isPointInNode(node: ResolvedNode, point: Point): boolean {
  const dx = Math.abs(point.x - node.x) / (node.width / 2);
  const dy = Math.abs(point.y - node.y) / (node.height / 2);
  if (node.shape === 'decision') {
    return dx + dy <= 1;
  }
  if (node.shape === 'circle') {
    return dx * dx + dy * dy <= 1;
  }
  return dx <= 1 && dy <= 1;
}

/** Topmost node under a world point; later nodes are drawn on top. */
export function findNodeAt(nodes: ResolvedNode[], point: Point): ResolvedNode | null {
  for (let index = nodes.length - 1; index >= 0; index--) {
    if (isPointInNode(nodes[index], point)) {
      return nodes[index];
    }
  }
  return null;
}

/**
 * Edge whose route passes within `tolerance` world units of the point.
 * Curves are approximated by their control polygon, which is close enough
 * for the small on-screen size edges have when batched.
 */
export function findEdgeAt<T extends { points: Point[] }>(edges: T[], point: Point, tolerance: number): T | null {
  for (let index = edges.length - 1; index >= 0; index--) {
    const { points } = edges[index];
    for (let i = 1; i < points.length; i++) {
      if (calcSegmentDistance(point, points[i - 1], points[i]) <= tolerance) {
        return edges[index];
      }
    }
  }
  return null;
}
