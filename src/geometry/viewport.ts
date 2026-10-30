import type { Point, ResolvedNode, Viewport } from '../types';

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
const FIT_PADDING = 40;

export interface ZoomLimits {
  min: number;
  max: number;
}

const DEFAULT_ZOOM_LIMITS: ZoomLimits = { min: MIN_SCALE, max: MAX_SCALE };

export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

export function toScreen(viewport: Viewport, point: Point): Point {
  return { x: point.x * viewport.scale + viewport.x, y: point.y * viewport.scale + viewport.y };
}

export function toWorld(viewport: Viewport, point: Point): Point {
  return { x: (point.x - viewport.x) / viewport.scale, y: (point.y - viewport.y) / viewport.scale };
}

export function clampScale(scale: number, limits: ZoomLimits = DEFAULT_ZOOM_LIMITS): number {
  return Math.min(limits.max, Math.max(limits.min, scale));
}

/** Zooms while keeping the world point under `anchor` (screen pixels) fixed. */
export function zoomAt(viewport: Viewport, anchor: Point, factor: number, limits: ZoomLimits = DEFAULT_ZOOM_LIMITS): Viewport {
  const scale = clampScale(viewport.scale * factor, limits);
  const world = toWorld(viewport, anchor);
  return { scale, x: anchor.x - world.x * scale, y: anchor.y - world.y * scale };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function calcNodesBounds(nodes: ResolvedNode[]): Bounds | null {
  if (nodes.length === 0) {
    return null;
  }
  return nodes.reduce<Bounds>(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.x - node.width / 2),
      minY: Math.min(bounds.minY, node.y - node.height / 2),
      maxX: Math.max(bounds.maxX, node.x + node.width / 2),
      maxY: Math.max(bounds.maxY, node.y + node.height / 2),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

/** Bounds of top-left based rectangles, such as lanes and the title bar. */
export function calcRectsBounds(rects: { x: number; y: number; width: number; height: number }[]): Bounds | null {
  if (rects.length === 0) {
    return null;
  }
  return {
    minX: Math.min(...rects.map((rect) => rect.x)),
    minY: Math.min(...rects.map((rect) => rect.y)),
    maxX: Math.max(...rects.map((rect) => rect.x + rect.width)),
    maxY: Math.max(...rects.map((rect) => rect.y + rect.height)),
  };
}

export function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a || !b) {
    return a ?? b;
  }
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
}

/** World area shown in a view of the given pixel size, grown by `marginRatio` view sizes on every side. */
export function calcViewBounds(viewport: Viewport, width: number, height: number, marginRatio = 0): Bounds {
  const topLeft = toWorld(viewport, { x: -width * marginRatio, y: -height * marginRatio });
  const bottomRight = toWorld(viewport, { x: width * (1 + marginRatio), y: height * (1 + marginRatio) });
  return { minX: topLeft.x, minY: topLeft.y, maxX: bottomRight.x, maxY: bottomRight.y };
}

export function isBoundsInside(inner: Bounds, outer: Bounds): boolean {
  return inner.minX >= outer.minX && inner.minY >= outer.minY && inner.maxX <= outer.maxX && inner.maxY <= outer.maxY;
}

export function isBoundsOverlapping(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** Share of the `target` area that `cover` overlaps, from 0 to 1. */
export function calcCoveredShare(target: Bounds, cover: Bounds): number {
  const width = Math.max(0, Math.min(target.maxX, cover.maxX) - Math.max(target.minX, cover.minX));
  const height = Math.max(0, Math.min(target.maxY, cover.maxY) - Math.max(target.minY, cover.minY));
  const area = (target.maxX - target.minX) * (target.maxY - target.minY);
  return area > 0 ? (width * height) / area : 0;
}

/** Viewport that centers the bounds; never zooms in past 1:1 so small graphs stay readable. */
export function fitBounds(
  bounds: Bounds | null,
  width: number,
  height: number,
  padding: number = FIT_PADDING,
  limits: ZoomLimits = DEFAULT_ZOOM_LIMITS,
): Viewport {
  if (!bounds) {
    return { x: width / 2, y: height / 2, scale: clampScale(1, limits) };
  }
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const fitScale = Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight);
  const scale = clampScale(Math.min(fitScale, 1), limits);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return { scale, x: width / 2 - centerX * scale, y: height / 2 - centerY * scale };
}
