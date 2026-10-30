import { RouteCache, routeEdges, type RoutableEdge } from './edgeRouter';
import { resolveNode } from './nodeShape';
import { resolveEdgeAppearance } from '../style/resolveAppearance';
import { lightTheme } from '../theme/lightThemes';
import type { EdgeRouting, FlowNode, ResolvedNode } from '../types';

const EMPTY_LANES = { lanes: [], title: null };

function createNode(id: string, shape: FlowNode['shape'], x: number, y: number): ResolvedNode {
  return resolveNode({ id, label: id, shape, x, y }, lightTheme);
}

function createEdge(id: string, source: ResolvedNode, target: ResolvedNode, routing: EdgeRouting = 'orthogonal'): RoutableEdge {
  const edge = { id, source: source.id, target: target.id, style: { routing } };
  return { edge, source, target, appearance: resolveEdgeAppearance(edge, lightTheme) };
}

describe('routeEdges', () => {
  it('should spread two edges entering the same side of a box node', () => {
    // Arrange
    const left = createNode('left', 'process', -150, 0);
    const right = createNode('right', 'process', 150, 0);
    const target = createNode('target', 'process', 0, 200);
    const nodes = [left, right, target];

    // Act
    const routes = routeEdges([createEdge('a', left, target), createEdge('b', right, target)], nodes, 'TB', EMPTY_LANES);

    // Assert: the two end points differ
    const pointsA = routes.get('a')?.points ?? [];
    const pointsB = routes.get('b')?.points ?? [];
    expect(pointsA[pointsA.length - 1].x).not.toBe(pointsB[pointsB.length - 1].x);
  });

  it('should move a second edge to a free side of a decision', () => {
    // Arrange: both targets lie below, so both edges would start at the bottom vertex
    const decision = createNode('decision', 'decision', 0, 0);
    const below = createNode('below', 'process', 0, 200);
    const belowRight = createNode('below-right', 'process', 300, 200);
    const nodes = [decision, below, belowRight];

    // Act
    const routes = routeEdges([createEdge('yes', decision, below), createEdge('no', decision, belowRight)], nodes, 'TB', EMPTY_LANES);

    // Assert: "yes" keeps the bottom vertex, "no" leaves from the right vertex
    expect([routes.get('yes')?.points[0], routes.get('no')?.points[0]]).toEqual([{ x: 0, y: 35 }, { x: 65, y: 0 }]);
  });

  it('should line a spread port up with a node straight across to avoid a jog', () => {
    // Arrange: two edges enter the left side of target; one source sits exactly level with it
    const target = createNode('target', 'process', 300, 0);
    const level = createNode('level', 'process', 0, 0);
    const below = createNode('below', 'process', 0, 300);
    const nodes = [target, level, below];

    // Act
    const routes = routeEdges([createEdge('a', level, target), createEdge('b', below, target)], nodes, 'LR', EMPTY_LANES);

    // Assert: the level edge is a single straight segment
    expect(routes.get('a')?.points).toHaveLength(2);
  });

  it('should leave curved edges to the simple router', () => {
    // Arrange
    const source = createNode('s', 'process', 0, 0);
    const target = createNode('t', 'process', 200, 200);

    // Act
    const routes = routeEdges([createEdge('c', source, target, 'curved')], [source, target], 'TB', EMPTY_LANES);

    // Assert
    expect(routes.get('c')?.isCurve).toBe(true);
  });

  it('should place the label close to the source', () => {
    // Arrange
    const source = createNode('s', 'process', 0, 0);
    const target = createNode('t', 'process', 0, 400);

    // Act
    const routes = routeEdges([createEdge('e', source, target)], [source, target], 'TB', EMPTY_LANES);

    // Assert
    expect((routes.get('e')?.labelPosition.y ?? 0) < 200).toBe(true);
  });
});

describe('RouteCache', () => {
  it('should return the stored routes for an identical key', () => {
    // Arrange
    const cache = new RouteCache();
    const graph = {};
    const routes = new Map();
    cache.set([graph, 'TB'], routes);

    // Act
    const cached = cache.get([graph, 'TB']);

    // Assert
    expect(cached).toBe(routes);
  });

  it('should miss when any key part changes', () => {
    // Arrange
    const cache = new RouteCache();
    const graph = {};
    cache.set([graph, 'TB'], new Map());

    // Act
    const cached = cache.get([graph, 'LR']);

    // Assert
    expect(cached).toBeNull();
  });
});
