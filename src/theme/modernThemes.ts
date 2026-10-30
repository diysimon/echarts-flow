import { createFlowTheme, type FlowTheme } from './flowTheme';
import { lightTheme } from './lightThemes';
import { buildShapes } from './themeDefaults';

const MODERN_FONT = 'Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

/**
 * Shared metrics: roomy cards with a 12px radius, a soft lift, thin connectors
 * with rounded corners, pill labels and ring selection. No accent bars:
 * shapes are told apart by a light tint instead.
 */
const MODERN_METRICS = {
  fontFamily: MODERN_FONT,
  text: { fontSize: 13, fontWeight: 500, lineHeight: 18, paddingX: 18, paddingY: 12 },
  node: {
    lineWidth: 1,
    activeLineWidth: 1,
    radius: 12,
    maxWidth: 190,
    accentWidth: 3,
    selectionStyle: 'ring' as const,
    hoverLift: 1.8,
    glowBlur: 18,
  },
  edge: {
    lineWidth: 1.5,
    activeLineWidth: 2,
    cornerRadius: 12,
    targetArrow: 'triangle' as const,
    arrowSize: 7,
    labelFontSize: 11.5,
    labelRadius: 999,
  },
  lane: { headerFontSize: 12, headerFontWeight: 600, headerSize: 40, padding: 36 },
  title: { fontSize: 17, fontWeight: 650, height: 48, fill: 'transparent' },
  statusIndicator: 'dot' as const,
  statusDot: { radius: 3.5, isVisible: true },
};

/** Light palette: slate neutrals, one indigo brand color, and pale tints for shape kinds. */
const LIGHT = {
  canvas: '#f8fafc',
  card: '#ffffff',
  ink: '#0f172a',
  muted: '#475569',
  border: '#e2e8f0',
  edge: '#94a3b8',
  brand: '#4f46e5',
  brandSoft: '#a5b4fc',
};

/**
 * Aurora: a calm, product-UI look. White cards with hairline borders and a
 * soft shadow on a near-white canvas with one faint glow, solid indigo start
 * and ink-black end pills, and pale tints for decisions, data and I/O, so the
 * diagram reads by shape rather than by loud color.
 */
export const auroraTheme: FlowTheme = createFlowTheme(createFlowTheme(lightTheme, MODERN_METRICS), {
  background: LIGHT.canvas,
  backdrop: {
    blobs: [
      { x: 0.08, y: 0, radius: 0.55, color: 'rgba(99,102,241,0.07)' },
      { x: 0.95, y: 1, radius: 0.5, color: 'rgba(14,165,233,0.05)' },
    ],
  },
  grid: { type: 'dot', size: 20, color: 'rgba(15,23,42,0.07)' },
  shapes: buildShapes({ fill: LIGHT.card, stroke: LIGHT.border, text: LIGHT.ink }, {
    start: { fill: LIGHT.brand, stroke: 'transparent', text: '#ffffff' },
    end: { fill: LIGHT.ink, stroke: 'transparent', text: '#ffffff' },
    decision: { fill: '#fffbeb', stroke: '#fcd34d', text: '#92400e' },
    io: { fill: '#f0f9ff', stroke: '#bae6fd', text: '#075985' },
    circle: { fill: '#eef2ff', stroke: '#c7d2fe', text: '#3730a3' },
    hexagon: { fill: '#f0fdfa', stroke: '#99f6e4', text: '#115e59' },
    database: { fill: '#f5f3ff', stroke: '#ddd6fe', text: '#5b21b6' },
  }),
  node: { shadowColor: 'rgba(15,23,42,0.06)', shadowBlur: 14, shadowOffsetY: 3 },
  edge: {
    stroke: LIGHT.edge,
    labelColor: LIGHT.muted,
    labelBackground: LIGHT.card,
    labelBorder: LIGHT.border,
    labelShadowColor: 'transparent',
  },
  lane: {
    fill: 'rgba(255,255,255,0.7)',
    alternateFill: 'rgba(241,245,249,0.6)',
    headerFill: '#f1f5f9',
    headerTextColor: LIGHT.muted,
    borderColor: LIGHT.border,
  },
  title: { color: LIGHT.ink },
  selected: LIGHT.brand,
  hover: LIGHT.brandSoft,
  port: { fill: '#ffffff', stroke: LIGHT.brand, radius: 4.5 },
  status: { pending: '#cbd5e1', running: LIGHT.brand, done: '#10b981', error: '#ef4444' },
});

/** Dark palette: near-black canvas, raised charcoal cards, the same indigo brand a step lighter. */
const DARK = {
  canvas: '#0b0d12',
  card: '#161a22',
  ink: '#e5e7eb',
  muted: '#9ca3af',
  border: 'rgba(255,255,255,0.09)',
  edge: 'rgba(148,163,184,0.5)',
  brand: '#818cf8',
  brandSolid: '#6366f1',
};

/**
 * Aurora dark: charcoal cards on a near-black canvas under one faint violet
 * glow, a solid indigo start, an inverted light end pill, and low-opacity
 * tints with matching borders for the other shape kinds.
 */
export const auroraDarkTheme: FlowTheme = createFlowTheme(auroraTheme, {
  background: DARK.canvas,
  backdrop: {
    blobs: [
      { x: 0.15, y: 0, radius: 0.6, color: 'rgba(99,102,241,0.14)' },
      { x: 0.9, y: 1, radius: 0.5, color: 'rgba(14,165,233,0.07)' },
    ],
  },
  grid: { type: 'dot', color: 'rgba(255,255,255,0.06)' },
  shapes: buildShapes({ fill: DARK.card, stroke: DARK.border, text: DARK.ink }, {
    start: { fill: DARK.brandSolid, stroke: 'transparent', text: '#ffffff' },
    end: { fill: '#f1f5f9', stroke: 'transparent', text: '#0f172a' },
    decision: { fill: 'rgba(245,158,11,0.10)', stroke: 'rgba(245,158,11,0.40)', text: '#fcd34d' },
    io: { fill: 'rgba(14,165,233,0.10)', stroke: 'rgba(56,189,248,0.40)', text: '#bae6fd' },
    circle: { fill: 'rgba(99,102,241,0.14)', stroke: 'rgba(129,140,248,0.45)', text: '#c7d2fe' },
    hexagon: { fill: 'rgba(20,184,166,0.10)', stroke: 'rgba(45,212,191,0.40)', text: '#99f6e4' },
    database: { fill: 'rgba(139,92,246,0.12)', stroke: 'rgba(167,139,250,0.45)', text: '#ddd6fe' },
  }),
  node: { shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 18, shadowOffsetY: 4, glowBlur: 20 },
  edge: {
    stroke: DARK.edge,
    labelColor: DARK.muted,
    labelBackground: DARK.card,
    labelBorder: DARK.border,
    labelShadowColor: 'transparent',
  },
  lane: {
    fill: 'rgba(255,255,255,0.015)',
    alternateFill: 'rgba(255,255,255,0.035)',
    headerFill: 'rgba(255,255,255,0.03)',
    headerTextColor: DARK.muted,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  title: { color: '#f9fafb' },
  selected: DARK.brand,
  hover: '#a5b4fc',
  port: { fill: DARK.canvas, stroke: DARK.brand, radius: 4.5 },
  status: { pending: '#4b5563', running: DARK.brand, done: '#34d399', error: '#f87171' },
});
