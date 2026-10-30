import type { CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { FlowColor, FlowNodeShape, PortSide, ResolvedNode } from '../types';
import { getPortOffset, getShapeDecorations, getShapePath, getShapePolygon, getShapeRadius, PORT_SIDES } from '../geometry/nodeShape';
import type { FlowTheme } from '../theme/flowTheme';
import type { FlowHitInfo, FlowNodePayload } from './flowPayload';
import { isTransparent, toZrColor } from './flowColor';
import { alignToPixel, snapLineHeight, snapLineWidth, snapToPixel } from './pixelAlign';

export type ElementOption = NonNullable<CustomSeriesRenderItemReturn>;

/** World-unit sizes; they are multiplied by the zoom scale when drawn. */
const STATUS_DOT_INSET = 10;
const MIN_STATUS_DOT_RADIUS = 2.5;
/** Fraction of the way from the center to the diamond's top-right edge midpoint. */
const DECISION_DOT_EDGE_RATIO = 0.75;
const PORT_LINE_WIDTH = 1.5;
/** Screen-pixel gap between a node and its selection ring. */
const RING_GAP = 4;
const RING_LINE_WIDTH = 2;
const RING_OPACITY = 0.6;
/** Shapes with a straight left edge, where an accent bar fits. */
const ACCENT_SHAPES = new Set<FlowNodeShape>(['process', 'subprocess']);

interface NodeView {
  node: ResolvedNode;
  theme: FlowTheme;
  scale: number;
  /** Size in screen pixels, rounded so edges land on whole pixels. */
  width: number;
  height: number;
  isSelected: boolean;
  isHovered: boolean;
  /** Device pixels per CSS pixel; positions and strokes snap to this grid. */
  pixelRatio: number;
  /** Labels whose on-screen font size is below this are skipped. */
  minLabelPixels: number;
}

/** Ring styles mark selection with a halo, so the border keeps its own color. */
function isRingSelection(view: NodeView): boolean {
  return view.theme.node.selectionStyle === 'ring';
}

function calcStrokeColor(view: NodeView): FlowColor {
  const { node, theme } = view;
  if (view.isSelected && !isRingSelection(view)) {
    return theme.selected;
  }
  if (view.isHovered && !isRingSelection(view)) {
    return theme.hover;
  }
  if (node.status && theme.statusIndicator === 'stroke') {
    return theme.status[node.status];
  }
  return node.appearance.stroke;
}

/**
 * Running nodes, and selected nodes in stroke style, glow in their own color.
 * Otherwise the node casts its drop shadow, which grows on hover so the card
 * seems to lift.
 */
function calcShadow(view: NodeView) {
  const { node, theme, scale } = view;
  if (view.isSelected && !isRingSelection(view)) {
    return { shadowColor: theme.selected, shadowBlur: theme.node.glowBlur, shadowOffsetY: 0 };
  }
  if (node.status === 'running') {
    return { shadowColor: theme.status.running, shadowBlur: theme.node.glowBlur, shadowOffsetY: 0 };
  }
  const lift = view.isHovered || view.isSelected ? theme.node.hoverLift : 1;
  const { shadowColor, shadowBlur, shadowOffsetY } = node.appearance;
  return { shadowColor, shadowBlur: shadowBlur * lift, shadowOffsetY: shadowOffsetY * lift * scale };
}

function buildShapeStyle(view: NodeView) {
  const { appearance } = view.node;
  const isActive = (view.isSelected || view.isHovered) && !isRingSelection(view);
  const hasOutline = !isTransparent(appearance.stroke) || isActive;
  return {
    fill: toZrColor(appearance.fill),
    stroke: hasOutline ? toZrColor(calcStrokeColor(view)) : 'transparent',
    lineWidth: snapLineWidth(isActive ? appearance.activeLineWidth : appearance.lineWidth, view.pixelRatio),
    lineDash: appearance.lineDash ?? undefined,
    opacity: appearance.opacity,
    ...calcShadow(view),
  };
}

function buildShapeElement(view: NodeView): ElementOption {
  const { node, width, height, pixelRatio } = view;
  const info: FlowHitInfo = { role: 'node', nodeId: node.id };
  const style = buildShapeStyle(view);
  const { lineWidth } = style;
  const polygon = getShapePolygon(node.shape, width, height);
  if (polygon) {
    const points = polygon.map(([x, y]) => [alignToPixel(x, lineWidth, pixelRatio), alignToPixel(y, lineWidth, pixelRatio)]);
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
      x: alignToPixel(-width / 2, lineWidth, pixelRatio),
      y: alignToPixel(-height / 2, lineWidth, pixelRatio),
      width,
      height,
      r: getShapeRadius(node.shape, height, node.appearance.radius * view.scale),
    },
    style,
  };
}

