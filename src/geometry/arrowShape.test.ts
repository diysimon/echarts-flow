import { calcArrowGeometry } from './arrowShape';

const FROM = { x: 0, y: 0 };
const TIP = { x: 0, y: 100 };
const SIZE = 10;

function roundPoints(points: number[][]): number[][] {
  return points.map(([x, y]) => [Math.round(x), Math.round(y)]);
}

describe('calcArrowGeometry', () => {
  it('should put a filled triangle base behind the tip', () => {
    // Act
    const arrow = calcArrowGeometry('triangle', FROM, TIP, SIZE);

    // Assert
    expect([roundPoints(arrow?.points ?? []), arrow?.isFilled]).toEqual([[[0, 100], [4, 90], [-4, 90]], true]);
  });

  it('should leave an open triangle unfilled', () => {
    // Act
    const arrow = calcArrowGeometry('triangle-open', FROM, TIP, SIZE);

    // Assert
    expect(arrow?.isFilled).toBe(false);
  });

  it('should let the line run to the tip of a vee', () => {
    // Act
    const arrow = calcArrowGeometry('vee', FROM, TIP, SIZE);

    // Assert
    expect([arrow?.kind, arrow?.inset]).toEqual(['polyline', 0]);
  });

  it('should center a circle one radius behind the tip', () => {
    // Act
    const arrow = calcArrowGeometry('circle', FROM, TIP, SIZE);

    // Assert
    expect([arrow?.kind, arrow?.center.y, arrow?.inset]).toEqual(['circle', 96, 8]);
  });

  it('should make a diamond longer than a triangle', () => {
    // Act
    const diamond = calcArrowGeometry('diamond', FROM, TIP, SIZE);

    // Assert
    expect(diamond?.inset).toBeGreaterThan(SIZE);
  });

  it('should return null when type is none', () => {
    // Act
    const arrow = calcArrowGeometry('none', FROM, TIP, SIZE);

    // Assert
    expect(arrow).toBeNull();
  });
});
