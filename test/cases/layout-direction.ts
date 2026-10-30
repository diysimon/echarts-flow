import { FlowEditor, type FlowDirection, type FlowGraph } from '../../src/index';
import { getElement, initCaseChart } from './shared/caseUtils';

const RETRY_GRAPH: FlowGraph = {
  nodes: [
    { id: 'start', label: '接收任务', shape: 'start' },
    { id: 'fetch', label: '拉取数据', shape: 'process' },
    { id: 'parse', label: '解析', shape: 'process' },
    { id: 'valid', label: '校验通过?', shape: 'decision' },
    { id: 'retry', label: '重试次数 < 3?', shape: 'decision' },
    { id: 'save', label: '写入数据库', shape: 'io' },
    { id: 'alert', label: '告警', shape: 'process' },
    { id: 'end', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'fetch' },
    { id: 'e2', source: 'fetch', target: 'parse' },
    { id: 'e3', source: 'parse', target: 'valid' },
    { id: 'e4', source: 'valid', target: 'save', label: '是' },
    { id: 'e5', source: 'valid', target: 'retry', label: '否' },
    { id: 'e6', source: 'retry', target: 'fetch', label: '重试' },
    { id: 'e7', source: 'retry', target: 'alert', label: '放弃' },
    { id: 'e8', source: 'save', target: 'end' },
    { id: 'e9', source: 'alert', target: 'end' },
  ],
};

function createEditor(selector: string, direction: FlowDirection): FlowEditor {
  const chart = initCaseChart(getElement<HTMLElement>(selector));
  window.addEventListener('resize', () => chart.resize());
  return new FlowEditor(chart, { graph: RETRY_GRAPH, direction });
}

createEditor('#chart-tb', 'TB');
createEditor('#chart-lr', 'LR');
