import { FlowEditor, type FlowGraph, type FlowStatus } from '../../src/index';
import { bindButton, getElement, initCaseChart } from './shared/caseUtils';

const STEP_DELAY = 1000;

const PIPELINE_GRAPH: FlowGraph = {
  nodes: [
    { id: 'push', label: '代码提交', shape: 'start' },
    { id: 'lint', label: '代码检查', shape: 'process' },
    { id: 'build', label: '编译打包', shape: 'process' },
    { id: 'test', label: '单元测试', shape: 'process' },
    { id: 'gate', label: '质量门禁', shape: 'decision' },
    { id: 'deploy', label: '部署到预发', shape: 'io' },
    { id: 'done', label: '发布完成', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'push', target: 'lint' },
    { id: 'e2', source: 'push', target: 'build' },
    { id: 'e3', source: 'build', target: 'test' },
    { id: 'e4', source: 'lint', target: 'gate' },
    { id: 'e5', source: 'test', target: 'gate' },
    { id: 'e6', source: 'gate', target: 'deploy', label: '通过' },
    { id: 'e7', source: 'deploy', target: 'done' },
  ],
};

/** Each step sets the listed statuses; the test node fails once and then passes on retry. */
const SCRIPT: { title: string; statuses: Record<string, FlowStatus> }[] = [
  { title: '提交触发', statuses: { push: 'running' } },
  { title: '并行执行检查和编译', statuses: { push: 'done', lint: 'running', build: 'running' } },
  { title: '检查通过，开始测试', statuses: { lint: 'done', build: 'done', test: 'running' } },
  { title: '测试失败', statuses: { test: 'error' } },
  { title: '重试测试', statuses: { test: 'running' } },
  { title: '测试通过，进入门禁', statuses: { test: 'done', gate: 'running' } },
  { title: '部署', statuses: { gate: 'done', deploy: 'running' } },
  { title: '完成', statuses: { deploy: 'done', done: 'done' } },
];

const stepLabel = getElement<HTMLElement>('#step');
const editableToggle = getElement<HTMLInputElement>('#editable-toggle');
const chart = initCaseChart(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart, { graph: PIPELINE_GRAPH, isEditable: false });

let timer: number | null = null;

function resetStatuses(): void {
  editor.getGraph().nodes.forEach((node) => editor.setNodeStatus(node.id, 'pending'));
}

function stopRun(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function startRun(): void {
  stopRun();
  resetStatuses();
  let stepIndex = 0;
  timer = window.setInterval(() => {
    const step = SCRIPT[stepIndex];
    Object.entries(step.statuses).forEach(([nodeId, status]) => editor.setNodeStatus(nodeId, status));
    stepLabel.textContent = `步骤 ${stepIndex + 1}/${SCRIPT.length}：${step.title}`;
    stepIndex++;
    if (stepIndex === SCRIPT.length) {
      stopRun();
    }
  }, STEP_DELAY);
}

bindButton('#run-button', startRun);
bindButton('#reset-button', () => {
  stopRun();
  resetStatuses();
  stepLabel.textContent = '';
});
editableToggle.addEventListener('change', () => editor.setEditable(editableToggle.checked));
window.addEventListener('resize', () => chart.resize());
resetStatuses();