/** Halo drawn a few pixels outside the outline of a selected node in ring style. */
function buildSelectionRing(view: NodeView): ElementOption | null {
  if (!view.isSelected || !isRingSelection(view)) {
    return null;
  }
  const { node, width, height, theme } = view;
  const style = { fill: 'none', stroke: theme.selected, lineWidth: snapLineWidth(RING_LINE_WIDTH, view.pixelRatio), opacity: RING_OPACITY };
  const base = { name: 'selection-ring', silent: true, style };
  const ringWidth = width + RING_GAP * 2;
  const ringHeight = height + RING_GAP * 2;
  const polygon = getShapePolygon(node.shape, ringWidth, ringHeight);
  if (polygon) {
    return { ...base, type: 'polygon', shape: { points: polygon } };
  }
  if (node.shape === 'circle') {
    return { ...base, type: 'ellipse', shape: { cx: 0, cy: 0, rx: ringWidth / 2, ry: ringHeight / 2 } };
  }
  const pathData = getShapePath(node.shape, ringWidth, ringHeight);
  if (pathData) {
    return { ...base, type: 'path', shape: { pathData } };
  }
  const radius = getShapeRadius(node.shape, height, node.appearance.radius * view.scale);
  return {
    ...base,
    type: 'rect',
    shape: { x: -ringWidth / 2, y: -ringHeight / 2, width: ringWidth, height: ringHeight, r: radius + RING_GAP },
  };
}

/**
 * Colored strip along the left edge of box shapes. It is the card outline
 * filled with the accent and clipped to a narrow band, so it follows the
 * rounded corners exactly instead of poking out of them.
 */
function buildAccentBar(view: NodeView): ElementOption | null {
  const { node, width, height, theme, scale } = view;
  const { accent } = node.appearance;
  if (!accent || !ACCENT_SHAPES.has(node.shape)) {
    return null;
  }
  const radius = getShapeRadius(node.shape, height, node.appearance.radius * scale);
  const left = -width / 2;
  const top = -height / 2;
  return {
    type: 'rect',
    name: 'accent',
    silent: true,
    shape: { x: left, y: top, width, height, r: radius },
    style: { fill: toZrColor(accent), opacity: node.appearance.opacity },
    clipPath: { type: 'rect', shape: { x: left, y: top, width: Math.max(theme.node.accentWidth * scale, 1), height } },
  };
}

function buildDecorations(view: NodeView): ElementOption[] {
  const { appearance } = view.node;
  return getShapeDecorations(view.node.shape, view.width, view.height).map((pathData, index) => ({
    type: 'path',
    name: `decoration-${index}`,
    silent: true,
    shape: { pathData },
    style: { fill: 'none', stroke: toZrColor(calcStrokeColor(view)), lineWidth: snapLineWidth(appearance.lineWidth, view.pixelRatio), opacity: appearance.opacity },
  }));
}

/**
 * A standalone text element drawn at an integer position with a scaled font,
 * instead of a scaled transform, so canvas renders it crisply. Lines come
 * pre-wrapped so they match the size used for layout.
 */
function buildLabel(view: NodeView): ElementOption | null {
  const { node, theme, scale } = view;
  const { appearance } = node;
  if (appearance.fontSize * scale < view.minLabelPixels) {
    return null;
  }
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
      lineHeight: snapLineHeight(appearance.lineHeight * scale, view.pixelRatio),
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
    return { cx: snapToPixel(edgeMidX * DECISION_DOT_EDGE_RATIO, view.pixelRatio), cy: snapToPixel(edgeMidY * DECISION_DOT_EDGE_RATIO, view.pixelRatio) };
  }
  const inset = STATUS_DOT_INSET * view.scale;
  return { cx: snapToPixel(view.width / 2 - inset, view.pixelRatio), cy: snapToPixel(-view.height / 2 + inset, view.pixelRatio) };
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
    shape: { cx: snapToPixel(offset.x, view.pixelRatio), cy: snapToPixel(offset.y, view.pixelRatio), r: port.radius },
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
  const pixelRatio = payload.pixelRatio ?? 1;
  const view: NodeView = {
    node,
    theme,
    scale: viewport.scale,
    width: snapToPixel(node.width * viewport.scale, pixelRatio),
    height: snapToPixel(node.height * viewport.scale, pixelRatio),
    isSelected: payload.selectedIds.includes(node.id),
    isHovered: payload.hoveredId === node.id,
    pixelRatio,
    minLabelPixels: payload.minLabelPixels ?? 0,
  };
  const shouldShowPorts = payload.isEditable && view.isHovered;
  const children = [
    buildSelectionRing(view),
    buildShapeElement(view),
    buildAccentBar(view),
    ...buildDecorations(view),
    buildLabel(view),
    buildStatusDot(view),
    ...(shouldShowPorts ? PORT_SIDES.map((side) => buildPort(view, side)) : []),
  ].filter((child): child is ElementOption => child !== null);

  // Same rounding scheme as edges (offset and scaled position rounded separately)
  // so edge endpoints meet node borders on the same pixel.
  return {
    type: 'group',
    x: snapToPixel(viewport.x, pixelRatio) + snapToPixel(node.x * viewport.scale, pixelRatio),
    y: snapToPixel(viewport.y, pixelRatio) + snapToPixel(node.y * viewport.scale, pixelRatio),
    emphasisDisabled: true,
    children,
  };
}
