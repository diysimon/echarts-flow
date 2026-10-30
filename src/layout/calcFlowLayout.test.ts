import { calcFlowLayout, fillMissingPositions } from './calcFlowLayout';
import type { FlowGraph } from '../types';

function createChainGraph(): FlowGraph {
  return {
    nodes: [
      { id: 'a', label: 'A', shape: 'start' },
      { id: 'b', label: 'B', shape: 'process' },
      { id: 'c', label: 'C', shape: 'end' },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ],
  };
}

function getNode(graph: FlowGraph, id: string) {
  const node = graph.nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`Missing node ${id}`);
  }
  return node;
}

describe('calcFlowLayout', () => {
  it('should place each rank lower than the previous when direction is TB', () => {
    // Act
    const result = calcFlowLayout(createChainGraph(), { direction: 'TB' });

    // Assert
    const ys = ['a', 'b', 'c'].map((id) => getNode(result, id).y ?? 0);
    expect(ys[0] < ys[1] && ys[1] < ys[2]).toBe(true);
  });

  it('should place each rank further right when direction is LR', () => {
    // Act
    const result = calcFlowLayout(createChainGraph(), { direction: 'LR' });

    // Assert
    const xs = ['a', 'b', 'c'].map((id) => getNode(result, id).x ?? 0);
    expect(xs[0] < xs[1] && xs[1] < xs[2]).toBe(true);
  });

  it('should not throw when graph contains a cycle', () => {
    // Arrange
    const graph = createChainGraph();
    graph.edges.push({ id: 'back', source: 'c', target: 'a' });

    // Act & Assert
    expect(() => calcFlowLayout(graph)).not.toThrow();
  });

  it('should ignore edges that point to missing nodes', () => {
    // Arrange
    const graph = createChainGraph();
    graph.edges.push({ id: 'dangling', source: 'a', target: 'ghost' });

    // Act
    const result = calcFlowLayout(graph);

    // Assert
    expect(result.nodes).toHaveLength(3);
  });

  it('should position isolated nodes', () => {
    // Arrange
    const graph: FlowGraph = { nodes: [{ id: 'lonely', label: 'L', shape: 'process' }], edges: [] };

    // Act
    const result = calcFlowLayout(graph);

    // Assert
    expect(Number.isFinite(getNode(result, 'lonely').x)).toBe(true);
  });
});

describe('fillMissingPositions', () => {
  it('should keep existing positions when some nodes are positioned', () => {
    // Arrange
    const graph = createChainGraph();
    graph.nodes[0] = { ...graph.nodes[0], x: 999, y: 999 };

    // Act
    const result = fillMissingPositions(graph);

    // Assert
    expect([getNode(result, 'a').x, getNode(result, 'a').y]).toEqual([999, 999]);
  });

  it('should return the same graph when all nodes are positioned', () => {
    // Arrange
    const graph = calcFlowLayout(createChainGraph());

    // Act
    const result = fillMissingPositions(graph);

    // Assert
    expect(result).toBe(graph);
  });
});
