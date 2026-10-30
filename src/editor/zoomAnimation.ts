import type { Point, Viewport } from '../types';
import { clampScale, zoomAt, type ZoomLimits } from '../geometry/viewport';

/** Time for the eased zoom to cover about 63% of the remaining distance. */
const ZOOM_EASE_TIME = 70;
/** Below this log-scale distance the zoom snaps to its target and stops. */
const ZOOM_DONE_DISTANCE = 0.002;
/** A mouse wheel in line mode reports notches as lines; one line is about this many pixels. */
const LINE_HEIGHT_PIXELS = 25;
const PAGE_HEIGHT_PIXELS = 500;
/** Trackpad pinches arrive as ctrl + wheel with small deltas, so they need a boost. */
const PINCH_SPEEDUP = 10;
/** Caps one wheel event at a factor of about e^0.4 = 1.5, so a fast flick can't jump wildly. */
const MAX_STEP_LOG = 0.4;

interface WheelLike {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}

/**
 * Zoom factor for one wheel event. Deltas are normalized across pixel, line
 * and page modes, pinch gestures are sped up, and each event is capped.
 */
export function calcWheelZoomFactor(event: WheelLike, speed: number): number {
  const modeScale = event.deltaMode === 1 ? LINE_HEIGHT_PIXELS : event.deltaMode === 2 ? PAGE_HEIGHT_PIXELS : 1;
  const pixels = event.deltaY * modeScale * (event.ctrlKey ? PINCH_SPEEDUP : 1);
  const step = Math.max(-MAX_STEP_LOG, Math.min(MAX_STEP_LOG, -pixels * speed));
  return Math.exp(step);
}

export interface ZoomStep {
  viewport: Viewport;
  isDone: boolean;
}

/**
 * Moves the scale part of the way toward `targetScale`, in log space so
 * zooming in and out feel the same, keeping the screen point `anchor` fixed.
 * Frame-rate independent: the share covered depends on elapsed time.
 */
export function stepZoom(viewport: Viewport, targetScale: number, anchor: Point, elapsedMs: number, limits: ZoomLimits): ZoomStep {
  const target = clampScale(targetScale, limits);
  const distance = Math.log(target) - Math.log(viewport.scale);
  const share = 1 - Math.exp(-Math.max(elapsedMs, 0) / ZOOM_EASE_TIME);
  const remaining = distance * (1 - share);
  const isDone = Math.abs(remaining) < ZOOM_DONE_DISTANCE;
  const nextScale = isDone ? target : target / Math.exp(remaining);
  return { viewport: zoomAt(viewport, anchor, nextScale / viewport.scale, limits), isDone };
}
