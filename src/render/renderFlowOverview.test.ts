import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';
import { buildFlowScene } from '../option/buildFlowOption';
import type { FlowGraph } from '../types';
import { BATCH_SHAPE } from './elementBatch';
import type { FlowOverviewPayload } from './flowPayload';
import { renderFlowOverview } from './renderFlowOverview';

function createPayload(): FlowOverviewPayload {
  const graph: FlowGraph = {
    nodes: [
      { id: 'a', label: 'A', shape: 'process', x: 0, y: 0 },
      { id: 'b', label: 'B', shape: 'process', x: 0, y: 100 },
      { id: 'c', label: 'C', shape: 'process', x: 0, y: 200 },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ],
  };
  const scene = buildFlowScene(graph);
  const viewport = { x: 0, y: 0, scale: 1 };
  const base = { viewport, theme: scene.theme, pixelRatio: 1, minLabelPixels: 0 };
  return {
    edges: { ...base, edges: scene.edges, selectedIds: [] },
    nodes: { ...base, nodes: scene.nodes, selectedIds: [], hoveredId: null, isEditable: false },
  };
}

function createApi(): CustomSeriesRenderItemAPI {
  const zr = {};
  return {
    getWidth: () => 800,
    getHeight: () => 600,
    getDevicePixelRatio: () => 1,
    getZr: () => zr,
  } as unknown as CustomSeriesRenderItemAPI;
}

function render() {
  const params = { itemPayload: createPayload(), dataIndex: 0 } as unknown as CustomSeriesRenderItemParams;
  return renderFlowOverview(params, createApi()) as unknown as {
    type: string;
    silent: boolean;
    children: { type: string }[];
  };
}

// jsdom has no 2D context; the label layer no-ops without one, which suits this test.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderFlowOverview', () => {
  it('should return one silent group', () => {
    // Act
    const group = render();

    // Assert
    expect(group.type).toBe('group');
    expect(group.silent).toBe(true);
  });

  it('should paint labels as one image per layer', () => {
    // Act
    const images = render().children.filter((child) => child.type === 'image');

    // Assert
    expect(images).toHaveLength(2);
  });

  it('should merge the three same-styled nodes and two edges into a few batches', () => {
    // Act
    const batches = render().children.filter((child) => child.type === BATCH_SHAPE);

    // Assert: far fewer elements than the five nodes and edges would make on their own
    expect(batches.length).toBeLessThanOrEqual(4);
    expect(batches.length).toBeGreaterThan(0);
  });
});
