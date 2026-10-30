import { init } from 'echarts/core';
import { FlowEditor, type FlowGraph, type FlowThemeName } from '../../src/index';
import { bindButton } from './shared/caseUtils';

const SHOWCASE_GRAPH: FlowGraph = {
  nodes: [
    { id: 'start', label: '开始', shape: 'start', status: 'done' },
    { id: 'input', label: '读取配置', shape: 'io', status: 'done' },
    { id: 'check', label: '配置有效?', shape: 'decision', status: 'running' },
    { id: 'run', label: '执行任务', shape: 'process', status: 'pending' },
    { id: 'fail', label: '报错退出', shape: 'process', status: 'error' },
    { id: 'end', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'input' },
    { id: 'e2', source: 'input', target: 'check' },
    { id: 'e3', source: 'check', target: 'run', label: '是' },
    { id: 'e4', source: 'check', target: 'fail', label: '否' },
    { id: 'e5', source: 'run', target: 'end' },
    { id: 'e6', source: 'fail', target: 'end' },
  ],
};

const editors = Array.from(document.querySelectorAll<HTMLElement>('[data-theme]')).map((container) => {
  const chart = init(container);
  window.addEventListener('resize', () => chart.resize());
  const editor = new FlowEditor(chart, { graph: SHOWCASE_GRAPH, theme: container.dataset.theme as FlowThemeName });
  editor.setSelection({ nodeIds: ['run'], edgeIds: [] });
  return editor;
});

bindButton('#zoom-in-button', () => editors.forEach((editor) => editor.zoomIn()));
bindButton('#zoom-out-button', () => editors.forEach((editor) => editor.zoomOut()));
bindButton('#fit-button', () => editors.forEach((editor) => editor.fitView()));
