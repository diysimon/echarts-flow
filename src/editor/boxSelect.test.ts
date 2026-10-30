import { calcRectFromPoints, mergeSelections, selectInRect } from './boxSelect';
import type { FlowEdge, ResolvedNode } from '../types';

function createNode(id: string, x: number, y: number): ResolvedNode {
  return { id, label: id, shape: 'process', x, y, width: 100, height: 40 } as ResolvedNode;
}

const NODES = [createNode('a', 0, 0), createNode('b', 200, 0), createNode('c', 400, 0)];
const EDGES: FlowEdge[] = [
  { id: 'ab', source: 'a', target: 'b' },
  { id: 'bc', source: 'b', target: 'c' },
];

describe('calcRectFromPoints', () => {
  it('should normalize the rectangle when dragged up and to the left', () => {
    // Act
    const rect = calcRectFromPoints({ x: 10, y: 20 }, { x: 0, y: 5 });

    // Assert
    expect(rect).toEqual({ x: 0, y: 5, width: 10, height: 15 });
  });
});

describe('selectInRect', () => {
  it('should select nodes the box only touches', () => {
    // Arrange: the box reaches 10 units into node b, whose left edge is at 150
    const rect = { x: -100, y: -10, width: 260, height: 20 };

    // Act
    const selection = selectInRect(NODES, EDGES, rect);

    // Assert
    expect(selection.nodeIds).toEqual(['a', 'b']);
  });

  it('should select edges between two selected nodes', () => {
    // Arrange
    const rect = { x: -100, y: -10, width: 260, height: 20 };

    // Act
    const selection = selectInRect(NODES, EDGES, rect);

    // Assert
    expect(selection.edgeIds).toEqual(['ab']);
  });

  it('should select nothing when the box misses every node', () => {
    // Act
    const selection = selectInRect(NODES, EDGES, { x: 0, y: 100, width: 50, height: 50 });

    // Assert
    expect(selection).toEqual({ nodeIds: [], edgeIds: [] });
  });
});

describe('mergeSelections', () => {
  it('should not repeat ids that are in both selections', () => {
    // Act
    const merged = mergeSelections({ nodeIds: ['a', 'b'], edgeIds: [] }, { nodeIds: ['b', 'c'], edgeIds: ['bc'] });

    // Assert
    expect(merged).toEqual({ nodeIds: ['a', 'b', 'c'], edgeIds: ['bc'] });
  });
});
