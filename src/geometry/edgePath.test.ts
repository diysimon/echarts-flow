import { buildCurvePath, buildRoundedPath, calcBezierPoint, shortenEnd, shortenStart } from './edgePath';

describe('buildRoundedPath', () => {
  it('should draw straight lines when polyline has no corners', () => {
    // Arrange
    const points = [{ x: 0, y: 0 }, { x: 0, y: 10 }];

    // Act
    const pathData = buildRoundedPath(points, 8);

    // Assert
    expect(pathData).toBe('M0,0 L0,10');
  });

  it('should round a corner with a quadratic curve', () => {
    // Arrange
    const points = [{ x: 0, y: 0 }, { x: 0, y: 20 }, { x: 20, y: 20 }];

    // Act
    const pathData = buildRoundedPath(points, 5);

    // Assert
    expect(pathData).toBe('M0,0 L0,15 Q0,20 5,20 L20,20');
  });

  it('should shrink radius when segments are shorter than twice the radius', () => {
    // Arrange: first segment is 4 long, so radius is limited to 2
    const points = [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 20, y: 4 }];

    // Act
    const pathData = buildRoundedPath(points, 10);

    // Assert
    expect(pathData).toBe('M0,0 L0,2 Q0,4 2,4 L20,4');
  });

  it('should return empty string when there are no points', () => {
    // Act
    const pathData = buildRoundedPath([], 5);

    // Assert
    expect(pathData).toBe('');
  });
});

describe('shortenEnd', () => {
  it('should pull the last point back along the last segment', () => {
    // Arrange
    const points = [{ x: 0, y: 0 }, { x: 0, y: 100 }];

    // Act
    const shortened = shortenEnd(points, 10);

    // Assert
    expect(shortened[1]).toEqual({ x: 0, y: 90 });
  });
});

describe('shortenStart', () => {
  it('should push the first point forward along the first segment', () => {
    // Arrange
    const points = [{ x: 0, y: 0 }, { x: 0, y: 100 }];

    // Act
    const shortened = shortenStart(points, 10);

    // Assert
    expect(shortened[0]).toEqual({ x: 0, y: 10 });
  });
});

describe('buildCurvePath', () => {
  it('should emit one cubic bezier command', () => {
    // Act
    const pathData = buildCurvePath([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 100 }]);

    // Assert
    expect(pathData).toBe('M0,0 C0,50 100,50 100,100');
  });
});

describe('calcBezierPoint', () => {
  it('should return the midpoint of a symmetric curve at t = 0.5', () => {
    // Act
    const point = calcBezierPoint([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 100 }], 0.5);

    // Assert
    expect(point).toEqual({ x: 50, y: 50 });
  });
});
