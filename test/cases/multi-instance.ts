import { init } from 'echarts/core';
import { FlowEditor, type FlowGraph } from '../../src/index';
import { bindButton, getElement } from './shared/caseUtils';

const LEAVE_GRAPH: FlowGraph = {
  nodes: [
    { id: 'apply', label: '请假申请', shape: 'start' },
    { id: 'days', label: '超过 3 天?', shape: 'decision' },
    { id: 'leader', label: '组长审批', shape: 'process' },
    { id: 'hr', label: 'HR 备案', shape: 'process' },
    { id: 'end', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'apply', target: 'days' },
    { id: 'e2', source: 'days', target: 'leader', label: '否' },
    { id: 'e3', source: 'days', target: 'hr', label: '是' },
    { id: 'e4', source: 'leader', target: 'end' },
    { id: 'e5', source: 'hr', target: 'end' },
  ],
};

const EXPORT_BACKGROUND = '#ffffff';
const EXPORT_PIXEL_RATIO = 2;

const canvasChart = init(getElement<HTMLElement>('#chart-canvas'), null, { renderer: 'canvas' });
const svgChart = init(getElement<HTMLElement>('#chart-svg'), null, { renderer: 'svg' });
new FlowEditor(canvasChart, { graph: LEAVE_GRAPH });
new FlowEditor(svgChart, { graph: LEAVE_GRAPH });

function downloadUrl(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
}

bindButton('#export-png-button', () => {
  const url = canvasChart.getDataURL({ type: 'png', pixelRatio: EXPORT_PIXEL_RATIO, backgroundColor: EXPORT_BACKGROUND });
  downloadUrl(url, 'flow.png');
});
bindButton('#export-svg-button', () => {
  downloadUrl(svgChart.getDataURL({ type: 'svg', backgroundColor: EXPORT_BACKGROUND }), 'flow.svg');
});
window.addEventListener('resize', () => {
  canvasChart.resize();
  svgChart.resize();
});
