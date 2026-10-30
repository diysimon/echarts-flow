import { init } from 'echarts/core';
import { FlowEditor, type FlowGraph, type FlowStatus } from '../../src/index';
import { bindButton, getElement } from './shared/caseUtils';

const STEP_DELAY = 900;

const RELEASE_LANES: FlowGraph = {
  title: 'Feature release',
  lanes: [
    { id: 'design', label: 'Design' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'quality', label: 'Quality' },
  ],
  nodes: [
    { id: 'brief', label: 'Product brief', shape: 'start', laneId: 'design' },
    { id: 'mockups', label: 'High-fidelity mockups', shape: 'process', laneId: 'design' },
    { id: 'review', label: 'Design review', shape: 'decision', laneId: 'design' },
    { id: 'build', label: 'Build feature', shape: 'process', laneId: 'engineering' },
    { id: 'api', label: 'API & schema', shape: 'database', laneId: 'engineering' },
    { id: 'tests', label: 'Automated tests', shape: 'subprocess', laneId: 'quality' },
    { id: 'pass', label: 'All green?', shape: 'decision', laneId: 'quality' },
    { id: 'ship', label: 'Ship it', shape: 'end', laneId: 'engineering' },
  ],
  edges: [
    { id: 'e1', source: 'brief', target: 'mockups' },
    { id: 'e2', source: 'mockups', target: 'review' },
    { id: 'e3', source: 'review', target: 'build', label: 'Approved' },
    { id: 'e4', source: 'review', target: 'mockups', label: 'Iterate' },
    { id: 'e5', source: 'build', target: 'api' },
    { id: 'e6', source: 'api', target: 'tests' },
    { id: 'e7', source: 'tests', target: 'pass' },
    { id: 'e8', source: 'pass', target: 'ship', label: 'Yes' },
    { id: 'e9', source: 'pass', target: 'build', label: 'Fix' },
  ],
};

const AGENT_FLOW: FlowGraph = {
  nodes: [
    { id: 'prompt', label: 'User prompt', shape: 'start' },
    { id: 'plan', label: 'Plan steps', shape: 'process' },
    { id: 'tool', label: 'Needs a tool?', shape: 'decision' },
    { id: 'search', label: 'Web search', shape: 'subprocess' },
    { id: 'memory', label: 'Vector memory', shape: 'database' },
    { id: 'draft', label: 'Draft answer', shape: 'process' },
    { id: 'check', label: 'Self-check', shape: 'hexagon' },
    { id: 'reply', label: 'Reply', shape: 'end' },
  ],
  edges: [
    { id: 'a1', source: 'prompt', target: 'plan' },
    { id: 'a2', source: 'plan', target: 'tool' },
    { id: 'a3', source: 'tool', target: 'search', label: 'Yes' },
    { id: 'a4', source: 'tool', target: 'draft', label: 'No' },
    { id: 'a5', source: 'search', target: 'memory' },
    { id: 'a6', source: 'memory', target: 'draft' },
    { id: 'a7', source: 'draft', target: 'check' },
    { id: 'a8', source: 'check', target: 'reply' },
  ],
};

function createEditor(selector: string, graph: FlowGraph, theme: 'aurora' | 'aurora-dark', direction: 'TB' | 'LR'): FlowEditor {
  const chart = init(getElement<HTMLElement>(selector));
  window.addEventListener('resize', () => chart.resize());
  return new FlowEditor(chart, { graph, theme, direction });
}

const lightEditor = createEditor('#chart-light', RELEASE_LANES, 'aurora', 'LR');
const darkEditor = createEditor('#chart-dark', AGENT_FLOW, 'aurora-dark', 'LR');
lightEditor.setSelection({ nodeIds: ['build'], edgeIds: [] });
darkEditor.setSelection({ nodeIds: ['draft'], edgeIds: [] });

let timer: number | null = null;

/** Walks each graph in node order: the current node runs, earlier ones are done. */
function toggleRun(): void {
  const editors = [lightEditor, darkEditor];
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
    editors.forEach((editor) => editor.getGraph().nodes.forEach((node) => editor.setNodeStatus(node.id, undefined)));
    return;
  }
  let step = 0;
  timer = window.setInterval(() => {
    editors.forEach((editor) => {
      const { nodes } = editor.getGraph();
      nodes.forEach((node, index) => {
        const status: FlowStatus | undefined = index < step % (nodes.length + 1) ? 'done' : index === step % (nodes.length + 1) ? 'running' : undefined;
        editor.setNodeStatus(node.id, status);
      });
    });
    step++;
  }, STEP_DELAY);
}

bindButton('#run-button', toggleRun);
bindButton('#fit-button', () => [lightEditor, darkEditor].forEach((editor) => editor.fitView()));
