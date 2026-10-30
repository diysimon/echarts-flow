import { createFlowTheme, type FlowTheme } from './flowTheme';
import { BASE_THEME, buildShapes } from './themeDefaults';

/** ECharts 6 default palette. */
const PALETTE = { blue: '#5070dd', orange: '#ff994d', cyan: '#0ca8df', pink: '#fb628b', green: '#3fbe95', purple: '#785db0' };
const LIGHT_TEXT = '#3c3c41';

export const lightTheme: FlowTheme = {
  ...BASE_THEME,
  shapes: buildShapes({ fill: '#ffffff', stroke: '#c0c9e6', text: LIGHT_TEXT }, {
    start: { fill: '#e9f7f2', stroke: PALETTE.green, text: LIGHT_TEXT },
    end: { fill: '#fff0f3', stroke: PALETTE.pink, text: LIGHT_TEXT },
    decision: { fill: '#fff5ed', stroke: PALETTE.orange, text: LIGHT_TEXT },
    io: { fill: '#e7f6fc', stroke: PALETTE.cyan, text: LIGHT_TEXT },
    circle: { fill: '#ffffff', stroke: PALETTE.blue, text: LIGHT_TEXT },
    database: { fill: '#f1eef8', stroke: PALETTE.purple, text: LIGHT_TEXT },
    document: { fill: '#fffbe6', stroke: '#e6b800', text: LIGHT_TEXT },
  }),
  node: { ...BASE_THEME.node, shadowColor: 'rgba(80,112,221,0.12)' },
};

/** Pastel palette from the ECharts macarons theme; start/end use solid fills. */
export const macaronsTheme: FlowTheme = createFlowTheme(lightTheme, {
  shapes: buildShapes({ fill: '#ffffff', stroke: '#b6a2de', text: '#4a4a5a' }, {
    start: { fill: '#2ec7c9', stroke: '#2ec7c9', text: '#ffffff' },
    end: { fill: '#d87a80', stroke: '#d87a80', text: '#ffffff' },
    decision: { fill: '#fff3e8', stroke: '#ffb980', text: '#4a4a5a' },
    io: { fill: '#eaf5fd', stroke: '#5ab1ef', text: '#4a4a5a' },
    circle: { fill: '#ffffff', stroke: '#2ec7c9', text: '#4a4a5a' },
  }),
  background: '#fbfaf8',
  grid: { type: 'dot', color: '#e6e1ee' },
  node: { radius: 10, shadowColor: 'rgba(182,162,222,0.28)', shadowBlur: 12, shadowOffsetY: 4 },
  edge: { stroke: '#b6a2de', labelColor: '#6a5a8c', labelBackground: '#f4f0fb', labelBorder: '#e3daf3', cornerRadius: 12 },
  lane: { fill: 'rgba(182,162,222,0.06)', alternateFill: 'rgba(46,199,201,0.05)', headerFill: '#f4f0fb', headerTextColor: '#6a5a8c', borderColor: '#e3daf3' },
  title: { color: '#6a5a8c' },
  selected: '#2ec7c9',
  hover: '#5ab1ef',
  port: { stroke: '#2ec7c9' },
  status: { pending: '#c8c8d0', running: '#5ab1ef', done: '#2ec7c9', error: '#d87a80' },
});

/**
 * Online whiteboard look: dot grid, bold 2px black connectors with open
 * arrowheads, large rounded pastel nodes. Pair with per-lane `nodeStyle` colors.
 */
export const whiteboardTheme: FlowTheme = createFlowTheme(lightTheme, {
  shapes: buildShapes({ fill: '#e9ddff', stroke: '#8b5cf6', text: '#1f1f1f' }, {
    start: { fill: '#ffc9cf', stroke: '#ef4b5d', text: '#1f1f1f' },
    end: { fill: '#c8f0d0', stroke: '#3fb15a', text: '#1f1f1f' },
    circle: { fill: '#ffffff', stroke: '#1f1f1f', text: '#1f1f1f' },
  }),
  background: '#ffffff',
  grid: { type: 'dot', size: 20, color: '#d5d9df' },
  text: { fontSize: 14, fontWeight: 500, lineHeight: 19, paddingX: 16, paddingY: 12 },
  node: { lineWidth: 2, activeLineWidth: 3, radius: 16, shadowBlur: 0, shadowOffsetY: 0, maxWidth: 160 },
  edge: {
    stroke: '#1f1f1f', lineWidth: 2, activeLineWidth: 3, cornerRadius: 6, targetArrow: 'vee', arrowSize: 12,
    labelColor: '#1f1f1f', labelBackground: '#ffffff', labelBorder: '#1f1f1f',
  },
  lane: {
    fill: '#ffffff', alternateFill: '#ffffff', headerFill: '#ffffff', headerTextColor: '#1f1f1f',
    headerFontSize: 15, headerFontWeight: 600, headerSize: 64, borderColor: '#9aa0a6', padding: 34,
  },
  title: { color: '#1f1f1f', fontSize: 19, fontWeight: 'normal', height: 40 },
  statusIndicator: 'dot',
});

/** Classic office flowchart: solid blue boxes, orange decisions, green terminals, framed lanes. */
export const classicTheme: FlowTheme = createFlowTheme(lightTheme, {
  shapes: buildShapes({ fill: '#2f7fd6', stroke: '#2f7fd6', text: '#ffffff' }, {
    start: { fill: '#52b043', stroke: '#52b043', text: '#ffffff' },
    end: { fill: '#52b043', stroke: '#52b043', text: '#ffffff' },
    decision: { fill: '#ff8a1f', stroke: '#ff8a1f', text: '#ffffff' },
    circle: { fill: '#ffffff', stroke: '#1f5fa8', text: '#1f1f1f' },
  }),
  background: '#ffffff',
  text: { fontSize: 12, lineHeight: 16, paddingX: 8, paddingY: 6 },
  node: { radius: 0, shadowBlur: 0, shadowOffsetY: 0, maxWidth: 140 },
  edge: { stroke: '#1f5fa8', cornerRadius: 0, arrowSize: 8, labelColor: '#1f1f1f', labelBackground: '#ffffff', labelBorder: 'transparent' },
  lane: {
    fill: '#ffffff', alternateFill: '#ffffff', headerFill: '#ffffff', headerTextColor: '#1f1f1f',
    headerFontSize: 15, headerSize: 36, borderColor: '#3c3c3c', padding: 20, minSize: 150,
  },
  title: { color: '#1f1f1f', fill: '#ffffff', fontSize: 20, height: 46 },
  selected: '#ff3d00',
  hover: '#ff8a65',
  port: { stroke: '#ff3d00' },
  statusIndicator: 'dot',
});
