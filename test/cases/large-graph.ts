import { calcFlowLayout, FlowEditor, type FlowEdge, type FlowGraph, type FlowNode, type FlowNodeShape } from '../../src/index';
import { getElement, initCaseChart } from './shared/caseUtils';

/** Every n-th node gets a second outgoing edge, giving about 1.3 edges per node. */
const EXTRA_EDGE_INTERVAL = 3;
const DECISION_INTERVAL = 7;

/** Deterministic layered graph so timings are comparable between runs. */
function generateGraph(nodeCount: number): FlowGraph {
  const layerSize = Math.max(1, Math.round(Math.sqrt(nodeCount) / 2));
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  for (let index = 0; index < nodeCount; index++) {
    const shape: FlowNodeShape = index === 0 ? 'start' : index % DECISION_INTERVAL === 0 ? 'decision' : 'process';
    nodes.push({ id: `n${index}`, label: `步骤 ${index}`, shape });
  }
  for (let index = layerSize; index < nodeCount; index++) {
    const layerStart = Math.floor(index / layerSize) * layerSize;
    const parent = layerStart - layerSize + (index % layerSize);
    edges.push({ id: `e${index}`, source: `n${parent}`, target: `n${index}` });
    const extraParent = parent + 1;
    if (index % EXTRA_EDGE_INTERVAL === 0 && extraParent < layerStart) {
      edges.push({ id: `x${index}`, source: `n${extraParent}`, target: `n${index}` });
    }
  }
  return { nodes, edges };
}

const statsLabel = getElement<HTMLElement>('#stats');
const chart = initCaseChart(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart);

function loadGraph(nodeCount: number): void {
  const graph = generateGraph(nodeCount);
  const layoutStart = performance.now();
  const positioned = calcFlowLayout(graph);
  const layoutTime = performance.now() - layoutStart;

  const renderStart = performance.now();
  editor.setGraph(positioned);
  editor.fitView();
  const renderTime = performance.now() - renderStart;

  statsLabel.textContent = `${graph.nodes.length} 节点 / ${graph.edges.length} 连线，`
    + `布局 ${layoutTime.toFixed(0)}ms，渲染 ${renderTime.toFixed(0)}ms`;
}

document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach((button) => {
  button.addEventListener('click', () => loadGraph(Number(button.dataset.count)));
});
window.addEventListener('resize', () => chart.resize());
loadGraph(Number(getElement<HTMLButtonElement>('[data-count]').dataset.count));
