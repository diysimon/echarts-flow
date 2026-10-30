import { calcAlignment } from './alignGuides';
import type { Bounds } from '../geometry/viewport';

function createBox(centerX: number, centerY: number, width = 100, height = 40): Bounds {
  return { minX: centerX - width / 2, maxX: centerX + width / 2, minY: centerY - height / 2, maxY: centerY + height / 2 };
}

const THRESHOLD = 6;

describe('calcAlignment', () => {
  it('should snap the center onto another center when it is within the threshold', () => {
    // Arrange: moving box sits 4 units right of the other node's center line
    const moving = createBox(4, 200);

    // Act
    const result = calcAlignment(moving, [createBox(0, 0)], THRESHOLD);

    // Assert
    expect(result.dx).toBe(-4);
  });

  it('should not snap when every line is farther than the threshold', () => {
    // Arrange
    const moving = createBox(30, 200);

    // Act
    const result = calcAlignment(moving, [createBox(0, 0)], THRESHOLD);

    // Assert
    expect(result.dx).toBeNull();
  });

  it('should snap a left edge onto a left edge of a wider node', () => {
    // Arrange: the other node's left edge is at -100, the moving one's at -97
    const moving = createBox(-47, 200);

    // Act
    const result = calcAlignment(moving, [createBox(0, 0, 200)], THRESHOLD);

    // Assert
    expect(result.dx).toBe(-3);
  });

  it('should draw a vertical guide from the other node to the moving one when x aligns', () => {
    // Arrange
    const moving = createBox(4, 200);

    // Act
    const result = calcAlignment(moving, [createBox(0, 0)], THRESHOLD);

    // Assert
    expect(result.guides).toContainEqual({ axis: 'x', position: 0, start: -20, end: 220 });
  });

  it('should return no guides when nothing aligns', () => {
    // Act
    const result = calcAlignment(createBox(300, 300), [createBox(0, 0)], THRESHOLD);

    // Assert
    expect(result.guides).toEqual([]);
  });
});
