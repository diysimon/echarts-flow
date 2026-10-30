import { init } from 'echarts/core';
import { createFlowTheme, FlowEditor, resolveFlowTheme, type FlowEdge, type FlowGraph, type FlowNode, type FlowThemeName } from '../../src/index';
import { bindButton, getElement } from './shared/caseUtils';

type NodeSpec = [id: string, label: string, shape: FlowNode['shape'], laneId: string];
type EdgeSpec = [source: string, target: string, label?: string];

const NODES: NodeSpec[] = [
  ['collect', '需求收集', 'start', 'collect'],
  ['feedback', '用户反馈、运营反馈、市场需求、竞品分析、管理层意见', 'process', 'collect'],
  ['research', '需求调研，确认是否为伪需求?', 'decision', 'collect'],
  ['priority', '确定需求优先级', 'process', 'collect'],
  ['prototype', '根据需求设计产品原型和相关文档', 'process', 'design'],
  ['modify', '根据评审意见，修改和优化', 'process', 'design'],
  ['re-review', '再次评审', 'process', 'design'],
  ['review', '需求提出方、产品设计人员、项目经理进行需求评审', 'process', 'review'],
  ['feasible', '是否满足需求、且能实现', 'decision', 'review'],
  ['freeze', '输出最终原型，对需求进行封版', 'process', 'review'],
  ['interaction', '对需求进行交互设计实现', 'process', 'review'],
  ['design-pass', '评审设计是否通过?', 'decision', 'review'],
  ['kickoff', '产品、设计、研发、QA开需求沟通会', 'process', 'develop'],
  ['develop', '进入研发流程', 'process', 'develop'],
  ['pm-check', '项目经理审核产品、提交验收', 'process', 'develop'],
  ['design-accept', '设计验收', 'process', 'accept'],
  ['design-ok', '验收通过?', 'decision', 'accept'],
  ['product-accept', '产品验收', 'process', 'accept'],
  ['product-ok', '验收通过?', 'decision', 'accept'],
  ['experience', '如果需要，召开产品体验会', 'process', 'accept'],
  ['invite', '邀请产品、设计、研发、QA开产品体验会', 'process', 'release'],
  ['record', '记录反馈问题', 'process', 'release'],
  ['seal', '封版，产品上线', 'process', 'release'],
  ['online', '线上验收，记录反馈问题，修改或者下一版迭代', 'process', 'release'],
  ['finish', '完成', 'end', 'release'],
];

const EDGES: EdgeSpec[] = [
  ['collect', 'feedback'],
  ['feedback', 'research'],
  ['research', 'priority', '是'],
  ['research', 'finish', '否'],
  ['priority', 'prototype'],
  ['prototype', 'review'],
  ['review', 'feasible'],
  ['feasible', 'modify', '否'],
  ['modify', 're-review'],
  ['re-review', 'review'],
  ['feasible', 'freeze', '是'],
  ['freeze', 'interaction'],
  ['interaction', 'design-pass'],
  ['design-pass', 'interaction', '否'],
  ['design-pass', 'kickoff', '是'],
  ['kickoff', 'develop'],
  ['develop', 'pm-check'],
  ['pm-check', 'design-accept'],
  ['design-accept', 'design-ok'],
  ['design-ok', 'develop', '否'],
  ['design-ok', 'product-accept', '是'],
  ['product-accept', 'product-ok'],
  ['product-ok', 'develop', '否'],
  ['product-ok', 'experience', '是'],
  ['experience', 'invite'],
  ['invite', 'record'],
  ['record', 'seal'],
  ['seal', 'online'],
  ['online', 'finish'],
];

const RELEASE_FLOW: FlowGraph = {
  title: '软件产品设计研发流程图',
  lanes: [
    { id: 'collect', label: '需求收集' },
    { id: 'design', label: '原型设计' },
    { id: 'review', label: '需求评审' },
    { id: 'develop', label: '需求开发' },
    { id: 'accept', label: '需求验收' },
    { id: 'release', label: '产品发版' },
  ],
  nodes: NODES.map(([id, label, shape, laneId]) => ({ id, label, shape, laneId })),
  edges: EDGES.map(([source, target, label], index): FlowEdge => ({ id: `e${index + 1}`, source, target, label })),
};

const themeSelect = getElement<HTMLSelectElement>('#theme-select');
const curveToggle = getElement<HTMLInputElement>('#curve-toggle');
const compactToggle = getElement<HTMLInputElement>('#compact-toggle');
const chart = init(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart, {
  graph: RELEASE_FLOW,
  direction: 'TB',
  theme: 'classic',
  layout: { isLaneCompact: compactToggle.checked },
});

function applyTheme(): void {
  const base = resolveFlowTheme(themeSelect.value as FlowThemeName);
  editor.setTheme(curveToggle.checked ? createFlowTheme(base, { edge: { routing: 'curved' } }) : base);
}

bindButton('#layout-button', () => editor.autoLayout());
bindButton('#fit-button', () => editor.fitView());
themeSelect.addEventListener('change', applyTheme);
curveToggle.addEventListener('change', applyTheme);
compactToggle.addEventListener('change', () => {
  editor.setLayoutOptions({ isLaneCompact: compactToggle.checked });
  editor.autoLayout();
});
window.addEventListener('resize', () => chart.resize());
