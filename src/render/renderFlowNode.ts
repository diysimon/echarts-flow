import type { CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { PortSide, ResolvedNode } from '../types';
import { getPortOffset, getShapeDecorations, getShapePath, getShapePolygon, getShapeRadius, PORT_SIDES } from '../geometry/nodeShape';
import type { FlowTheme } from '../theme/flowTheme';
import type { FlowHitInfo, FlowNodePayload } from './flowPayload';
import { alignToPixel } from './pixelAlign';

export type ElementOption = NonNullable<CustomSeriesRenderItemReturn>;

/** World-unit sizes; they are multiplied by the zoom scale when drawn. */
const STATUS_DOT_INSET = 10;
const MIN_STATUS_DOT_RADIUS = 2.5;
/** Fraction of the way from the center to the diamond's top-right edge midpoint. */
const DECISION_DOT_EDGE_RATIO = 0.75;
const PORT_LINE_WIDTH = 1.5;

interface NodeView {
  node: ResolvedNode;
  theme: FlowTheme;
  scale: number;
  /** Size in screen pixels, rounded so edges land on whole pixels. */
  width: number;
  height: number;
  isSelected: boolean;
  isHovered: boolean;
}

function calcStrokeColor(view: NodeView): string {
  const { node, theme } = view;
  if (view.isSelected) {
    return theme.selected;
  }
  if (view.isHovered) {
    return theme.hover;
  }
  if (node.status && theme.statusIndicator === 'stroke') {
    return theme.status[node.status];
  }
  return node.appearance.stroke;
}

/** Selection and running state glow in their own color; otherwise the node's drop shadow. */
function calcShadow(view: NodeView) {
  const { node, theme } = view;
  if (view.isSelected) {
    return { shadowColor: theme.selected, shadowBlur: theme.node.glowBlur, shadowOffsetY: 0 };
  }
  if (node.status === 'running') {
    return { shadowColor: theme.status.running, shadowBlur: theme.node.glowBlur, shadowOffsetY: 0 };
  }
  const { shadowColor, shadowBlur, shadowOffsetY } = node.appearance;
  return { shadowColor, shadowBlur, shadowOffsetY: shadowOffsetY * view.scale };
}

function buildShapeStyle(view: NodeView) {
  const { appearance } = view.node;
  const isActive = view.isSelected || view.isHovered;
  const hasOutline = appearance.stroke !== 'transparent' || isActive;
  return {
    fill: appearance.fill,
    stroke: hasOutline ? calcStrokeColor(view) : 'transparent',
    lineWidth: isActive ? appearance.activeLineWidth : appearance.lineWidth,
    lineDash: appearance.lineDash ?? undefined,
    opacity: appearance.opacity,
    ...calcShadow(view),
  };
}

function buildShapeElement(view: NodeView): ElementOption {
  const { node, width, height } = view;
  const info: FlowHitInfo = { role: 'node', nodeId: node.id };
  const style = buildShapeStyle(view);
  const { lineWidth } = style;
  const polygon = getShapePolygon(node.shape, width, height);
  if (polygon) {
    const points = polygon.map(([x, y]) => [alignToPixel(x, lineWidth), alignToPixel(y, lineWidth)]);
    return { type: 'polygon', name: 'shape', info, shape: { points }, style };
  }
  const pathData = getShapePath(node.shape, width, height);
  if (pathData) {
    return { type: 'path', name: 'shape', info, shape: { pathData }, style };
  }
  if (node.shape === 'circle') {
    return { type: 'ellipse', name: 'shape', info, shape: { cx: 0, cy: 0, rx: width / 2, ry: height / 2 }, style };
  }
  return {
    type: 'rect',
    name: 'shape',
    info,
    shape: {
      x: alignToPixel(-width / 2, lineWidth),
      y: alignToPixel(-height / 2, lineWidth),
      width,
      height,
      r: getShapeRadius(node.shape, height, node.appearance.radius * view.scale),
    },
    style,
  };
}

function buildDecorations(view: NodeView): ElementOption[] {
  const { appearance } = view.node;
  return getShapeDecorations(view.node.shape, view.width, view.height).map((pathData, index) => ({
    type: 'path',
    name: `decoration-${index}`,
    silent: true,
    shape: { pathData },
    style: { fill: 'none', stroke: calcStrokeColor(view), lineWidth: appearance.lineWidth, opacity: appearance.opacity },
  }));
}

/**
 * A standalone text element drawn at an integer position with a scaled font,
 * instead of a scaled transform, so canvas renders it crisply. Lines come
 * pre-wrapped so they match the size used for layout.
 */
function buildLabel(view: NodeView): ElementOption {
  const { node, theme, scale } = view;
  const { appearance } = node;
  return {
    type: 'text',
    name: 'label',
    silent: true,
    style: {
      text: node.lines.join('\n'),
      fill: appearance.textColor,
      fontSize: appearance.fontSize * scale,
      fontWeight: appearance.fontWeight,
      fontFamily: theme.fontFamily,
      lineHeight: appearance.lineHeight * scale,
      width: (node.width - theme.text.paddingX) * scale,
      overflow: 'truncate',
      align: 'center',
      verticalAlign: 'middle',
      opacity: appearance.opacity,
    },
  };
}

/**
 * Top-right corner for box shapes. A diamond has no corner there and its top
 * vertex is where incoming arrows land, so use a point just inside its top-right edge.
 */
function calcStatusDotPosition(view: NodeView): { cx: number; cy: number } {
  if (view.node.shape === 'decision') {
    const edgeMidX = view.width / 4;
    const edgeMidY = -view.height / 4;
    return { cx: Math.round(edgeMidX * DECISION_DOT_EDGE_RATIO), cy: Math.round(edgeMidY * DECISION_DOT_EDGE_RATIO) };
  }
  const inset = STATUS_DOT_INSET * view.scale;
  return { cx: Math.round(view.width / 2 - inset), cy: Math.round(-view.height / 2 + inset) };
}

function buildStatusDot(view: NodeView): ElementOption | null {
  const { status } = view.node;
  const { statusDot } = view.theme;
  if (!status || !statusDot.isVisible) {
    return null;
  }
  return {
    type: 'circle',
    name: 'status',
    silent: true,
    shape: { ...calcStatusDotPosition(view), r: Math.max(statusDot.radius * view.scale, MIN_STATUS_DOT_RADIUS) },
    style: { fill: view.theme.status[status] },
  };
}

function buildPort(view: NodeView, side: PortSide): ElementOption {
  const offset = getPortOffset(view.node.shape, view.width, view.height, side);
  const info: FlowHitInfo = { role: 'port', nodeId: view.node.id, side };
  const { port } = view.theme;
  return {
    type: 'circle',
    name: `port-${side}`,
    info,
    shape: { cx: Math.round(offset.x), cy: Math.round(offset.y), r: port.radius },
    style: { fill: port.fill, stroke: port.stroke, lineWidth: PORT_LINE_WIDTH },
  };
}

export function renderFlowNode(params: CustomSeriesRenderItemParams): CustomSeriesRenderItemReturn {
  const payload = params.itemPayload as unknown as FlowNodePayload;
  const node = payload.nodes[params.dataIndex];
  if (!node) {
    return null;
  }
  const { viewport, theme } = payload;
  const view: NodeView = {
    node,
    theme,
    scale: viewport.scale,
    width: Math.round(node.width * viewport.scale),
    height: Math.round(node.height * viewport.scale),
    isSelected: payload.selectedIds.includes(node.id),
    isHovered: payload.hoveredId === node.id,
  };
  const shouldShowPorts = payload.isEditable && view.isHovered;
  const children = [
    buildShapeElement(view),
    ...buildDecorations(view),
    buildLabel(view),
    buildStatusDot(view),
    ...(shouldShowPorts ? PORT_SIDES.map((side) => buildPort(view, side)) : []),
  ].filter((child): child is ElementOption => child !== null);

  // Same rounding scheme as edges (offset and scaled position rounded separately)
  // so edge endpoints meet node borders on the same pixel.
  return {
    type: 'group',
    x: Math.round(viewport.x) + Math.round(node.x * viewport.scale),
    y: Math.round(viewport.y) + Math.round(node.y * viewport.scale),
    emphasisDisabled: true,
    children,
  };
}
