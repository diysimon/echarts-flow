import type { Point, Viewport } from '../types';
import { toScreen } from '../geometry/viewport';

/**
 * Canvas centers strokes on the coordinate, so an odd line width needs a
 * half-pixel offset to cover whole pixels instead of blurring across two.
 */
export function alignToPixel(value: number, lineWidth: number): number {
  const rounded = Math.round(value);
  return Math.round(lineWidth) % 2 === 1 ? rounded + 0.5 : rounded;
}

/** Projects a world point to screen pixels, aligned for the given stroke width. */
export function projectPoint(viewport: Viewport, point: Point, lineWidth: number): Point {
  const screen = toScreen(viewport, point);
  return { x: alignToPixel(screen.x, lineWidth), y: alignToPixel(screen.y, lineWidth) };
}
