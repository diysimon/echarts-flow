import { buildFlowOption, calcFitViewport } from './buildFlowOption';
import {
  DRAFT_EDGE_ID,
  FLOW_EDGE_SERIES_ID,
  FLOW_EDGE_SERIES_TYPE,
  FLOW_GRID_SERIES_TYPE,
  FLOW_LANE_SERIES_ID,
  FLOW_LANE_SERIES_TYPE,
  FLOW_NODE_SERIES_ID,
  FLOW_NODE_SERIES_TYPE,
  FLOW_OVERLAY_SERIES_ID,
  FLOW_OVERLAY_SERIES_TYPE,
  FLOW_OVERVIEW_SERIES_ID,
  FLOW_OVERVIEW_SERIES_TYPE,
  type FlowEdgePayload,
  type FlowLanePayload,
  type FlowNodePayload,
  type FlowOverlayPayload,
  type FlowOverviewPayload,
} from '../render/flowPayload';
import { darkTheme, techBlueTheme } from '../theme/darkThemes';
import type { FlowGraph } from '../types';

function createGraph(): FlowGraph {
  return {
    nodes: [
      { id: 'a', label: '开始', shape: 'start' },
      { id: 'b', label: '处理', shape: 'process', status: 'running' },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'dangling', source: 'a', target: 'ghost' },
    ],
  };
}

function findSeries(option: ReturnType<typeof buildFlowOption>, id: string) {
  const series = option.series.find((item) => item.id === id);
  if (!series) {
    throw new Error(`Missing series ${id}`);
  }
  return series;
}

function getPayloads(option: ReturnType<typeof buildFlowOption>) {
  return {
    edge: findSeries(option, FLOW_EDGE_SERIES_ID).itemPayload as unknown as FlowEdgePayload,
    node: findSeries(option, FLOW_NODE_SERIES_ID).itemPayload as unknown as FlowNodePayload,
    lane: findSeries(option, FLOW_LANE_SERIES_ID).itemPayload as unknown as FlowLanePayload,
    overlay: findSeries(option, FLOW_OVERLAY_SERIES_ID).itemPayload as unknown as FlowOverlayPayload,
    overview: findSeries(option, FLOW_OVERVIEW_SERIES_ID).itemPayload as unknown as FlowOverviewPayload,
  };
}

describe('buildFlowOption', () => {
  it('should stack grid, lanes, edges, nodes and the overlay from bottom to top', () => {
    // Act
    const option = buildFlowOption(createGraph());

    // Assert
    expect(option.series.map((series) => series.renderItem)).toEqual([
      FLOW_GRID_SERIES_TYPE,
      FLOW_LANE_SERIES_TYPE,
      FLOW_OVERVIEW_SERIES_TYPE,
      FLOW_EDGE_SERIES_TYPE,
      FLOW_NODE_SERIES_TYPE,
      FLOW_OVERLAY_SERIES_TYPE,
    ]);
  });

  it('should add one lane item per lane plus one for the title', () => {
    // Arrange
    const graph: FlowGraph = { ...createGraph(), title: '标题', lanes: [{ id: 'l1', label: 'L1' }, { id: 'l2', label: 'L2' }] };

    // Act
    const option = buildFlowOption(graph);

    // Assert
    expect(findSeries(option, FLOW_LANE_SERIES_ID).data).toHaveLength(3);
  });

  it('should size lanes that have no size yet', () => {
    // Arrange
    const graph: FlowGraph = { ...createGraph(), lanes: [{ id: 'l1', label: 'L1' }] };

    // Act
    const { lane } = getPayloads(buildFlowOption(graph));

    // Assert
    expect(lane.lanes[0].width).toBeGreaterThan(0);
  });

  it('should apply an edge style override', () => {
    // Arrange
    const graph = createGraph();
    graph.edges[0] = { ...graph.edges[0], style: { lineDash: [4, 4], targetArrow: 'circle' } };

    // Act
    const { edge } = getPayloads(buildFlowOption(graph));

    // Assert
    expect([edge.edges[0].appearance.lineDash, edge.edges[0].appearance.targetArrow]).toEqual([[4, 4], 'circle']);
  });

  it('should route an edge as a curve when its style asks for it', () => {
    // Arrange
    const graph = createGraph();
    graph.edges[0] = { ...graph.edges[0], style: { routing: 'curved' } };

    // Act
    const { edge } = getPayloads(buildFlowOption(graph));

    // Assert
    expect(edge.edges[0].isCurve).toBe(true);
  });

  it('should fill positions for nodes without coordinates', () => {
    // Act
    const { node } = getPayloads(buildFlowOption(createGraph()));

    // Assert
    expect(node.nodes.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y))).toBe(true);
  });

  it('should skip edges that point to missing nodes', () => {
    // Act
    const { edge } = getPayloads(buildFlowOption(createGraph()));

    // Assert
    expect(edge.edges.map((item) => item.id)).toEqual(['e1']);
  });

  it('should mark edges into a running node as running', () => {
    // Act
    const { edge } = getPayloads(buildFlowOption(createGraph()));

    // Assert
    expect(edge.edges[0].isRunning).toBe(true);
  });

  it('should append a draft edge when connecting', () => {
    // Act
    const option = buildFlowOption(createGraph(), { draftEdge: { sourceId: 'a', target: { x: 500, y: 500 } } });

    // Assert
    const { edges } = getPayloads(option).edge;
    expect(edges[edges.length - 1].id).toBe(DRAFT_EDGE_ID);
  });

  it('should keep data length in sync with payload items', () => {
    // Act
    const option = buildFlowOption(createGraph());

    // Assert
    expect(findSeries(option, FLOW_NODE_SERIES_ID).data).toHaveLength(2);
  });

  it('should pass selection ids into payloads', () => {
    // Act
    const option = buildFlowOption(createGraph(), { selection: { nodeIds: ['a'], edgeIds: ['e1'] } });

    // Assert
    expect(getPayloads(option).node.selectedIds).toEqual(['a']);
  });

  it('should resolve a theme name into payloads', () => {
    // Act
    const option = buildFlowOption(createGraph(), { theme: 'dark' });

    // Assert
    expect(getPayloads(option).edge.theme).toBe(darkTheme);
  });

  it('should use the theme background as chart background', () => {
    // Act
    const option = buildFlowOption(createGraph(), { theme: 'tech-blue' });

    // Assert
    expect(option.backgroundColor).toBe(techBlueTheme.background);
  });

  it('should put handles on both ends of the handle edge', () => {
    // Act
    const option = buildFlowOption(createGraph(), { handleEdgeId: 'e1' });

    // Assert
    expect(getPayloads(option).overlay.edgeHandles.map((handle) => handle.end)).toEqual(['source', 'target']);
  });

  it('should show no edge handles when no handle edge is given', () => {
    // Act
    const option = buildFlowOption(createGraph());

    // Assert
    expect(getPayloads(option).overlay.edgeHandles).toEqual([]);
  });

  it('should drop nodes far outside the view when a view size is given', () => {
    // Arrange
    const graph: FlowGraph = {
      nodes: [
        { id: 'near', label: 'Near', shape: 'process', x: 100, y: 100 },
        { id: 'far', label: 'Far', shape: 'process', x: 5000, y: 100 },
      ],
      edges: [],
    };

    // Act
    const option = buildFlowOption(graph, { viewSize: { width: 800, height: 600 } });

    // Assert
    expect(getPayloads(option).node.nodes.map((node) => node.id)).toEqual(['near']);
  });

  it('should keep nodes within one view size of the visible area', () => {
    // Arrange: 1000 is past the 800px view but inside the margin
    const graph: FlowGraph = { nodes: [{ id: 'margin', label: 'M', shape: 'process', x: 1000, y: 100 }], edges: [] };

    // Act
    const option = buildFlowOption(graph, { viewSize: { width: 800, height: 600 } });

    // Assert
    expect(getPayloads(option).node.nodes).toHaveLength(1);
  });

  it('should end the draft at the node when the draft is reversed', () => {
    // Act
    const option = buildFlowOption(createGraph(), { draftEdge: { sourceId: 'b', target: { x: 500, y: 500 }, isReversed: true } });

    // Assert
    const draft = getPayloads(option).edge.edges.find((edge) => edge.id === DRAFT_EDGE_ID);
    expect(draft?.points[0]).toEqual({ x: 500, y: 500 });
  });
});

