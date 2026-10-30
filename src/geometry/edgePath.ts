import type { Point } from '../types';

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function formatPoint(point: Point): string {
  return `${formatNumber(point.x)},${formatNumber(point.y)}`;
}

function moveTowards(from: Point, to: Point, distance: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) {
    return from;
  }
  const ratio = distance / length;
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
}

/** The path commands edges need; met by canvas contexts, zrender path proxies and the string recorder below. */
export interface PathTracer {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
}

/** Collects the commands as SVG path data. */
class PathDataRecorder implements PathTracer {
  private readonly commands: string[] = [];

  moveTo(x: number, y: number): void {
    this.commands.push(`M${formatPoint({ x, y })}`);
  }

  lineTo(x: number, y: number): void {
    this.commands.push(`L${formatPoint({ x, y })}`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.commands.push(`Q${formatPoint({ x: cpx, y: cpy })} ${formatPoint({ x, y })}`);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.commands.push(`C${formatPoint({ x: cp1x, y: cp1y })} ${formatPoint({ x: cp2x, y: cp2y })} ${formatPoint({ x, y })}`);
  }

  toString(): string {
    return this.commands.join(' ');
  }
}

/**
 * Traces a polyline whose corners are rounded with quadratic curves.
 * The radius shrinks on short segments so curves never overlap.
 */
export function traceRoundedPath(tracer: PathTracer, points: Point[], radius: number): void {
  if (points.length === 0) {
    return;
  }
  tracer.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const maxRadius = Math.min(
      Math.hypot(corner.x - prev.x, corner.y - prev.y) / 2,
      Math.hypot(next.x - corner.x, next.y - corner.y) / 2,
    );
    const cornerRadius = Math.min(radius, maxRadius);
    if (cornerRadius <= 0) {
      tracer.lineTo(corner.x, corner.y);
      continue;
    }
    const start = moveTowards(corner, prev, cornerRadius);
    const end = moveTowards(corner, next, cornerRadius);
    tracer.lineTo(start.x, start.y);
    tracer.quadraticCurveTo(corner.x, corner.y, end.x, end.y);
  }
  if (points.length > 1) {
    const last = points[points.length - 1];
    tracer.lineTo(last.x, last.y);
  }
}

/** Traces one cubic bezier given as [start, handle1, handle2, end]. */
export function traceCurvePath(tracer: PathTracer, points: Point[]): void {
  const [start, handle1, handle2, end] = points;
  tracer.moveTo(start.x, start.y);
  tracer.bezierCurveTo(handle1.x, handle1.y, handle2.x, handle2.y, end.x, end.y);
}

/** SVG path data for {@link traceRoundedPath}. */
export function buildRoundedPath(points: Point[], radius: number): string {
  const recorder = new PathDataRecorder();
  traceRoundedPath(recorder, points, radius);
  return recorder.toString();
}

/** SVG path data for {@link traceCurvePath}. */
export function buildCurvePath(points: Point[]): string {
  const recorder = new PathDataRecorder();
  traceCurvePath(recorder, points);
  return recorder.toString();
}

export function calcBezierPoint(points: Point[], t: number): Point {
  const [p0, p1, p2, p3] = points;
  const u = 1 - t;
  const calc = (a: number, b: number, c: number, d: number) => u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  return { x: calc(p0.x, p1.x, p2.x, p3.x), y: calc(p0.y, p1.y, p2.y, p3.y) };
}

/** Moves the last point back along the last segment, e.g. so the line ends at an arrow base. */
export function shortenEnd(points: Point[], distance: number): Point[] {
  if (points.length < 2 || distance <= 0) {
    return points;
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const segmentLength = Math.hypot(last.x - prev.x, last.y - prev.y);
  return [...points.slice(0, -1), moveTowards(last, prev, Math.min(distance, segmentLength))];
}

export function shortenStart(points: Point[], distance: number): Point[] {
  return shortenEnd([...points].reverse(), distance).reverse();
}
