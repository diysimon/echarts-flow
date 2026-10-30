import {
  createFlowTheme,
  FlowEditor,
  lightTheme,
  resolveFlowTheme,
  type ArrowType,
  type EdgeRouting,
  type FlowEdge,
  type FlowEdgeStyle,
  type FlowGraph,
  type FlowNode,
  type FlowNodeShape,
  type FlowNodeStyle,
  type FlowThemeName,
} from '../../src/index';
import { bindButton, getElement, initCaseChart } from './shared/caseUtils';

const SHAPES: FlowNodeShape[] = ['start', 'end', 'process', 'decision', 'io', 'circle', 'hexagon', 'document', 'database', 'subprocess', 'text'];
const ARROWS: ArrowType[] = ['triangle', 'triangle-open', 'vee', 'circle', 'circle-open', 'diamond', 'diamond-open', 'none'];
const ROUTINGS: EdgeRouting[] = ['orthogonal', 'straight', 'curved'];
const SHAPE_GAP = 150;
const ARROW_GAP = 210;
const ROUTING_GAP = 420;
const SECTION_Y = { shapes: 0, arrows: 140, routing: 320, lineStyles: 640, nodeStyles: 780 };

const LINE_STYLES: { label: string; style: FlowEdgeStyle }[] = [
  { label: '虚线 [6,4]', style: { lineDash: [6, 4] } },
  { label: '点线 [1,4]', style: { lineDash: [1, 4], lineWidth: 2 } },
  { label: '线宽 3', style: { lineWidth: 3, arrowSize: 14 } },
  { label: '颜色 + 双向', style: { stroke: '#e6a23c', sourceArrow: 'triangle', labelColor: '#e6a23c', labelBorder: '#e6a23c' } },
  { label: '透明度 0.4', style: { opacity: 0.4 } },
  { label: '标签底色', style: { labelBackground: '#5070dd', labelColor: '#ffffff', labelBorder: '#5070dd', labelFontSize: 13 } },
];

const NODE_STYLES: { label: string; style: FlowNodeStyle }[] = [
  { label: '填充+描边', style: { fill: '#ffe7a8', stroke: '#e3a21a' } },
  { label: '虚线边框', style: { lineDash: [5, 3], lineWidth: 1.5 } },
  { label: '大号粗体', style: { fontSize: 18, fontWeight: 'bold' } },
  { label: '直角', style: { radius: 0 } },
  { label: '大圆角', style: { radius: 20 } },
  { label: '半透明', style: { opacity: 0.45 } },
  { label: '深色阴影', style: { shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: 16, shadowOffsetY: 6 } },
  { label: '文字颜色', style: { textColor: '#d9534f' } },
];

function buildGalleryGraph(): FlowGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const addPair = (id: string, x: number, y: number, dx: number, dy: number, label: string, style: FlowEdgeStyle) => {
    nodes.push({ id: `${id}-a`, label: 'A', shape: 'circle', x, y }, { id: `${id}-b`, label: 'B', shape: 'circle', x: x + dx, y: y + dy });
    edges.push({ id, source: `${id}-a`, target: `${id}-b`, label, style });
  };

  SHAPES.forEach((shape, index) => nodes.push({ id: `shape-${shape}`, label: shape, shape, x: index * SHAPE_GAP, y: SECTION_Y.shapes }));
  ARROWS.forEach((arrow, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    addPair(`arrow-${arrow}`, column * ARROW_GAP * 1.6, SECTION_Y.arrows + row * 80, ARROW_GAP, 0, arrow, { targetArrow: arrow });
  });
  ROUTINGS.forEach((routing, index) => {
    const x = index * ROUTING_GAP;
    addPair(`routing-${routing}`, x, SECTION_Y.routing, 180, 120, routing, { routing });
    // An unlabeled dashed back edge from the lower node shows how each routing handles loops.
    edges.push({ id: `routing-${routing}-back`, source: `routing-${routing}-b`, target: `routing-${routing}-a`, style: { routing, lineDash: [4, 3] } });
  });
  LINE_STYLES.forEach(({ label, style }, index) => addPair(`line-${index}`, index * 260, SECTION_Y.lineStyles, 170, 0, label, style));
  NODE_STYLES.forEach(({ label, style }, index) => {
    nodes.push({ id: `node-style-${index}`, label, shape: 'process', x: index * SHAPE_GAP, y: SECTION_Y.nodeStyles, style });
  });
  return { nodes, edges };
}

const CUSTOM_THEME = createFlowTheme(lightTheme, {
  grid: { type: 'line', size: 30, color: '#eef0f4' },
  text: { fontSize: 12, fontWeight: 500 },
  node: { radius: 12, lineWidth: 2, activeLineWidth: 3, shadowBlur: 0 },
  edge: { routing: 'curved', targetArrow: 'triangle-open', arrowSize: 12, stroke: '#7b61ff', lineWidth: 2, activeLineWidth: 3 },
  selected: '#ff6a00',
});

const themeSelect = getElement<HTMLSelectElement>('#theme-select');
const chart = initCaseChart(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart, { graph: buildGalleryGraph(), shouldSnapToGrid: false });

themeSelect.addEventListener('change', () => {
  const value = themeSelect.value;
  editor.setTheme(value === 'custom' ? CUSTOM_THEME : resolveFlowTheme(value as FlowThemeName));
});
bindButton('#fit-button', () => editor.fitView());
window.addEventListener('resize', () => chart.resize());
