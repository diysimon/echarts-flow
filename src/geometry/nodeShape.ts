import type { FlowNode, FlowNodeShape, FlowNodeStyle, NodeAppearance, Point, PortSide, ResolvedNode } from '../types';
import { DEFAULT_NODE_SIZE, TEXT_WIDTH_RATIO } from '../theme/flowStyle';
import type { FlowTheme } from '../theme/flowTheme';
import { resolveNodeAppearance } from '../style/resolveAppearance';
import { calcTextWidth, wrapText } from './textLayout';
import { traceHalfEllipse, type PathTracer } from './pathTracer';

export const PORT_SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];

/** Horizontal slant of io and hexagon sides, relative to the height. */
const SLANT_RATIO = 0.3;
/** Share of the height usable for text in shapes that narrow vertically. */
const TEXT_HEIGHT_RATIO: Partial<Record<FlowNodeShape, number>> = { decision: 0.6, circle: 0.7, database: 0.7, document: 0.85 };
const DOCUMENT_WAVE_RATIO = 0.1;
const DATABASE_CAP_RATIO = 0.15;
const MAX_DATABASE_CAP = 12;
const SUBPROCESS_BAR_INSET = 10;
/** Narrow subprocess nodes put their bars this share of the width in from the sides. */
const SUBPROCESS_BAR_MAX_RATIO = 0.08;

/** Shapes that lose text room to slanted sides may grow this much past the theme max width. */
const NARROW_SHAPE_MAX_WIDTH_FACTOR = 1.3;

export interface NodeMetrics {
  width: number;
  height: number;
  lines: string[];
}

/** Sizes a node to fit its label, honoring explicit width/height and the theme's max width. */
export function measureNode(node: FlowNode, appearance: NodeAppearance, theme: FlowTheme): NodeMetrics {
  const defaults = DEFAULT_NODE_SIZE[node.shape];
  const widthRatio = TEXT_WIDTH_RATIO[node.shape];
  const heightRatio = TEXT_HEIGHT_RATIO[node.shape] ?? 1;
  const maxWidth = theme.node.maxWidth * (widthRatio < 1 ? NARROW_SHAPE_MAX_WIDTH_FACTOR : 1);
  // The width ratio already keeps text off slanted sides, so padding shrinks with it.
  const paddingX = theme.text.paddingX * widthRatio;
  const { paddingY } = theme.text;
  const { fontSize, lineHeight } = appearance;
  const boxWidth = node.width ?? maxWidth;
  const textMaxWidth = boxWidth * widthRatio - paddingX * 2;
  const lines = appearance.textOverflow === 'wrap' ? wrapText(node.label, textMaxWidth, fontSize) : [node.label];
  const textWidth = Math.max(...lines.map((line) => calcTextWidth(line, fontSize)));
  const autoWidth = Math.min(Math.max(defaults.width, Math.ceil((textWidth + paddingX * 2) / widthRatio)), maxWidth);
  const autoHeight = Math.max(defaults.height, Math.ceil((lines.length * lineHeight) / heightRatio + paddingY * 2));
  if (node.shape === 'circle') {
    const diameter = Math.max(node.width ?? autoWidth, node.height ?? autoHeight);
    return { width: node.width ?? diameter, height: node.height ?? diameter, lines };
  }
  return { width: node.width ?? autoWidth, height: node.height ?? autoHeight, lines };
}

export function resolveNode(
  node: FlowNode,
  theme: FlowTheme,
  laneNodeStyle?: FlowNodeStyle,
  fallback: Point = { x: 0, y: 0 },
): ResolvedNode {
  const appearance = resolveNodeAppearance(node, theme, laneNodeStyle);
  const metrics = measureNode(node, appearance, theme);
  return { ...node, x: node.x ?? fallback.x, y: node.y ?? fallback.y, ...metrics, appearance };
}

export function calcSlant(height: number): number {
  return height * SLANT_RATIO;
}

/** Polygon vertices in local coordinates centered at (0, 0), for polygon shapes. */
export function getShapePolygon(shape: FlowNodeShape, width: number, height: number): number[][] | null {
  const halfW = width / 2;
  const halfH = height / 2;
  const slant = calcSlant(height);
  switch (shape) {
    case 'decision':
      return [[0, -halfH], [halfW, 0], [0, halfH], [-halfW, 0]];
    case 'io':
      return [[-halfW + slant, -halfH], [halfW, -halfH], [halfW - slant, halfH], [-halfW, halfH]];
    case 'hexagon':
      return [[-halfW, 0], [-halfW + slant, -halfH], [halfW - slant, -halfH], [halfW, 0], [halfW - slant, halfH], [-halfW + slant, halfH]];
    default:
      return null;
  }
}

