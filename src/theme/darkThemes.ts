import { createFlowTheme, type FlowTheme } from './flowTheme';
import { lightTheme } from './lightThemes';
import { buildShapes } from './themeDefaults';

const DARK_TEXT = '#e8ebf0';

/** ECharts 6 dark mode keeps the palette and inverts the neutral scale. */
export const darkTheme: FlowTheme = createFlowTheme(lightTheme, {
  shapes: buildShapes({ fill: '#2a2b31', stroke: '#54555a', text: DARK_TEXT }, {
    start: { fill: 'rgba(63,190,149,0.18)', stroke: '#3fbe95', text: DARK_TEXT },
    end: { fill: 'rgba(251,98,139,0.18)', stroke: '#fb628b', text: DARK_TEXT },
    decision: { fill: 'rgba(255,153,77,0.18)', stroke: '#ff994d', text: DARK_TEXT },
    io: { fill: 'rgba(12,168,223,0.18)', stroke: '#0ca8df', text: DARK_TEXT },
    circle: { fill: '#2a2b31', stroke: '#7b94f0', text: DARK_TEXT },
    database: { fill: 'rgba(120,93,176,0.22)', stroke: '#9d86d4', text: DARK_TEXT },
    document: { fill: 'rgba(255,209,10,0.14)', stroke: '#e6c229', text: DARK_TEXT },
  }),
  background: '#1c1c21',
  grid: { type: 'dot', color: '#303034' },
  node: { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 10, shadowOffsetY: 3 },
  edge: { stroke: '#6d6e73', labelColor: '#b7b9be', labelBackground: '#1c1c21', labelBorder: '#3c3c41' },
  lane: {
    fill: 'rgba(255,255,255,0.02)', alternateFill: 'rgba(255,255,255,0.045)', headerFill: '#26272c',
    headerTextColor: '#dbdee4', borderColor: '#3c3c41',
  },
  title: { color: DARK_TEXT },
  selected: '#7b94f0',
  hover: '#5c6da9',
  port: { fill: '#1c1c21', stroke: '#7b94f0' },
  status: { pending: '#616266', running: '#7b94f0' },
});

const TECH_TEXT = '#d6ebf5';

/** Dark navy with cyan glow, after the ECharts tech-blue and dark-blue themes. */
export const techBlueTheme: FlowTheme = createFlowTheme(darkTheme, {
  shapes: buildShapes({ fill: '#10233d', stroke: '#1f4b7a', text: TECH_TEXT }, {
    start: { fill: '#0c3350', stroke: '#00bdec', text: TECH_TEXT },
    end: { fill: '#1b2a4a', stroke: '#7094db', text: TECH_TEXT },
    decision: { fill: '#0f2f46', stroke: '#33ccff', text: TECH_TEXT },
    io: { fill: '#132a52', stroke: '#0080ff', text: TECH_TEXT },
    circle: { fill: '#0b1424', stroke: '#33ccff', text: TECH_TEXT },
  }),
  background: '#0b1424',
  grid: { type: 'line', size: 40, color: '#12213a' },
  node: { radius: 4, shadowColor: 'rgba(0,189,236,0.25)', shadowOffsetY: 0 },
  edge: { stroke: '#2f6aa3', labelColor: '#99cce6', labelBackground: '#0b1424', labelBorder: '#1f4b7a' },
  lane: {
    fill: 'rgba(0,189,236,0.03)', alternateFill: 'rgba(0,189,236,0.06)', headerFill: '#0f2340',
    headerTextColor: '#99cce6', borderColor: '#1f4b7a',
  },
  title: { color: TECH_TEXT },
  selected: '#33ccff',
  hover: '#7abaf2',
  port: { fill: '#0b1424', stroke: '#33ccff' },
  status: { pending: '#3a5897', running: '#00bdec', done: '#4dd0a1', error: '#ff6e76' },
});
