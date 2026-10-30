import { isTransparent, linearGradient, toZrColor } from './flowColor';

describe('toZrColor', () => {
  it('should pass a plain color string through', () => {
    // Act
    const color = toZrColor('#ff0000');

    // Assert
    expect(color).toBe('#ff0000');
  });

  it('should run a 0 degree gradient from left to right', () => {
    // Act
    const color = toZrColor(linearGradient(0, '#000000', '#ffffff'));

    // Assert
    expect(color).toMatchObject({ type: 'linear', x: 0, y: 0.5, x2: 1, y2: 0.5 });
  });

  it('should run a 90 degree gradient from top to bottom', () => {
    // Act
    const color = toZrColor(linearGradient(90, '#000000', '#ffffff')) as { x: number; y: number; x2: number; y2: number };

    // Assert
    expect([Math.round(color.x * 100), color.y, Math.round(color.x2 * 100), color.y2]).toEqual([50, 0, 50, 1]);
  });

  it('should center a radial gradient on the element', () => {
    // Act
    const color = toZrColor({ type: 'radial', stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] });

    // Assert
    expect(color).toMatchObject({ type: 'radial', x: 0.5, y: 0.5, r: 0.5 });
  });
});

describe('linearGradient', () => {
  it('should spread the colors evenly from 0 to 1', () => {
    // Act
    const gradient = linearGradient(45, '#000', '#888', '#fff');

    // Assert
    expect(typeof gradient === 'object' ? gradient.stops.map((stop) => stop.offset) : []).toEqual([0, 0.5, 1]);
  });
});

describe('isTransparent', () => {
  it('should treat none as transparent', () => {
    // Act
    const result = isTransparent('none');

    // Assert
    expect(result).toBe(true);
  });

  it('should not treat a gradient as transparent', () => {
    // Act
    const result = isTransparent(linearGradient(0, '#000', '#fff'));

    // Assert
    expect(result).toBe(false);
  });
});
