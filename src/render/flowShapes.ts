import { graphic } from 'echarts/core';
import type { FlowNodeShape, Point } from '../types';
import { traceCurvePath, traceRoundedPath } from '../geometry/edgePath';
import { traceShapeDecorations, traceShapeOutline } from '../geometry/nodeShape';
import { traceEllipse, tracePolygon, traceRoundedRect, type PathTracer } from '../geometry/pathTracer';

/**
 * Element types registered with ECharts, used as `type` in renderItem output.
 * They draw from numbers instead of SVG path data: a changed path string makes
 * ECharts throw the element away and parse a new one, so every zoom rebuilt
 * all of them. Shape props are updated in place.
 */
export const EDGE_LINE_SHAPE = 'flowEdgeLine';
export const NODE_OUTLINE_SHAPE = 'flowNodeOutline';
export const NODE_DECORATION_SHAPE = 'flowNodeDecoration';

export interface EdgeLineShape {
  points: Point[];
  /** Corner radius in the same units as the points; ignored for curves. */
  radius: number;
  /** Points are [start, handle1, handle2, end] of one cubic bezier. */
  isCurve: boolean;
}

/** A curved node outline or its decoration lines, centered at (0, 0). */
export interface NodeShapeProps {
  shape: FlowNodeShape;
  width: number;
  height: number;
}

export function traceEdgeLine(tracer: PathTracer, shape: EdgeLineShape): void {
  if (shape.points.length < 2) {
    return;
  }
  if (shape.isCurve) {
    traceCurvePath(tracer, shape.points);
  } else {
    traceRoundedPath(tracer, shape.points, shape.radius);
  }
}

/**
 * Traces any element type the flow series emit, from its renderItem `shape`.
 * Returns false for types it cannot trace, such as SVG path data.
 */
export function traceElementShape(tracer: PathTracer, type: string, shape: Record<string, unknown>): boolean {
  switch (type) {
    case EDGE_LINE_SHAPE:
      traceEdgeLine(tracer, shape as unknown as EdgeLineShape);
      return true;
    case NODE_OUTLINE_SHAPE: {
      const props = shape as unknown as NodeShapeProps;
      traceShapeOutline(tracer, props.shape, props.width, props.height);
      return true;
    }
    case NODE_DECORATION_SHAPE: {
      const props = shape as unknown as NodeShapeProps;
      traceShapeDecorations(tracer, props.shape, props.width, props.height);
      return true;
    }
    case 'rect': {
      const { x, y, width, height, r } = shape as { x: number; y: number; width: number; height: number; r?: number };
      traceRoundedRect(tracer, x, y, width, height, r ?? 0);
      return true;
    }
    case 'polygon':
    case 'polyline':
      tracePolygon(tracer, shape.points as number[][], type === 'polygon');
      return true;
    case 'ellipse': {
      const { cx, cy, rx, ry } = shape as { cx: number; cy: number; rx: number; ry: number };
      traceEllipse(tracer, { x: cx, y: cy }, rx, ry);
      return true;
    }
    case 'circle': {
      const { cx, cy, r } = shape as { cx: number; cy: number; r: number };
      traceEllipse(tracer, { x: cx, y: cy }, r, r);
      return true;
    }
    default:
      return false;
  }
}

const EdgeLinePath = graphic.extendShape({
  type: EDGE_LINE_SHAPE,
  shape: { points: [] as Point[], radius: 0, isCurve: false },
  buildPath(ctx: PathTracer, shape: EdgeLineShape) {
    traceEdgeLine(ctx, shape);
  },
});

const NodeOutlinePath = graphic.extendShape({
  type: NODE_OUTLINE_SHAPE,
  shape: { shape: 'process' as FlowNodeShape, width: 0, height: 0 },
  buildPath(ctx: PathTracer, shape: NodeShapeProps) {
    traceShapeOutline(ctx, shape.shape, shape.width, shape.height);
  },
});

const NodeDecorationPath = graphic.extendShape({
  type: NODE_DECORATION_SHAPE,
  shape: { shape: 'process' as FlowNodeShape, width: 0, height: 0 },
  buildPath(ctx: PathTracer, shape: NodeShapeProps) {
    traceShapeDecorations(ctx, shape.shape, shape.width, shape.height);
  },
});

let isRegistered = false;

export function registerFlowShapes(): void {
  if (isRegistered) {
    return;
  }
  graphic.registerShape(EDGE_LINE_SHAPE, EdgeLinePath);
  graphic.registerShape(NODE_OUTLINE_SHAPE, NodeOutlinePath);
  graphic.registerShape(NODE_DECORATION_SHAPE, NodeDecorationPath);
  isRegistered = true;
}
