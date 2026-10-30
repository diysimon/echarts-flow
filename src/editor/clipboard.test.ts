import { copyElements, pasteElements } from './clipboard';
import type { FlowGraph } from '../types';

function createGraph(): FlowGraph {
  return {
    nodes: [
      { id: 'a', label: 'A', shape: 'process', x: 0, y: 0, isLocked: true, status: 'done', laneId: 'lane-1' },
      { id: 'b', label: 'B', shape: 'process', x: 0, y: 100 },
      { id: 'c', label: 'C', shape: 'process', x: 0, y: 200 },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b', label: 'go' },
      { id: 'e2', source: 'b', target: 'c' },
    ],
    lanes: [{ id: 'lane-1', label: 'Lane' }],
  };
}

describe('copyElements', () => {
  it('should copy edges whose two ends are both copied', () => {
    // Act
    const clipboard = copyElements(createGraph(), { nodeIds: ['a', 'b'], edgeIds: [] });

    // Assert
    expect(clipboard?.edges.map((edge) => edge.id)).toEqual(['e1']);
  });

  it('should return null when no node is selected', () => {
    // Act
    const clipboard = copyElements(createGraph(), { nodeIds: [], edgeIds: ['e1'] });

    // Assert
    expect(clipboard).toBeNull();
  });
});

describe('pasteElements', () => {
  const graph = createGraph();
  const clipboard = copyElements(graph, { nodeIds: ['a', 'b'], edgeIds: [] })!;

  it('should give pasted nodes ids that are not used yet', () => {
    // Act
    const result = pasteElements(graph, clipboard, { x: 20, y: 20 });

    // Assert
    const originalIds = graph.nodes.map((node) => node.id);
    expect(result.selection.nodeIds.some((id) => originalIds.includes(id))).toBe(false);
  });

  it('should point pasted edges at the pasted nodes', () => {
    // Act
    const result = pasteElements(graph, clipboard, { x: 20, y: 20 });

    // Assert
    const pastedEdge = result.graph.edges.find((edge) => edge.id === result.selection.edgeIds[0]);
    expect([pastedEdge?.source, pastedEdge?.target]).toEqual(result.selection.nodeIds);
  });

  it('should shift pasted nodes by the offset', () => {
    // Act
    const result = pasteElements(graph, clipboard, { x: 20, y: 30 });

    // Assert
    const pasted = result.graph.nodes.find((node) => node.id === result.selection.nodeIds[1]);
    expect([pasted?.x, pasted?.y]).toEqual([20, 130]);
  });

  it('should drop the lock and status when pasting', () => {
    // Act
    const result = pasteElements(graph, clipboard, { x: 20, y: 20 });

    // Assert
    const pasted = result.graph.nodes.find((node) => node.id === result.selection.nodeIds[0]);
    expect([pasted?.isLocked, pasted?.status]).toEqual([undefined, undefined]);
  });

  it('should keep the lane when the lane still exists', () => {
    // Act
    const result = pasteElements(graph, clipboard, { x: 20, y: 20 });

    // Assert
    const pasted = result.graph.nodes.find((node) => node.id === result.selection.nodeIds[0]);
    expect(pasted?.laneId).toBe('lane-1');
  });

  it('should clear the lane when the lane no longer exists', () => {
    // Arrange
    const withoutLanes: FlowGraph = { ...graph, lanes: [] };

    // Act
    const result = pasteElements(withoutLanes, clipboard, { x: 20, y: 20 });

    // Assert
    const pasted = result.graph.nodes.find((node) => node.id === result.selection.nodeIds[0]);
    expect(pasted?.laneId).toBeUndefined();
  });
});
