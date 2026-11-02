import type { Point } from '../types';

/**
 * The path commands shapes need. Canvas contexts and zrender path proxies
 * implement it, so one trace function serves registered shapes, batched
 * drawing and SVG path data.
 */
export interface PathTracer {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  closePath(): void;
}

/** Control point distance for a quarter ellipse drawn as one cubic bezier. */
const QUARTER_ELLIPSE_KAPPA = 0.5523;

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function formatPair(x: number, y: number): string {
  return `${formatNumber(x)},${formatNumber(y)}`;
}

/** Collects the commands as SVG path data. */
class PathDataRecorder implements PathTracer {
  private readonly commands: string[] = [];

  moveTo(x: number, y: number): void {
    this.commands.push(`M${formatPair(x, y)}`);
  }

  lineTo(x: number, y: number): void {
    this.commands.push(`L${formatPair(x, y)}`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.commands.push(`Q${formatPair(cpx, cpy)} ${formatPair(x, y)}`);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.commands.push(`C${formatPair(cp1x, cp1y)} ${formatPair(cp2x, cp2y)} ${formatPair(x, y)}`);
  }

  closePath(): void {
    this.commands.push('Z');
  }

  toString(): string {
    return this.commands.join(' ');
  }
}

/** SVG path data for whatever `trace` draws. */
export function recordPathData(trace: (tracer: PathTracer) => void): string {
  const recorder = new PathDataRecorder();
  trace(recorder);
  return recorder.toString();
}

/** Forwards commands moved by an offset, so shapes traced around (0, 0) land anywhere. */
export class OffsetTracer implements PathTracer {
  private target: PathTracer | null = null;
  private dx = 0;
  private dy = 0;

  reset(target: PathTracer, dx: number, dy: number): this {
    this.target = target;
    this.dx = dx;
    this.dy = dy;
    return this;
  }

  moveTo(x: number, y: number): void {
    this.target?.moveTo(x + this.dx, y + this.dy);
  }

  lineTo(x: number, y: number): void {
    this.target?.lineTo(x + this.dx, y + this.dy);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.target?.quadraticCurveTo(cpx + this.dx, cpy + this.dy, x + this.dx, y + this.dy);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    const { dx, dy } = this;
    this.target?.bezierCurveTo(cp1x + dx, cp1y + dy, cp2x + dx, cp2y + dy, x + dx, y + dy);
  }

  closePath(): void {
    this.target?.closePath();
  }
}

/**
 * Half of an axis-aligned ellipse from its left end to its right end, or back
 * when `isLeftToRight` is false, bulging up or down. Continues the current
 * path, so the caller moves to the start point first.
 */
export function traceHalfEllipse(
  tracer: PathTracer,
  center: Point,
  rx: number,
  ry: number,
  isLeftToRight: boolean,
  isUpper: boolean,
): void {
  const k = QUARTER_ELLIPSE_KAPPA;
  const sign = isUpper ? -1 : 1;
  const startX = isLeftToRight ? -rx : rx;
  const apexY = center.y + sign * ry;
  tracer.bezierCurveTo(center.x + startX, center.y + sign * ry * k, center.x + startX * k, apexY, center.x, apexY);
  tracer.bezierCurveTo(center.x - startX * k, apexY, center.x - startX, center.y + sign * ry * k, center.x - startX, center.y);
}

/** Full ellipse as two halves, closed. */
export function traceEllipse(tracer: PathTracer, center: Point, rx: number, ry: number): void {
  tracer.moveTo(center.x - rx, center.y);
  traceHalfEllipse(tracer, center, rx, ry, true, true);
  traceHalfEllipse(tracer, center, rx, ry, false, false);
  tracer.closePath();
}

/** Rectangle with all corners rounded by `radius`, clamped to half the shorter side. */
export function traceRoundedRect(tracer: PathTracer, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;
  tracer.moveTo(x + r, y);
  tracer.lineTo(right - r, y);
  traceCorner(tracer, { x: right - r, y }, { x: right, y }, { x: right, y: y + r });
  tracer.lineTo(right, bottom - r);
  traceCorner(tracer, { x: right, y: bottom - r }, { x: right, y: bottom }, { x: right - r, y: bottom });
  tracer.lineTo(x + r, bottom);
  traceCorner(tracer, { x: x + r, y: bottom }, { x, y: bottom }, { x, y: bottom - r });
  tracer.lineTo(x, y + r);
  traceCorner(tracer, { x, y: y + r }, { x, y }, { x: x + r, y });
  tracer.closePath();
}

/** Quarter circle from `from` to `to` around `corner`, as one cubic bezier. Skipped when the radius is 0. */
function traceCorner(tracer: PathTracer, from: Point, corner: Point, to: Point): void {
  if (from.x === to.x && from.y === to.y) {
    return;
  }
  const k = QUARTER_ELLIPSE_KAPPA;
  tracer.bezierCurveTo(
    from.x + (corner.x - from.x) * k,
    from.y + (corner.y - from.y) * k,
    to.x + (corner.x - to.x) * k,
    to.y + (corner.y - to.y) * k,
    to.x,
    to.y,
  );
}

/** Polygon or polyline through `points` given as [x, y] pairs. */
export function tracePolygon(tracer: PathTracer, points: number[][], isClosed: boolean): void {
  points.forEach(([x, y], index) => (index === 0 ? tracer.moveTo(x, y) : tracer.lineTo(x, y)));
  if (isClosed && points.length > 2) {
    tracer.closePath();
  }
}