function calcDatabaseCap(height: number): number {
  return Math.min(height * DATABASE_CAP_RATIO, MAX_DATABASE_CAP);
}

/** Shapes whose outline has curves, traced by {@link traceShapeOutline}. */
const CURVED_SHAPES = new Set<FlowNodeShape>(['document', 'database']);
/** Shapes with stroke-only lines on top of the outline, traced by {@link traceShapeDecorations}. */
const DECORATED_SHAPES = new Set<FlowNodeShape>(['database', 'subprocess']);

export function hasCurvedOutline(shape: FlowNodeShape): boolean {
  return CURVED_SHAPES.has(shape);
}

export function hasDecorations(shape: FlowNodeShape): boolean {
  return DECORATED_SHAPES.has(shape);
}

/** Outline of curved shapes around (0, 0). Draws nothing for other shapes. */
export function traceShapeOutline(tracer: PathTracer, shape: FlowNodeShape, width: number, height: number): void {
  const halfW = width / 2;
  const halfH = height / 2;
  if (shape === 'document') {
    const wave = height * DOCUMENT_WAVE_RATIO;
    const base = halfH - wave;
    tracer.moveTo(-halfW, -halfH);
    tracer.lineTo(halfW, -halfH);
    tracer.lineTo(halfW, base);
    tracer.quadraticCurveTo(halfW / 2, base - wave * 2, 0, base);
    tracer.quadraticCurveTo(-halfW / 2, base + wave * 2, -halfW, base);
    tracer.closePath();
  } else if (shape === 'database') {
    const cap = calcDatabaseCap(height);
    tracer.moveTo(-halfW, -halfH + cap);
    traceHalfEllipse(tracer, { x: 0, y: -halfH + cap }, halfW, cap, true, true);
    tracer.lineTo(halfW, halfH - cap);
    traceHalfEllipse(tracer, { x: 0, y: halfH - cap }, halfW, cap, false, false);
    tracer.closePath();
  }
}

/** Extra stroke-only lines drawn on top of the outline, around (0, 0). */
export function traceShapeDecorations(tracer: PathTracer, shape: FlowNodeShape, width: number, height: number): void {
  const halfW = width / 2;
  const halfH = height / 2;
  if (shape === 'database') {
    // Front rim of the top cap.
    const cap = calcDatabaseCap(height);
    tracer.moveTo(-halfW, -halfH + cap);
    traceHalfEllipse(tracer, { x: 0, y: -halfH + cap }, halfW, cap, true, false);
  } else if (shape === 'subprocess') {
    const barX = halfW - Math.min(SUBPROCESS_BAR_INSET, width * SUBPROCESS_BAR_MAX_RATIO);
    tracer.moveTo(-barX, -halfH);
    tracer.lineTo(-barX, halfH);
    tracer.moveTo(barX, -halfH);
    tracer.lineTo(barX, halfH);
  }
}

/** Corner radius for rect-based shapes; start/end render as capsules. */
export function getShapeRadius(shape: FlowNodeShape, height: number, boxRadius: number): number {
  if (shape === 'start' || shape === 'end') {
    return height / 2;
  }
  return shape === 'text' ? 0 : boxRadius;
}

/** Port offset from the node center. Ports sit on the visible outline. */
export function getPortOffset(shape: FlowNodeShape, width: number, height: number, side: PortSide): Point {
  const halfW = width / 2;
  const halfH = height / 2;
  const sideInset = shape === 'io' ? calcSlant(height) / 2 : 0;
  const bottomInset = shape === 'document' ? height * DOCUMENT_WAVE_RATIO : 0;
  switch (side) {
    case 'top':
      return { x: 0, y: -halfH };
    case 'bottom':
      return { x: 0, y: halfH - bottomInset };
    case 'left':
      return { x: -halfW + sideInset, y: 0 };
    case 'right':
      return { x: halfW - sideInset, y: 0 };
  }
}

export function getPortPosition(node: ResolvedNode, side: PortSide): Point {
  const offset = getPortOffset(node.shape, node.width, node.height, side);
  return { x: node.x + offset.x, y: node.y + offset.y };
}
