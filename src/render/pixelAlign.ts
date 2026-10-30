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

/**
 * Text centered on a whole pixel puts line i at (i - (n - 1) / 2) * lineHeight,
 * which is a half pixel off for an even line count and odd line height.
 * An even line height keeps every line on whole pixels, so glyphs are not
 * smeared across two pixel rows.
 */
export function snapLineHeight(lineHeight: number): number {
  return Math.max(Math.round(lineHeight / 2) * 2, 2);
}
