import {
  addEdge,
  addNode,
  canConnect,
  createUniqueId,
  moveNodes,
  reconnectEdge,
  removeElements,
  setNodePositions,
  snapToGrid,
  updateEdge,
  updateNode,
} from './graphOps';
import type { FlowGraph } from '../types';

function createGraph(): FlowGraph {
  return {
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
}

describe('createUniqueId', () => {
  it('should skip ids that already exist', () => {
    // Act
    const id = createUniqueId('node', ['node-2', 'node-3']);

    // Assert
    expect(id).toBe('node-4');
  });
});

describe('snapToGrid', () => {
  it('should round to the nearest grid line', () => {
    // Act
    const snapped = snapToGrid(16, 10);

    // Assert
    expect(snapped).toBe(20);
  });
});

describe('addNode', () => {
  it('should append the node when id is new', () => {
    // Act
    const result = addNode(createGraph(), { id: 'd', label: 'D', shape: 'end' });

    // Assert
    expect(result.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should throw when id already exists', () => {
    // Act & Assert
    expect(() => addNode(createGraph(), { id: 'a', label: 'A', shape: 'end' })).toThrow('already exists');
  });
});

describe('updateNode', () => {
  it('should patch only the matching node', () => {
    // Act
    const result = updateNode(createGraph(), 'b', { label: 'B2' });

    // Assert
    expect(result.nodes.map((node) => node.label)).toEqual(['A', 'B2', 'C']);
  });

  it('should not mutate the input graph', () => {
    // Arrange
    const graph = createGraph();

    // Act
    updateNode(graph, 'b', { label: 'B2' });

    // Assert
    expect(graph.nodes[1].label).toBe('B');
  });
});

describe('setNodePositions', () => {
  it('should move only listed nodes', () => {
    // Act
    const result = setNodePositions(createGraph(), new Map([['a', { x: 5, y: 6 }]]));

    // Assert
    expect(result.nodes.map((node) => [node.x, node.y])).toEqual([[5, 6], [0, 100], [0, 200]]);
  });
});

describe('removeElements', () => {
  it('should remove edges attached to a removed node', () => {
    // Act
    const result = removeElements(createGraph(), { nodeIds: ['b'], edgeIds: [] });

    // Assert
    expect(result.edges).toEqual([]);
  });

  it('should remove a selected edge and keep its nodes', () => {
    // Act
    const result = removeElements(createGraph(), { nodeIds: [], edgeIds: ['e1'] });

    // Assert
    expect(result.nodes).toHaveLength(3);
  });
});

describe('canConnect', () => {
  it('should reject a self loop', () => {
    // Act
    const isAllowed = canConnect(createGraph(), 'a', 'a');

    // Assert
    expect(isAllowed).toBe(false);
  });

  it('should reject a duplicate edge in the same direction', () => {
    // Act
    const isAllowed = canConnect(createGraph(), 'a', 'b');

    // Assert
    expect(isAllowed).toBe(false);
  });

  it('should allow the reverse direction of an existing edge', () => {
    // Act
    const isAllowed = canConnect(createGraph(), 'b', 'a');

    // Assert
    expect(isAllowed).toBe(true);
  });

  it('should reject when a node is missing', () => {
    // Act
    const isAllowed = canConnect(createGraph(), 'a', 'ghost');

    // Assert
    expect(isAllowed).toBe(false);
  });
});

describe('addEdge', () => {
  it('should append the edge when connection is allowed', () => {
    // Act
    const result = addEdge(createGraph(), { id: 'e3', source: 'a', target: 'c' });

    // Assert
    expect(result.edges).toHaveLength(3);
  });

  it('should return the same graph when connection is rejected', () => {
    // Arrange
    const graph = createGraph();

    // Act
    const result = addEdge(graph, { id: 'e3', source: 'a', target: 'a' });

    // Assert
    expect(result).toBe(graph);
  });
});

describe('updateEdge', () => {
  it('should set the label of the matching edge', () => {
    // Act
    const result = updateEdge(createGraph(), 'e2', { label: '是' });

    // Assert
    expect(result.edges[1].label).toBe('是');
  });
});

describe('moveNodes', () => {
  it('should shift the listed nodes by the offset', () => {
    // Act
    const result = moveNodes(createGraph(), ['b'], 10, -5);

    // Assert
    expect([result.nodes[1].x, result.nodes[1].y]).toEqual([10, 95]);
  });

  it('should keep locked nodes in place', () => {
    // Arrange
    const graph = updateNode(createGraph(), 'b', { isLocked: true });

    // Act
    const result = moveNodes(graph, ['b'], 10, 10);

    // Assert
    expect(result).toBe(graph);
  });
});

describe('reconnectEdge', () => {
  it('should move the target end to the new node', () => {
    // Act
    const result = reconnectEdge(createGraph(), 'e1', 'target', 'c');

    // Assert
    expect(result.edges[0].target).toBe('c');
  });

  it('should move the source end to the new node', () => {
    // Act
    const result = reconnectEdge(createGraph(), 'e2', 'source', 'a');

    // Assert
    expect(result.edges[1].source).toBe('a');
  });

  it('should reject a reconnection that makes a self loop', () => {
    // Arrange
    const graph = createGraph();

    // Act
    const result = reconnectEdge(graph, 'e1', 'target', 'a');

    // Assert
    expect(result).toBe(graph);
  });

  it('should reject a reconnection that duplicates an existing edge', () => {
    // Arrange: e3 already runs a → c
    const graph = addEdge(createGraph(), { id: 'e3', source: 'a', target: 'c' });

    // Act
    const result = reconnectEdge(graph, 'e2', 'source', 'a');

    // Assert
    expect(result).toBe(graph);
  });
});
