import { createFlowTheme, type FlowTheme } from './flowTheme';
import { lightTheme } from './lightThemes';
import { buildShapes } from './themeDefaults';
import { linearGradient } from '../render/flowColor';

const MODERN_FONT = 'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
/** Top-left to bottom-right, the usual direction for modern UI gradients. */
const DIAGONAL = 135;
const WHITE = '#ffffff';

/** Shared metrics: roomy cards, rounded corners, soft lift, pill labels, ring selection. */
const MODERN_METRICS = {
  fontFamily: MODERN_FONT,
  text: { fontSize: 13, fontWeight: 500, lineHeight: 19, paddingX: 18, paddingY: 12 },
  node: {
    lineWidth: 1,
    activeLineWidth: 1,
    radius: 14,
    maxWidth: 190,
    accentWidth: 4,
    selectionStyle: 'ring' as const,
    hoverLift: 1.6,
    glowBlur: 20,
  },
  edge: {
    lineWidth: 2,
    activeLineWidth: 2,
    cornerRadius: 16,
    targetArrow: 'triangle' as const,
    arrowSize: 9,
    labelFontSize: 12,
    labelRadius: 999,
  },
  lane: { headerFontSize: 13, headerFontWeight: 600, headerSize: 44, padding: 36 },
  title: { fontSize: 20, fontWeight: 700, height: 52, fill: 'transparent' },
  statusIndicator: 'dot' as const,
  statusDot: { radius: 4, isVisible: true },
};

const INK = '#0f172a';
const HAIRLINE = 'rgba(15,23,42,0.08)';

/**
 * Aurora: a bright, airy look in the style of current product UIs. White
 * cards with a gradient accent bar and a soft floating shadow, vivid
 * gradient terminals and decisions, slate connectors with pill labels, and
 * pastel glows behind a faint dot grid.
 */
export const auroraTheme: FlowTheme = createFlowTheme(createFlowTheme(lightTheme, MODERN_METRICS), {
  background: linearGradient(DIAGONAL, '#f8fafc', '#f5f3ff', '#f0f9ff'),
  backdrop: {
    blobs: [
      { x: 0.12, y: 0.1, radius: 0.45, color: 'rgba(129,140,248,0.22)' },
      { x: 0.9, y: 0.2, radius: 0.4, color: 'rgba(236,72,153,0.14)' },
      { x: 0.7, y: 0.95, radius: 0.5, color: 'rgba(34,211,238,0.16)' },
    ],
  },
  grid: { type: 'dot', size: 24, color: 'rgba(100,116,139,0.18)' },
  shapes: buildShapes({ fill: WHITE, stroke: HAIRLINE, text: INK, accent: linearGradient(90, '#6366f1', '#a855f7') }, {
    start: { fill: linearGradient(DIAGONAL, '#34d399', '#059669'), stroke: 'transparent', text: WHITE },
    end: { fill: linearGradient(DIAGONAL, '#fb7185', '#e11d48'), stroke: 'transparent', text: WHITE },
    decision: { fill: linearGradient(DIAGONAL, '#fbbf24', '#f97316'), stroke: 'transparent', text: WHITE },
    io: { fill: linearGradient(DIAGONAL, '#f0f9ff', '#e0f2fe'), stroke: 'rgba(14,165,233,0.35)', text: '#075985' },
    circle: { fill: linearGradient(DIAGONAL, '#818cf8', '#4f46e5'), stroke: 'transparent', text: WHITE },
    hexagon: { fill: linearGradient(DIAGONAL, '#c084fc', '#7c3aed'), stroke: 'transparent', text: WHITE },
    document: { fill: WHITE, stroke: HAIRLINE, text: INK },
    database: { fill: linearGradient(90, '#eef2ff', '#e0e7ff'), stroke: 'rgba(99,102,241,0.35)', text: '#3730a3' },
    subprocess: { fill: WHITE, stroke: HAIRLINE, text: INK, accent: linearGradient(90, '#06b6d4', '#3b82f6') },
  }),
  node: { shadowColor: 'rgba(15,23,42,0.10)', shadowBlur: 24, shadowOffsetY: 8 },
  edge: {
    stroke: '#94a3b8',
    labelColor: '#475569',
    labelBackground: WHITE,
    labelBorder: HAIRLINE,
    labelShadowColor: 'rgba(15,23,42,0.10)',
  },
  lane: {
    fill: 'rgba(255,255,255,0.55)',
    alternateFill: 'rgba(248,250,252,0.55)',
    headerFill: 'rgba(255,255,255,0.85)',
    headerTextColor: '#334155',
    borderColor: 'rgba(15,23,42,0.08)',
  },
  title: { color: INK },
  selected: '#6366f1',
  hover: '#818cf8',
  port: { fill: WHITE, stroke: '#6366f1', radius: 5 },
  status: { pending: '#cbd5e1', running: '#6366f1', done: '#10b981', error: '#f43f5e' },
});

