import type { FlowNodeShape } from '../types';
import type { FlowShapeStyle, FlowTheme } from './flowTheme';

export const FONT_FAMILY = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

const SHAPES: FlowNodeShape[] = [
  'start', 'end', 'process', 'decision', 'io', 'circle', 'hexagon', 'document', 'database', 'subprocess', 'text',
];

/** Every shape starts from the process style; the bare text shape has no fill or border. */
export function buildShapes(
  base: FlowShapeStyle,
  overrides: Partial<Record<FlowNodeShape, FlowShapeStyle>>,
): Record<FlowNodeShape, FlowShapeStyle> {
  const shapes = {} as Record<FlowNodeShape, FlowShapeStyle>;
  SHAPES.forEach((shape) => {
    shapes[shape] = overrides[shape] ?? base;
  });
  shapes.text = overrides.text ?? { fill: 'transparent', stroke: 'transparent', text: base.text };
  return shapes;
}

/** Shared defaults; each built-in theme overrides colors and a few metrics. */
export const BASE_THEME: Omit<FlowTheme, 'shapes'> = {
  background: 'transparent',
  backdrop: { blobs: [] },
  fontFamily: FONT_FAMILY,
  grid: { type: 'none', size: 20, color: '#e4e6eb' },
  text: { fontSize: 13, fontWeight: 'normal', lineHeight: 18, overflow: 'wrap', paddingX: 12, paddingY: 8 },
  node: {
    lineWidth: 1,
    activeLineWidth: 2,
    lineDash: null,
    radius: 6,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowBlur: 8,
    shadowOffsetY: 2,
    maxWidth: 200,
    glowBlur: 12,
    accentWidth: 4,
    selectionStyle: 'stroke',
    hoverLift: 1,
  },
  edge: {
    stroke: '#9ea0a5',
    lineWidth: 1,
    activeLineWidth: 2,
    lineDash: null,
    routing: 'orthogonal',
    cornerRadius: 8,
    sourceArrow: 'none',
    targetArrow: 'triangle',
    arrowSize: 10,
    labelColor: '#54555a',
    labelBackground: '#ffffff',
    labelBorder: '#e8ebf0',
    labelFontSize: 12,
    labelRadius: 4,
    labelShadowColor: 'transparent',
    opacity: 1,
  },
  lane: {
    fill: 'rgba(244,247,253,0.6)',
    alternateFill: 'rgba(255,255,255,0.6)',
    headerFill: '#eef1f8',
    headerTextColor: '#3c3c41',
    headerFontSize: 14,
    headerFontWeight: 'bold',
    headerSize: 40,
    borderColor: '#cfd2d7',
    borderWidth: 1,
    padding: 30,
    minSize: 160,
  },
  title: { color: '#3c3c41', fill: 'transparent', fontSize: 18, fontWeight: 'bold', height: 44 },
  selected: '#5070dd',
  hover: '#7285c6',
  port: { fill: '#ffffff', stroke: '#5070dd', radius: 5 },
  status: { pending: '#b7b9be', running: '#5070dd', done: '#3fbe95', error: '#fb628b' },
  statusIndicator: 'stroke',
  statusDot: { radius: 4, isVisible: true },
};
