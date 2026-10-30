import { init } from 'echarts/core';
import { buildFlowOption, calcFitViewport, watchDevicePixelRatio, type FlowGraph, type FlowHitInfo } from '../../src/index';
import { createLogger, getElement } from './shared/caseUtils';

const ORDER_GRAPH: FlowGraph = {
  nodes: [
    { id: 'order', label: '用户下单', shape: 'start' },
    { id: 'pay', label: '支付', shape: 'process' },
    { id: 'paid', label: '支付成功?', shape: 'decision' },
    { id: 'ship', label: '仓库发货', shape: 'process' },
    { id: 'cancel', label: '取消订单', shape: 'process' },
    { id: 'end', label: '完成', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'order', target: 'pay' },
    { id: 'e2', source: 'pay', target: 'paid' },
    { id: 'e3', source: 'paid', target: 'ship', label: '是' },
    { id: 'e4', source: 'paid', target: 'cancel', label: '否' },
    { id: 'e5', source: 'ship', target: 'end' },
    { id: 'e6', source: 'cancel', target: 'end' },
  ],
};

const container = getElement<HTMLElement>('#chart');
const log = createLogger(getElement<HTMLElement>('#log'));
const chart = init(container);
// Without FlowEditor, keep the canvas sharp across browser zoom and display changes manually.
watchDevicePixelRatio(chart);

function renderChart(): void {
  const viewport = calcFitViewport(ORDER_GRAPH, chart.getWidth(), chart.getHeight());
  chart.setOption(buildFlowOption(ORDER_GRAPH, { viewport }));
}

chart.on('click', (params) => {
  const info = (params as { info?: FlowHitInfo }).info;
  if (!info || (info.role !== 'node' && info.role !== 'edge')) {
    return;
  }
  const label = info.role === 'edge'
    ? ORDER_GRAPH.edges.find((edge) => edge.id === info.edgeId)?.label ?? '(无标签)'
    : ORDER_GRAPH.nodes.find((node) => node.id === info.nodeId)?.label;
  log(`click ${info.role}: ${JSON.stringify(info)} → ${label}`);
});

window.addEventListener('resize', () => {
  chart.resize();
  renderChart();
});
renderChart();
