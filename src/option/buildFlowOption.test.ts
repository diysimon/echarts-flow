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
  type FlowEdgePayload,
  type FlowLanePayload,
  type FlowNodePayload,
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
  };
}

describe('buildFlowOption', () => {
  it('should stack grid, lanes, edges and nodes from bottom to top', () => {
    // Act
    const option = buildFlowOption(createGraph());

    // Assert
    expect(option.series.map((series) => series.renderItem)).toEqual([
      FLOW_GRID_SERIES_TYPE,
      FLOW_LANE_SERIES_TYPE,
      FLOW_EDGE_SERIES_TYPE,
      FLOW_NODE_SERIES_TYPE,
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
});

describe('calcFitViewport', () => {
  it('should return a finite viewport for an unpositioned graph', () => {
    // Act
    const viewport = calcFitViewport(createGraph(), 800, 600);

    // Assert
    expect([viewport.x, viewport.y, viewport.scale].every(Number.isFinite)).toBe(true);
  });
});