describe('buildFlowOption overview', () => {
  const VIEW_SIZE = { width: 800, height: 600 };

  function createGrid(count: number): FlowGraph {
    const columns = Math.ceil(Math.sqrt(count));
    const nodes = Array.from({ length: count }, (_, index) => ({
      id: `n${index}`,
      label: `N${index}`,
      shape: 'process' as const,
      x: (index % columns) * 20,
      y: Math.floor(index / columns) * 20,
    }));
    return { nodes, edges: [{ id: 'e', source: 'n0', target: 'n1' }] };
  }

  it('should batch nodes when more than overviewNodeCount are visible', () => {
    // Act
    const option = buildFlowOption(createGrid(4), { viewSize: VIEW_SIZE, renderer: 'canvas', overviewNodeCount: 3 });

    // Assert
    expect(getPayloads(option).overview.nodes.nodes).toHaveLength(4);
  });

  it('should draw every node in detail when few are visible', () => {
    // Act
    const option = buildFlowOption(createGrid(4), { viewSize: VIEW_SIZE, renderer: 'canvas', overviewNodeCount: 10 });

    // Assert
    expect(findSeries(option, FLOW_OVERVIEW_SERIES_ID).data).toHaveLength(0);
  });

  it('should keep detail when the renderer is svg', () => {
    // Act
    const option = buildFlowOption(createGrid(4), { viewSize: VIEW_SIZE, renderer: 'svg', detailLevel: 'overview' });

    // Assert
    expect(getPayloads(option).node.nodes).toHaveLength(4);
  });

  it('should keep the selected node out of the batch when in overview', () => {
    // Act
    const option = buildFlowOption(createGrid(4), {
      viewSize: VIEW_SIZE,
      renderer: 'canvas',
      detailLevel: 'overview',
      selection: { nodeIds: ['n2'], edgeIds: [] },
    });

    // Assert
    expect(getPayloads(option).node.nodes.map((node) => node.id)).toEqual(['n2']);
  });

  it('should keep nodes with gradient fills out of the batch when in overview', () => {
    // Arrange
    const graph = createGrid(2);
    graph.nodes[0].style = { fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] } };

    // Act
    const option = buildFlowOption(graph, { viewSize: VIEW_SIZE, renderer: 'canvas', detailLevel: 'overview' });

    // Assert
    expect(getPayloads(option).node.nodes.map((node) => node.id)).toEqual(['n0']);
  });
});

describe('calcFitViewport', () => {
  it('should return a finite viewport for an unpositioned graph', () => {
    // Act
    const viewport = calcFitViewport(createGraph(), 800, 600);

    // Assert
    expect([viewport.x, viewport.y, viewport.scale].every(Number.isFinite)).toBe(true);
  });
});
