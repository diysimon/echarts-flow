import { alignToPixel } from './pixelAlign';

describe('alignToPixel', () => {
  it('should add half a pixel when line width is odd', () => {
    // Act
    const aligned = alignToPixel(10.2, 1);

    // Assert
    expect(aligned).toBe(10.5);
  });

  it('should round to a whole pixel when line width is even', () => {
    // Act
    const aligned = alignToPixel(10.6, 2);

    // Assert
    expect(aligned).toBe(11);
  });
});
