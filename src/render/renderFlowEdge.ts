import type { CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { ArrowType, Point } from '../types';
import { calcArrowGeometry } from '../geometry/arrowShape';
import { buildCurvePath, buildRoundedPath, shortenEnd, shortenStart } from '../geometry/edgePath';
import { EDGE_HIT_WIDTH } from '../theme/flowStyle';
import type { FlowTheme } from '../theme/flowTheme';
import type { FlowEdgePayload, FlowHitInfo, RenderedEdge } from './flowPayload';
import { projectPoint } from './pixelAlign';
import type { ElementOption } from './renderFlowNode';

/** Running dashes are in screen pixels so the flow speed looks the same at every zoom. */
const RUNNING_DASH = [6, 4];
/** One full dash cycle, so the loop restarts seamlessly. */
const DASH_CYCLE = RUNNING_DASH[0] + RUNNING_DASH[1];
const FLOW_ANIMATION_DURATION = 600;
const LABEL_PADDING = [2, 6];
/** Keeps arrows visible when zoomed far out. */
const MIN_ARROW_SIZE = 5;

interface EdgeView {
  edge: RenderedEdge;
  theme: FlowTheme;
  scale: number;
  color: string;
  lineWidth: number;
}

function calcEdgeColor(edge: RenderedEdge, isSelected: boolean, theme: FlowTheme): string {
  if (edge.isDraft || isSelected) {
    return theme.selected;
  }
  return edge.isRunning ? theme.status.running : edge.appearance.stroke;
}

function calcLineDash(edge: RenderedEdge, scale: number): number[] | undefined {
  if (edge.isDraft || edge.isRunning) {
    return RUNNING_DASH;
  }
  return edge.appearance.lineDash?.map((value) => value * scale);
}

function buildFlowAnimation(edge: RenderedEdge) {
  if (!edge.isRunning) {
    return undefined;
  }
  return {
    duration: FLOW_ANIMATION_DURATION,
    loop: true,
    keyframes: [
      { percent: 0, style: { lineDashOffset: DASH_CYCLE } },
      { percent: 1, style: { lineDashOffset: 0 } },
    ],
  };
}

function buildArrow(view: EdgeView, type: ArrowType, from: Point, tip: Point, name: string) {
  const size = Math.max(view.edge.appearance.arrowSize * view.scale, MIN_ARROW_SIZE);
  const geometry = calcArrowGeometry(type, from, tip, size);
  if (!geometry) {
    return { element: null, inset: 0 };
  }
  const style = {
    fill: geometry.isFilled ? view.color : 'none',
    stroke: view.color,
    lineWidth: geometry.isFilled ? 0 : view.lineWidth,
    lineJoin: 'round' as const,
    lineCap: 'round' as const,
    opacity: view.edge.appearance.opacity,
  };
  const base = { name, silent: true, style };
  const element: ElementOption = geometry.kind === 'circle'
    ? { ...base, type: 'circle', shape: { cx: geometry.center.x, cy: geometry.center.y, r: geometry.radius } }
    : { ...base, type: geometry.kind, shape: { points: geometry.points } };
  return { element, inset: geometry.inset };
}

function buildLabel(view: EdgeView, info: FlowHitInfo): ElementOption | null {
  const { edge, theme, scale } = view;
  if (!edge.label || edge.isDraft) {
    return null;
  }
  const { appearance } = edge;
  return {
    type: 'text',
    name: 'label',
    info,
    x: Math.round(edge.labelPosition.x * scale),
    y: Math.round(edge.labelPosition.y * scale),
    style: {
      text: edge.label,
      fill: appearance.labelColor,
      fontSize: appearance.labelFontSize * scale,
      fontFamily: theme.fontFamily,
      align: 'center',
      verticalAlign: 'middle',
      backgroundColor: appearance.labelBackground,
      borderColor: appearance.labelBorder,
      borderWidth: 1,
      borderRadius: theme.edge.labelRadius * scale,
      padding: LABEL_PADDING.map((value) => Math.round(value * scale)),
      opacity: appearance.opacity,
    },
  };
}

export function renderFlowEdge(params: CustomSeriesRenderItemParams): CustomSeriesRenderItemReturn {
  const payload = params.itemPayload as unknown as FlowEdgePayload;
  const edge = payload.edges[params.dataIndex];
  if (!edge || edge.points.length < 2) {
    return null;
  }
  const { viewport, theme } = payload;
  const { scale } = viewport;
  const { appearance } = edge;
  const isSelected = payload.selectedIds.includes(edge.id);
  const lineWidth = isSelected ? appearance.activeLineWidth : appearance.lineWidth;
  const view: EdgeView = { edge, theme, scale, color: calcEdgeColor(edge, isSelected, theme), lineWidth };
  const info: FlowHitInfo = { role: 'edge', edgeId: edge.id };

  // Project without the viewport offset; the group applies it as a whole pixel.
  const points = edge.points.map((point) => projectPoint({ ...viewport, x: 0, y: 0 }, point, lineWidth));
  const last = points.length - 1;
  const targetArrow = buildArrow(view, appearance.targetArrow, points[last - 1], points[last], 'arrow-target');
  const sourceArrow = buildArrow(view, appearance.sourceArrow, points[1], points[0], 'arrow-source');
  const linePoints = shortenStart(shortenEnd(points, targetArrow.inset), sourceArrow.inset);
  const pathData = edge.isCurve ? buildCurvePath(linePoints) : buildRoundedPath(linePoints, appearance.cornerRadius * scale);

  const lineElement = {
    type: 'path',
    name: 'line',
    silent: true,
    shape: { pathData },
    style: {
      fill: 'none',
      stroke: view.color,
      lineWidth,
      lineDash: calcLineDash(edge, scale),
      lineJoin: 'round',
      opacity: appearance.opacity,
    },
    keyframeAnimation: buildFlowAnimation(edge),
    // ECharts typings demand `shape` in every keyframe; style-only keyframes work at runtime.
  } as ElementOption;

  const children: (ElementOption | null)[] = [
    // Invisible wide stroke so thin edges are easy to click.
    edge.isDraft
      ? null
      : {
        type: 'path',
        name: 'hit',
        info,
        shape: { pathData },
        style: { fill: 'none', stroke: 'transparent', lineWidth: EDGE_HIT_WIDTH },
      },
    lineElement,
    targetArrow.element,
    sourceArrow.element,
    buildLabel(view, info),
  ];

  return {
    type: 'group',
    // Integer offset keeps the half-pixel alignment of the projected points.
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    emphasisDisabled: true,
    silent: edge.isDraft,
    children: children.filter((child): child is ElementOption => child !== null),
  };
}
