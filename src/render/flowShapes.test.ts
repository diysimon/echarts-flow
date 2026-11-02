import { graphic } from 'echarts/core';
import { EDGE_LINE_SHAPE, registerFlowShapes } from './flowShapes';

function createTracer() {
  return { moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), bezierCurveTo: vi.fn() };
}

function buildPath(shape: object) {
  registerFlowShapes();
  const ShapeClass = graphic.getShapeClass(EDGE_LINE_SHAPE) as unknown as new () => {
    buildPath(ctx: unknown, shape: object): void;
  };
  const tracer = createTracer();
  new ShapeClass().buildPath(tracer, shape);
  return tracer;
}

describe('flowShapes', () => {
  it('should round corners when the points form a polyline', () => {
    // Act
    const tracer = buildPath({ points: [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 50, y: 50 }], radius: 8, isCurve: false });

    // Assert
    expect(tracer.quadraticCurveTo).toHaveBeenCalledWith(0, 50, 8, 50);
  });

  it('should draw one cubic bezier when the shape is a curve', () => {
    // Act
    const tracer = buildPath({ points: [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 100 }], radius: 0, isCurve: true });

    // Assert
    expect(tracer.bezierCurveTo).toHaveBeenCalledWith(0, 50, 100, 50, 100, 100);
  });

  it('should draw nothing when there are fewer than two points', () => {
    // Act
    const tracer = buildPath({ points: [{ x: 0, y: 0 }], radius: 0, isCurve: false });

    // Assert
    expect(tracer.moveTo).not.toHaveBeenCalled();
  });
});
