// @vitest-environment node
import * as echarts from 'echarts';
import { buildFlowOption, flowExtension, type FlowGraph } from '../src/index';

echarts.use(flowExtension);

const CHART_SIZE = { width: 600, height: 400 };

const APPROVAL_GRAPH: FlowGraph = {
  nodes: [
    { id: 'start', label: '提交申请', shape: 'start' },
    { id: 'check', label: '金额大于一万?', shape: 'decision' },
    { id: 'manager', label: '经理审批', shape: 'process', status: 'running' },
    { id: 'end', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'check' },
    { id: 'e2', source: 'check', target: 'manager', label: '是' },
    { id: 'e3', source: 'check', target: 'end', label: '否' },
    { id: 'e4', source: 'manager', target: 'end' },
  ],
};

function renderToSvg(graph: FlowGraph): string {
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, ...CHART_SIZE });
  chart.setOption({ animation: false, ...buildFlowOption(graph) });
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

describe('flow series SSR rendering', () => {
  it('should render node labels into the SVG output', () => {
    // Act
    const svg = renderToSvg(APPROVAL_GRAPH);

    // Assert
    expect(svg).toContain('经理审批');
  });

  it('should render edge labels into the SVG output', () => {
    // Act
    const svg = renderToSvg(APPROVAL_GRAPH);

    // Assert
    expect(svg).toContain('>否<');
  });

  it('should render one diamond polygon per decision node plus arrows', () => {
    // Act
    const svg = renderToSvg(APPROVAL_GRAPH);

    // Assert: 1 decision diamond + 4 arrowheads
    const POLYGON_COUNT = 5;
    expect(svg.match(/<path d="M[^"]*Z"/g)?.length ?? 0).toBeGreaterThanOrEqual(POLYGON_COUNT);
  });
});