const MIST = '#e2e8f0';
const GLASS = 'rgba(255,255,255,0.06)';
const GLASS_EDGE = 'rgba(255,255,255,0.12)';

/**
 * Aurora dark: frosted glass cards floating on a deep night background lit
 * by violet, cyan and pink glows; gradient terminals glow softly.
 */
export const auroraDarkTheme: FlowTheme = createFlowTheme(auroraTheme, {
  background: linearGradient(160, '#0b1020', '#0f172a', '#111827'),
  backdrop: {
    blobs: [
      { x: 0.15, y: 0.15, radius: 0.5, color: 'rgba(124,58,237,0.35)' },
      { x: 0.85, y: 0.3, radius: 0.45, color: 'rgba(6,182,212,0.22)' },
      { x: 0.55, y: 1, radius: 0.55, color: 'rgba(236,72,153,0.18)' },
    ],
  },
  grid: { type: 'dot', color: 'rgba(148,163,184,0.14)' },
  shapes: buildShapes({ fill: GLASS, stroke: GLASS_EDGE, text: MIST, accent: linearGradient(90, '#a78bfa', '#22d3ee') }, {
    start: { fill: linearGradient(DIAGONAL, '#10b981', '#06b6d4'), stroke: 'transparent', text: WHITE },
    end: { fill: linearGradient(DIAGONAL, '#f43f5e', '#ec4899'), stroke: 'transparent', text: WHITE },
    decision: { fill: linearGradient(DIAGONAL, '#f59e0b', '#f97316'), stroke: 'transparent', text: WHITE },
    io: { fill: 'rgba(56,189,248,0.10)', stroke: 'rgba(56,189,248,0.45)', text: '#e0f2fe' },
    circle: { fill: linearGradient(DIAGONAL, '#8b5cf6', '#6366f1'), stroke: 'transparent', text: WHITE },
    hexagon: { fill: linearGradient(DIAGONAL, '#a855f7', '#ec4899'), stroke: 'transparent', text: WHITE },
    document: { fill: GLASS, stroke: GLASS_EDGE, text: MIST },
    database: { fill: 'rgba(99,102,241,0.18)', stroke: 'rgba(129,140,248,0.5)', text: '#e0e7ff' },
    subprocess: { fill: GLASS, stroke: GLASS_EDGE, text: MIST, accent: linearGradient(90, '#22d3ee', '#3b82f6') },
  }),
  node: { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 28, shadowOffsetY: 10, glowBlur: 24 },
  edge: {
    stroke: 'rgba(148,163,184,0.55)',
    labelColor: '#cbd5e1',
    labelBackground: 'rgba(15,23,42,0.9)',
    labelBorder: GLASS_EDGE,
    labelShadowColor: 'rgba(0,0,0,0.4)',
  },
  lane: {
    fill: 'rgba(255,255,255,0.025)',
    alternateFill: 'rgba(255,255,255,0.05)',
    headerFill: 'rgba(255,255,255,0.06)',
    headerTextColor: MIST,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: { color: '#f8fafc' },
  selected: '#a78bfa',
  hover: '#c4b5fd',
  port: { fill: '#0f172a', stroke: '#a78bfa', radius: 5 },
  status: { pending: '#475569', running: '#a78bfa', done: '#34d399', error: '#fb7185' },
});
