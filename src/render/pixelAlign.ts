import type { Point, Viewport } from '../types';
import { toScreen } from '../geometry/viewport';

/**
 * Snapping works on the device pixel grid. Coordinates stay in CSS pixels, so
 * with a ratio of 2 a "pixel" is half a CSS pixel, and with 1.8 (90% browser
 * zoom) it is 1/1.8 of one. Snapping to whole CSS pixels at a fractional
 * ratio would put every edge between two device pixels and blur it.
 */
export function snapToPixel(value: number, ratio = 1): number {
  return Math.round(value * ratio) / ratio;
}

/** Stroke width rounded to whole device pixels, at least one. */
export function snapLineWidth(lineWidth: number, ratio = 1): number {
  return Math.max(Math.round(lineWidth * ratio), 1) / ratio;
}

/**
 * Canvas centers strokes on the coordinate, so a stroke an odd number of
 * device pixels wide needs a half-pixel offset to cover whole pixels instead
 * of blurring across two.
 */
export function alignToPixel(value: number, lineWidth: number, ratio = 1): number {
  const devicePixels = Math.round(value * ratio);
  const deviceWidth = Math.max(Math.round(lineWidth * ratio), 1);
  return (deviceWidth % 2 === 1 ? devicePixels + 0.5 : devicePixels) / ratio;
}

/** Projects a world point to screen pixels, aligned for the given stroke width. */
export function projectPoint(viewport: Viewport, point: Point, lineWidth: number, ratio = 1): Point {
  const screen = toScreen(viewport, point);
  return { x: alignToPixel(screen.x, lineWidth, ratio), y: alignToPixel(screen.y, lineWidth, ratio) };
}

/**
 * Text centered on a whole pixel puts line i at (i - (n - 1) / 2) * lineHeight,
 * which is a half pixel off for an even line count and odd line height.
 * An even line height in device pixels keeps every line on whole pixels, so
 * glyphs are not smeared across two pixel rows.
 */
export function snapLineHeight(lineHeight: number, ratio = 1): number {
  return Math.max(Math.round((lineHeight * ratio) / 2) * 2, 2) / ratio;
}
