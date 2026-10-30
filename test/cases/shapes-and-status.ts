import { init } from 'echarts/core';
import { buildFlowOption, calcFitViewport, type FlowEdge, type FlowGraph, type FlowNode, type FlowNodeShape, type FlowStatus } from '../../src/index';
import { getElement } from './shared/caseUtils';

const SHAPES: FlowNodeShape[] = ['start', 'process', 'decision', 'io', 'end'];
const STATUSES: (FlowStatus | undefined)[] = [undefined, 'pending', 'running', 'done', 'error'];
/** Wider than MAX_NODE_WIDTH so auto-widened decision nodes never overlap. */
const COLUMN_GAP = 270;
const ROW_GAP = 100;
const LONG_LABELS = ['短', '中等长度的标签', '这是一个会让节点自动变宽的较长标签', '超长标签'.repeat(10)];

function buildMatrixGraph(): FlowGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  SHAPES.forEach((shape, row) => {
    STATUSES.forEach((status, column) => {
      const id = `${shape}-${column}`;
      nodes.push({ id, shape, status, label: `${shape} / ${status ?? '无状态'}`, x: column * COLUMN_GAP, y: row * ROW_GAP });
      if (column > 0) {
        edges.push({ id: `edge-${id}`, source: `${shape}-${column - 1}`, target: id });
      }
    });
  });
  const longRowY = SHAPES.length * ROW_GAP;
  LONG_LABELS.forEach((label, column) => {
    nodes.push({ id: `long-${column}`, shape: 'process', label, x: column * COLUMN_GAP, y: longRowY });
  });
  return { nodes, edges };
}

const graph = buildMatrixGraph();
const chart = init(getElement<HTMLElement>('#chart'));
const viewport = calcFitViewport(graph, chart.getWidth(), chart.getHeight());
chart.setOption(buildFlowOption(graph, { viewport }));
