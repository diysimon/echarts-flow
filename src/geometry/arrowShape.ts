import type { ArrowType, Point } from '../types';

export interface ArrowGeometry {
  kind: 'polygon' | 'polyline' | 'circle';
  points: number[][];
  center: Point;
  radius: number;
  isFilled: boolean;
  /** How far the line must stop short of the endpoint so it doesn't run through the arrow. */
  inset: number;
}

const TRIANGLE_WIDTH_RATIO = 0.8;
const VEE_WIDTH_RATIO = 0.9;
const VEE_LENGTH_RATIO = 0.6;
const CIRCLE_RADIUS_RATIO = 0.4;
const DIAMOND_LENGTH_RATIO = 1.4;
const DIAMOND_WIDTH_RATIO = 0.7;

/** Point `distance` back from `tip` along the arrow direction, shifted sideways by `offset`. */
function calcAlong(tip: Point, angle: number, distance: number, offset = 0): number[] {
  return [
    tip.x - Math.cos(angle) * distance + Math.sin(angle) * offset,
    tip.y - Math.sin(angle) * distance - Math.cos(angle) * offset,
  ];
}

/** Geometry of an arrowhead whose tip sits on `tip`, pointing away from `from`. */
export function calcArrowGeometry(type: ArrowType, from: Point, tip: Point, size: number): ArrowGeometry | null {
  if (type === 'none') {
    return null;
  }
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const isFilled = !type.endsWith('-open') && type !== 'vee';
  const empty = { points: [], center: tip, radius: 0 };

  if (type === 'circle' || type === 'circle-open') {
    const radius = size * CIRCLE_RADIUS_RATIO;
    const [cx, cy] = calcAlong(tip, angle, radius);
    return { ...empty, kind: 'circle', center: { x: cx, y: cy }, radius, isFilled, inset: radius * 2 };
  }
  if (type === 'vee') {
    const halfWidth = (size * VEE_WIDTH_RATIO) / 2;
    const length = size * VEE_LENGTH_RATIO;
    const points = [calcAlong(tip, angle, length, halfWidth), [tip.x, tip.y], calcAlong(tip, angle, length, -halfWidth)];
    return { ...empty, kind: 'polyline', points, isFilled: false, inset: 0 };
  }
  if (type === 'diamond' || type === 'diamond-open') {
    const length = size * DIAMOND_LENGTH_RATIO;
    const halfWidth = (size * DIAMOND_WIDTH_RATIO) / 2;
    const points = [
      [tip.x, tip.y],
      calcAlong(tip, angle, length / 2, halfWidth),
      calcAlong(tip, angle, length),
      calcAlong(tip, angle, length / 2, -halfWidth),
    ];
    return { ...empty, kind: 'polygon', points, isFilled, inset: length };
  }
  const halfWidth = (size * TRIANGLE_WIDTH_RATIO) / 2;
  const points = [[tip.x, tip.y], calcAlong(tip, angle, size, halfWidth), calcAlong(tip, angle, size, -halfWidth)];
  return { ...empty, kind: 'polygon', points, isFilled, inset: size };
}
