import { init } from 'echarts/core';
import { FlowEditor, type FlowGraph } from '../../src/index';
import { bindButton, getElement } from './shared/caseUtils';

const SAMPLE_GRAPH: FlowGraph = {
  nodes: [
    { id: 'a', label: '收到工单', shape: 'start' },
    { id: 'b', label: '分配处理人', shape: 'process' },
    { id: 'c', label: '已解决?', shape: 'decision' },
    { id: 'd', label: '关闭工单', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b' },
    { id: 'e2', source: 'b', target: 'c' },
    { id: 'e3', source: 'c', target: 'd', label: '是' },
    { id: 'e4', source: 'c', target: 'b', label: '否' },
  ],
};

const textarea = getElement<HTMLTextAreaElement>('#json');
const statusLabel = getElement<HTMLElement>('#status');
const stripToggle = getElement<HTMLInputElement>('#strip-toggle');
const chart = init(getElement<HTMLElement>('#chart'));

function showGraph(graph: FlowGraph): void {
  textarea.value = JSON.stringify(graph, null, 2);
}

const editor = new FlowEditor(chart, { graph: SAMPLE_GRAPH, onChange: showGraph });

/** Checks the shape of untrusted JSON before handing it to the editor. */
function parseGraph(text: string): FlowGraph {
  const data: unknown = JSON.parse(text);
  const candidate = data as Partial<FlowGraph>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    throw new Error('需要 nodes 和 edges 两个数组');
  }
  candidate.nodes.forEach((node, index) => {
    if (typeof node?.id !== 'string' || typeof node.label !== 'string' || typeof node.shape !== 'string') {
      throw new Error(`nodes[${index}] 缺少 id / label / shape`);
    }
  });
  candidate.edges.forEach((edge, index) => {
    if (typeof edge?.id !== 'string' || typeof edge.source !== 'string' || typeof edge.target !== 'string') {
      throw new Error(`edges[${index}] 缺少 id / source / target`);
    }
  });
  return candidate as FlowGraph;
}

function stripPositions(graph: FlowGraph): FlowGraph {
  return { ...graph, nodes: graph.nodes.map(({ x: _x, y: _y, ...node }) => node) };
}

function importGraph(): void {
  try {
    const parsed = parseGraph(textarea.value);
    editor.setGraph(stripToggle.checked ? stripPositions(parsed) : parsed, true);
    editor.fitView();
    showGraph(editor.getGraph());
    statusLabel.textContent = `导入成功：${parsed.nodes.length} 个节点`;
  } catch (error) {
    console.error('Failed to import flow graph:', error);
    statusLabel.textContent = `导入失败：${(error as Error).message}`;
  }
}

bindButton('#import-button', importGraph);
bindButton('#sample-button', () => showGraph(SAMPLE_GRAPH));
window.addEventListener('resize', () => chart.resize());
showGraph(editor.getGraph());
