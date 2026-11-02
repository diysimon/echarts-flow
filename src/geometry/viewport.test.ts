import { calcNodesBounds, clampScale, fitBounds, MAX_SCALE, panBy, toScreen, toWorld, zoomAt } from './viewport';
import { resolveNode } from './nodeShape';
import { lightTheme } from '../theme/lightThemes';

describe('toScreen and toWorld', () => {
  it('should round-trip a point through screen space', () => {
    // Arrange
    const viewport = { x: 30, y: -10, scale: 2 };
    const point = { x: 7, y: 9 };

    // Act
    const roundTrip = toWorld(viewport, toScreen(viewport, point));

    // Assert
    expect(roundTrip).toEqual(point);
  });
});

describe('zoomAt', () => {
  it('should keep the world point under the anchor fixed when zooming', () => {
    // Arrange
    const viewport = { x: 10, y: 20, scale: 1 };
    const anchor = { x: 100, y: 100 };
    const worldBefore = toWorld(viewport, anchor);

    // Act
    const zoomed = zoomAt(viewport, anchor, 1.5);

    // Assert
    expect(toWorld(zoomed, anchor)).toEqual(worldBefore);
  });

  it('should clamp scale when zooming beyond MAX_SCALE', () => {
    // Act
    const zoomed = zoomAt({ x: 0, y: 0, scale: 2 }, { x: 0, y: 0 }, 10);

    // Assert
    expect(zoomed.scale).toBe(MAX_SCALE);
  });
});

describe('panBy', () => {
  it('should shift offsets by the given delta', () => {
    // Act
    const panned = panBy({ x: 1, y: 2, scale: 3 }, 10, 20);

    // Assert
    expect(panned).toEqual({ x: 11, y: 22, scale: 3 });
  });
});

describe('clampScale', () => {
  it('should raise scale to the minimum when too small', () => {
    // Act
    const scale = clampScale(0.001);

    // Assert
    expect(scale).toBeGreaterThan(0.001);
  });
});

describe('calcNodesBounds', () => {
  it('should cover node extents including size', () => {
    // Arrange
    const nodes = [
      resolveNode({ id: 'a', label: 'A', shape: 'process', x: 0, y: 0, width: 100, height: 40 }, lightTheme),
      resolveNode({ id: 'b', label: 'B', shape: 'process', x: 200, y: 100, width: 100, height: 40 }, lightTheme),
    ];

    // Act
    const bounds = calcNodesBounds(nodes);

    // Assert
    expect(bounds).toEqual({ minX: -50, minY: -20, maxX: 250, maxY: 120 });
  });

  it('should return null when there are no nodes', () => {
    // Act
    const bounds = calcNodesBounds([]);

    // Assert
    expect(bounds).toBeNull();
  });
});

describe('fitBounds', () => {
  it('should center content in the container', () => {
    // Arrange
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    // Act
    const viewport = fitBounds(bounds, 400, 400);

    // Assert
    expect(toScreen(viewport, { x: 50, y: 50 })).toEqual({ x: 200, y: 200 });
  });

  it('should not zoom in past 1 when content is small', () => {
    // Arrange
    const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

    // Act
    const viewport = fitBounds(bounds, 1000, 1000);

    // Assert
    expect(viewport.scale).toBe(1);
  });

  it('should zoom out when content is larger than the container', () => {
    // Arrange
    const bounds = { minX: 0, minY: 0, maxX: 2000, maxY: 1000 };

    // Act
    const viewport = fitBounds(bounds, 1000, 1000, 0);

    // Assert
    expect(viewport.scale).toBe(0.5);
  });
});
