import { OffsetTracer, recordPathData, traceEllipse, tracePolygon, traceRoundedRect, type PathTracer } from './pathTracer';

function createRecorder() {
  const calls: string[] = [];
  const tracer: PathTracer = {
    moveTo: (x, y) => calls.push(`M${x},${y}`),
    lineTo: (x, y) => calls.push(`L${x},${y}`),
    quadraticCurveTo: (cx, cy, x, y) => calls.push(`Q${cx},${cy},${x},${y}`),
    bezierCurveTo: (a, b, c, d, x, y) => calls.push(`C${a},${b},${c},${d},${x},${y}`),
    closePath: () => calls.push('Z'),
  };
  return { tracer, calls };
}

describe('recordPathData', () => {
  it('should emit SVG commands for the traced path', () => {
    // Act
    const data = recordPathData((tracer) => {
      tracer.moveTo(0, 0);
      tracer.lineTo(10, 0);
    });

    // Assert
    expect(data).toBe('M0,0 L10,0');
  });
});

describe('traceRoundedRect', () => {
  it('should round every corner with a cubic when the radius is positive', () => {
    // Act
    const data = recordPathData((tracer) => traceRoundedRect(tracer, 0, 0, 100, 60, 8));

    // Assert
    expect(data.match(/C/g)).toHaveLength(4);
  });

  it('should draw a plain rectangle with no curves when the radius is zero', () => {
    // Act
    const data = recordPathData((tracer) => traceRoundedRect(tracer, 0, 0, 100, 60, 0));

    // Assert
    expect(data).not.toContain('C');
  });

  it('should clamp the radius to half the shorter side', () => {
    // Act: radius 999 on a 40-tall rect becomes 20, so the top edge has no straight run
    const { tracer, calls } = createRecorder();
    traceRoundedRect(tracer, 0, 0, 100, 40, 999);

    // Assert: first line goes to x = 100 - 20 = 80
    expect(calls[1]).toBe('L80,0');
  });
});

describe('traceEllipse', () => {
  it('should draw the full ellipse as four cubics and close', () => {
    // Act
    const data = recordPathData((tracer) => traceEllipse(tracer, { x: 0, y: 0 }, 10, 6));

    // Assert
    expect(data.match(/C/g)).toHaveLength(4);
    expect(data.endsWith('Z')).toBe(true);
  });
});

describe('tracePolygon', () => {
  it('should close the path when the polygon is closed', () => {
    // Act
    const { tracer, calls } = createRecorder();
    tracePolygon(tracer, [[0, 0], [10, 0], [10, 10]], true);

    // Assert
    expect(calls).toEqual(['M0,0', 'L10,0', 'L10,10', 'Z']);
  });

  it('should leave the path open when it is a polyline', () => {
    // Act
    const { tracer, calls } = createRecorder();
    tracePolygon(tracer, [[0, 0], [10, 0], [10, 10]], false);

    // Assert
    expect(calls).not.toContain('Z');
  });
});

describe('OffsetTracer', () => {
  it('should forward every command shifted by the offset', () => {
    // Arrange
    const { tracer, calls } = createRecorder();
    const offset = new OffsetTracer().reset(tracer, 5, 3);

    // Act
    offset.moveTo(0, 0);
    offset.lineTo(10, 10);
    offset.quadraticCurveTo(1, 1, 2, 2);

    // Assert
    expect(calls).toEqual(['M5,3', 'L15,13', 'Q6,4,7,5']);
  });
});
