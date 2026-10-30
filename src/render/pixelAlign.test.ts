import { alignToPixel, snapLineHeight } from './pixelAlign';

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

describe('snapLineHeight', () => {
  it('should round to the nearest even pixel when line height is fractional', () => {
    // Act
    const lineHeight = snapLineHeight(15.66);

    // Assert
    expect(lineHeight).toBe(16);
  });

  it('should move an odd line height to an even one when it is whole', () => {
    // Act
    const lineHeight = snapLineHeight(17);

    // Assert
    expect(lineHeight % 2).toBe(0);
  });
});
