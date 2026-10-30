import { calcDraftRoute, calcEdgeRoute, calcPolylineMidpoint, simplifyPoints } from './edgeRoute';
import { resolveNode } from './nodeShape';
import { lightTheme } from '../theme/lightThemes';
import type { FlowNode } from '../types';

function createNode(id: string, x: number, y: number): ReturnType<typeof resolveNode> {
  const node: FlowNode = { id, label: id, shape: 'process', x, y, width: 100, height: 40 };
  return resolveNode(node, lightTheme);
}

describe('calcEdgeRoute routing modes', () => {
  it('should connect ports with one straight segment when routing is straight', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 200, 100);

    // Act
    const route = calcEdgeRoute(source, target, 'TB', [], 'straight');

    // Assert
    expect(route.points).toEqual([{ x: 0, y: 20 }, { x: 200, y: 80 }]);
  });

  it('should go straight against the flow when a straight edge points back', () => {
    // Arrange
    const source = createNode('a', 0, 200);
    const target = createNode('b', 0, 0);

    // Act
    const route = calcEdgeRoute(source, target, 'TB', [], 'straight');

    // Assert: leaves from the top, enters from the bottom
    expect(route.points).toEqual([{ x: 0, y: 180 }, { x: 0, y: 20 }]);
  });

  it('should produce a cubic curve with handles along the port normals when routing is curved', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 200, 200);

    // Act
    const route = calcEdgeRoute(source, target, 'TB', [], 'curved');

    // Assert: start handle goes straight down from the bottom port
    expect([route.isCurve, route.points[1].x, route.points[1].y > route.points[0].y]).toEqual([true, 0, true]);
  });

  it('should bulge a curved back edge out to the side', () => {
    // Arrange
    const source = createNode('a', 0, 200);
    const target = createNode('b', 0, 0);

    // Act
    const route = calcEdgeRoute(source, target, 'TB', [], 'curved');

    // Assert
    expect(route.points[1].x).toBeGreaterThan(route.points[0].x);
  });
});

describe('calcEdgeRoute', () => {
  it('should connect bottom to top with a straight line when target is directly below in TB', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 0, 100);

    // Act
    const route = calcEdgeRoute(source, target, 'TB');

    // Assert
    expect(route.points).toEqual([{ x: 0, y: 20 }, { x: 0, y: 80 }]);
  });

  it('should bend halfway when target is below and offset sideways in TB', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 200, 100);

    // Act
    const route = calcEdgeRoute(source, target, 'TB');

    // Assert
    expect(route.points).toEqual([{ x: 0, y: 20 }, { x: 0, y: 50 }, { x: 200, y: 50 }, { x: 200, y: 80 }]);
  });

  it('should detour around the right side when target is above in TB', () => {
    // Arrange
    const source = createNode('a', 0, 200);
    const target = createNode('b', 0, 0);

    // Act
    const route = calcEdgeRoute(source, target, 'TB');

    // Assert: right ports at x = 50, detour at 50 + 30
    expect(route.points).toEqual([{ x: 50, y: 200 }, { x: 80, y: 200 }, { x: 80, y: 0 }, { x: 50, y: 0 }]);
  });

  it('should detour past wider obstacles between the endpoints when target is above in TB', () => {
    // Arrange
    const source = createNode('a', 0, 200);
    const target = createNode('b', 0, 0);
    const obstacle = resolveNode({ id: 'wide', label: 'W', shape: 'process', x: 100, y: 100, width: 100, height: 40 }, lightTheme);

    // Act
    const route = calcEdgeRoute(source, target, 'TB', [obstacle]);

    // Assert: obstacle right edge at 150, detour at 150 + 30
    expect(route.points[1]).toEqual({ x: 180, y: 200 });
  });

  it('should ignore obstacles outside the vertical span when detouring', () => {
    // Arrange
    const source = createNode('a', 0, 200);
    const target = createNode('b', 0, 0);
    const farAway = resolveNode({ id: 'far', label: 'F', shape: 'process', x: 500, y: 600, width: 100, height: 40 }, lightTheme);

    // Act
    const route = calcEdgeRoute(source, target, 'TB', [farAway]);

    // Assert
    expect(route.points[1]).toEqual({ x: 80, y: 200 });
  });

  it('should connect facing sides when a back edge goes to another column in TB', () => {
    // Arrange: target is above and well to the right, as across swimlanes
    const source = createNode('a', 0, 300);
    const target = createNode('b', 300, 0);

    // Act
    const route = calcEdgeRoute(source, target, 'TB');

    // Assert: leaves from the right port and enters the left port
    expect([route.points[0], route.points[route.points.length - 1]]).toEqual([{ x: 50, y: 300 }, { x: 250, y: 0 }]);
  });

  it('should connect side ports when nodes overlap vertically in TB', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 300, 10);

    // Act
    const route = calcEdgeRoute(source, target, 'TB');

    // Assert
    expect(route.points[0]).toEqual({ x: 50, y: 0 });
  });

  it('should connect right to left when target is to the right in LR', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 300, 0);

    // Act
    const route = calcEdgeRoute(source, target, 'LR');

    // Assert
    expect(route.points).toEqual([{ x: 50, y: 0 }, { x: 250, y: 0 }]);
  });

  it('should detour below when target is to the left in LR', () => {
    // Arrange
    const source = createNode('a', 300, 0);
    const target = createNode('b', 0, 0);

    // Act
    const route = calcEdgeRoute(source, target, 'LR');

    // Assert: bottom ports at y = 20, detour at 20 + 30
    expect(route.points[1]).toEqual({ x: 300, y: 50 });
  });

  it('should place label at the middle of the route', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const target = createNode('b', 0, 100);

    // Act
    const route = calcEdgeRoute(source, target, 'TB');

    // Assert
    expect(route.labelPosition).toEqual({ x: 0, y: 50 });
  });
});

describe('simplifyPoints', () => {
  it('should remove collinear middle points when run is straight', () => {
    // Arrange
    const points = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 20 }];

    // Act
    const simplified = simplifyPoints(points);

    // Assert
    expect(simplified).toEqual([{ x: 0, y: 0 }, { x: 0, y: 20 }]);
  });

  it('should remove duplicate consecutive points', () => {
    // Arrange
    const points = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 10 }];

    // Act
    const simplified = simplifyPoints(points);

    // Assert
    expect(simplified).toEqual([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
  });
});

describe('calcPolylineMidpoint', () => {
  it('should return the point at half the total length when polyline bends', () => {
    // Arrange: total length 20, midpoint lies at the corner
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];

    // Act
    const midpoint = calcPolylineMidpoint(points);

    // Assert
    expect(midpoint).toEqual({ x: 10, y: 0 });
  });
});

describe('calcDraftRoute', () => {
  it('should start from the port nearest to the cursor', () => {
    // Arrange
    const source = createNode('a', 0, 0);
    const cursor = { x: 0, y: -200 };

    // Act
    const points = calcDraftRoute(source, cursor);

    // Assert
    expect(points[0]).toEqual({ x: 0, y: -20 });
  });
});
