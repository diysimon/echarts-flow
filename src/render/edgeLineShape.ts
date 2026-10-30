import { graphic } from 'echarts/core';
import type { Point } from '../types';
import { traceCurvePath, traceRoundedPath, type PathTracer } from '../geometry/edgePath';

/** Registered element type for edge lines; use it as `type` in renderItem output. */
export const EDGE_LINE_SHAPE = 'flowEdgeLine';

export interface EdgeLineShape {
  points: Point[];
  /** Corner radius in the same units as the points; ignored for curves. */
  radius: number;
  /** Points are [start, handle1, handle2, end] of one cubic bezier. */
  isCurve: boolean;
}

/**
 * Draws edge lines from their points instead of SVG path data. A changed path
 * string makes ECharts throw the element away and parse a new one, so every
 * zoom rebuilt all edges; shape props are updated in place.
 */
const EdgeLinePath = graphic.extendShape({
  type: EDGE_LINE_SHAPE,
  shape: { points: [] as Point[], radius: 0, isCurve: false },
  buildPath(ctx: PathTracer, shape: EdgeLineShape) {
    if (shape.points.length < 2) {
      return;
    }
    if (shape.isCurve) {
      traceCurvePath(ctx, shape.points);
    } else {
      traceRoundedPath(ctx, shape.points, shape.radius);
    }
  },
});

let isRegistered = false;

export function registerEdgeLineShape(): void {
  if (!isRegistered) {
    graphic.registerShape(EDGE_LINE_SHAPE, EdgeLinePath);
    isRegistered = true;
  }
}
