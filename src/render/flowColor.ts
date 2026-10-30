import type { FlowColor } from '../types';

export interface ZrLinearGradient {
  type: 'linear';
  x: number;
  y: number;
  x2: number;
  y2: number;
  colorStops: { offset: number; color: string }[];
  global: false;
}

export interface ZrRadialGradient {
  type: 'radial';
  x: number;
  y: number;
  r: number;
  colorStops: { offset: number; color: string }[];
  global: false;
}

export type ZrColor = string | ZrLinearGradient | ZrRadialGradient;

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Converts a theme color into what zrender paints. Gradients are relative to
 * the element's bounding box, so one definition fits nodes of any size.
 */
export function toZrColor(color: FlowColor): ZrColor {
  if (typeof color === 'string') {
    return color;
  }
  const colorStops = color.stops.map((stop) => ({ offset: stop.offset, color: stop.color }));
  if (color.type === 'radial') {
    return { type: 'radial', x: 0.5, y: 0.5, r: 0.5, colorStops, global: false };
  }
  const angle = (color.angle ?? 0) * DEGREES_TO_RADIANS;
  const dx = Math.cos(angle) / 2;
  const dy = Math.sin(angle) / 2;
  return { type: 'linear', x: 0.5 - dx, y: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy, colorStops, global: false };
}

/** Builds a linear gradient for theme definitions. */
export function linearGradient(angle: number, ...colors: string[]): FlowColor {
  const lastIndex = Math.max(colors.length - 1, 1);
  return { type: 'linear', angle, stops: colors.map((color, index) => ({ offset: index / lastIndex, color })) };
}

export function isTransparent(color: FlowColor): boolean {
  return color === 'transparent' || color === 'none';
}
