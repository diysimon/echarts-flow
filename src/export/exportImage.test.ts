import * as echarts from 'echarts';
import { exportFlowSvg } from './exportImage';
import { flowExtension } from '../install';
import type { FlowGraph } from '../types';

echarts.use(flowExtension);

// jsdom has no canvas; give zrender a fixed-width text measurer.
const FAKE_CHAR_WIDTH = 7;
echarts.setPlatformAPI({ measureText: (text: string) => ({ width: text.length * FAKE_CHAR_WIDTH }) });

const GRAPH: FlowGraph = {
  nodes: [
    { id: 'a', label: 'Start', shape: 'start', x: 0, y: 0 },
    { id: 'b', label: 'Far away', shape: 'process', x: 900, y: 700 },
  ],
  edges: [{ id: 'e1', source: 'a', target: 'b', label: 'go' }],
};

function readSize(svg: string): [number, number] {
  const match = /<svg[^>]*width="(\d+)"[^>]*height="(\d+)"/.exec(svg);
  return [Number(match?.[1]), Number(match?.[2])];
}

describe('exportFlowSvg', () => {
  it('should size the image to fit the whole graph when nodes are far apart', () => {
    // Act
    const svg = exportFlowSvg(GRAPH, { padding: 0 });

    // Assert
    const [width, height] = readSize(svg);
    expect(width > 900 && height > 700).toBe(true);
  });

  it('should scale the image size with the scale option', () => {
    // Arrange
    const [baseWidth] = readSize(exportFlowSvg(GRAPH, { padding: 0 }));

    // Act
    const [width] = readSize(exportFlowSvg(GRAPH, { padding: 0, scale: 2 }));

    // Assert
    expect(width).toBe(baseWidth * 2);
  });

  it('should include node labels as text', () => {
    // Act
    const svg = exportFlowSvg(GRAPH);

    // Assert
    expect(svg).toContain('Far away');
  });
});
