import { isSegmentHittingBox, routeOrthogonal, toSegments, type Box, type RouteRequest, type RouterContext } from './orthogonalRouter';
import type { Point } from '../types';

function createBox(cx: number, cy: number, width = 100, height = 40): Box {
  return { minX: cx - width / 2, minY: cy - height / 2, maxX: cx + width / 2, maxY: cy + height / 2 };
}

function createRequest(source: Box, target: Box, patch: Partial<RouteRequest> = {}): RouteRequest {
  return {
    start: { x: (source.minX + source.maxX) / 2, y: source.maxY },
    startSide: 'bottom',
    end: { x: (target.minX + target.maxX) / 2, y: target.minY },
    endSide: 'top',
    sourceBox: source,
    targetBox: target,
    stubLength: 16,
    ...patch,
  };
}

function createContext(patch: Partial<RouterContext> = {}): RouterContext {
  return { obstacles: [], channelsX: [], channelsY: [], occupied: [], bounds: null, ...patch };
}

function hitsAny(points: Point[], boxes: Box[]): boolean {
  return toSegments(points).some((segment) => boxes.some((box) => isSegmentHittingBox(segment, box)));
}

describe('routeOrthogonal', () => {
  it('should draw a straight line when the ports are aligned', () => {
    // Arrange
    const request = createRequest(createBox(0, 0), createBox(0, 200));

    // Act
    const points = routeOrthogonal(request, createContext());

    // Assert
    expect(points).toEqual([{ x: 0, y: 20 }, { x: 0, y: 180 }]);
  });

  it('should go around a node standing between the ports', () => {
    // Arrange
    const blocker = createBox(0, 100);
    const request = createRequest(createBox(0, 0), createBox(0, 200));

    // Act
    const points = routeOrthogonal(request, createContext({ obstacles: [blocker] }));

    // Assert
    expect(hitsAny(points, [blocker])).toBe(false);
  });

  it('should only use horizontal and vertical segments', () => {
    // Arrange
    const request = createRequest(createBox(0, 0), createBox(300, 200));

    // Act
    const points = routeOrthogonal(request, createContext());

    // Assert
    const isOrthogonal = points.slice(1).every((point, index) => point.x === points[index].x || point.y === points[index].y);
    expect(isOrthogonal).toBe(true);
  });

  it('should move onto a free track when the best channel is taken', () => {
    // Arrange: an earlier edge already runs down the middle channel
    const request = createRequest(createBox(0, 0), createBox(300, 200));
    const first = routeOrthogonal(request, createContext());
    const occupied = toSegments(first);

    // Act
    const second = routeOrthogonal(request, createContext({ occupied }));

    // Assert
    expect(second).not.toEqual(first);
  });

  it('should stay inside the bounds when possible', () => {
    // Arrange: a back edge that would naturally detour to the right
    const bounds: Box = { minX: -200, minY: -100, maxX: 90, maxY: 300 };
    const request = createRequest(createBox(0, 200), createBox(0, 0), {
      start: { x: 50, y: 200 },
      startSide: 'right',
      end: { x: 50, y: 0 },
      endSide: 'right',
    });

    // Act
    const points = routeOrthogonal(request, createContext({ bounds }));

    // Assert
    expect(points.every((point) => point.x <= bounds.maxX)).toBe(true);
  });

  it('should not pass back through its own source node', () => {
    // Arrange: target is above, so a naive route would cut through the source
    const source = createBox(0, 200);
    const request = createRequest(source, createBox(0, 0), { startSide: 'bottom', endSide: 'bottom', end: { x: 0, y: 20 } });

    // Act
    const points = routeOrthogonal(request, createContext());

    // Assert
    expect(hitsAny(points.slice(1), [source])).toBe(false);
  });
});

describe('isSegmentHittingBox', () => {
  it('should ignore a segment that only touches the border', () => {
    // Arrange
    const box = createBox(0, 0);

    // Act
    const isHit = isSegmentHittingBox({ isHorizontal: true, at: 20, a: -100, b: 100 }, box);

    // Assert
    expect(isHit).toBe(false);
  });
});
