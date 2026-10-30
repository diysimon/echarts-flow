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

/**
 * SVG path data for a polyline whose corners are rounded with quadratic curves.
 * The radius shrinks on short segments so curves never overlap.
 */
export function buildRoundedPath(points: Point[], radius: number): string {
  if (points.length === 0) {
    return '';
  }
  const commands = [`M${formatPoint(points[0])}`];
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
      commands.push(`L${formatPoint(corner)}`);
      continue;
    }
    commands.push(`L${formatPoint(moveTowards(corner, prev, cornerRadius))}`);
    commands.push(`Q${formatPoint(corner)} ${formatPoint(moveTowards(corner, next, cornerRadius))}`);
  }
  if (points.length > 1) {
    commands.push(`L${formatPoint(points[points.length - 1])}`);
  }
  return commands.join(' ');
}

/** SVG path data for one cubic bezier given as [start, handle1, handle2, end]. */
export function buildCurvePath(points: Point[]): string {
  const [start, handle1, handle2, end] = points;
  return `M${formatPoint(start)} C${formatPoint(handle1)} ${formatPoint(handle2)} ${formatPoint(end)}`;
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
