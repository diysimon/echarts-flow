import type { Point } from '../types';
import { recordPathData, type PathTracer } from './pathTracer';

function moveTowards(from: Point, to: Point, distance: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) {
    return from;
  }
  const ratio = distance / length;
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
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
  return recordPathData((tracer) => traceRoundedPath(tracer, points, radius));
}

/** SVG path data for {@link traceCurvePath}. */
export function buildCurvePath(points: Point[]): string {
  return recordPathData((tracer) => traceCurvePath(tracer, points));
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
