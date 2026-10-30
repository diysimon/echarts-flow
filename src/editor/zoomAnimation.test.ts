import { calcWheelZoomFactor, stepZoom } from './zoomAnimation';

const LIMITS = { min: 0.2, max: 3 };
const SPEED = 0.0015;
const VIEWPORT = { x: 0, y: 0, scale: 1 };

describe('calcWheelZoomFactor', () => {
  it('should zoom in when the wheel moves up', () => {
    // Act
    const factor = calcWheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false }, SPEED);

    // Assert
    expect(factor).toBeGreaterThan(1);
  });

  it('should treat a line-mode notch like many pixels', () => {
    // Arrange
    const pixelFactor = calcWheelZoomFactor({ deltaY: 3, deltaMode: 0, ctrlKey: false }, SPEED);

    // Act
    const lineFactor = calcWheelZoomFactor({ deltaY: 3, deltaMode: 1, ctrlKey: false }, SPEED);

    // Assert
    expect(lineFactor).toBeLessThan(pixelFactor);
  });

  it('should speed up a trackpad pinch', () => {
    // Arrange
    const scrollFactor = calcWheelZoomFactor({ deltaY: -4, deltaMode: 0, ctrlKey: false }, SPEED);

    // Act
    const pinchFactor = calcWheelZoomFactor({ deltaY: -4, deltaMode: 0, ctrlKey: true }, SPEED);

    // Assert
    expect(pinchFactor).toBeGreaterThan(scrollFactor);
  });

  it('should cap a single huge wheel event', () => {
    // Act
    const factor = calcWheelZoomFactor({ deltaY: -10000, deltaMode: 0, ctrlKey: false }, SPEED);

    // Assert
    expect(factor).toBeCloseTo(Math.exp(0.4));
  });
});

describe('stepZoom', () => {
  it('should cover part of the distance in one frame', () => {
    // Act
    const step = stepZoom(VIEWPORT, 2, { x: 0, y: 0 }, 16, LIMITS);

    // Assert
    expect(step.viewport.scale > 1 && step.viewport.scale < 2).toBe(true);
  });

  it('should keep the anchor point fixed on screen', () => {
    // Arrange: the world point under the anchor is (100, 50) at scale 1
    const anchor = { x: 100, y: 50 };

    // Act
    const { viewport } = stepZoom(VIEWPORT, 2, anchor, 16, LIMITS);

    // Assert
    expect([100 * viewport.scale + viewport.x, 50 * viewport.scale + viewport.y].map((value) => +value.toFixed(6))).toEqual([100, 50]);
  });

  it('should reach the target and report done after enough time', () => {
    // Act
    const step = stepZoom(VIEWPORT, 2, { x: 0, y: 0 }, 2000, LIMITS);

    // Assert
    expect([step.viewport.scale, step.isDone]).toEqual([2, true]);
  });

  it('should stop at the zoom limit when the target is beyond it', () => {
    // Act
    const step = stepZoom(VIEWPORT, 10, { x: 0, y: 0 }, 2000, LIMITS);

    // Assert
    expect(step.viewport.scale).toBe(3);
  });
});
