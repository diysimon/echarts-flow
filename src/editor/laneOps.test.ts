import { addLane, removeLane, setNodeLanes, updateLane } from './laneOps';
import { lightTheme } from '../theme/lightThemes';
import type { FlowGraph, FlowNode } from '../types';

const LANE_SIZE = 200;

function createGraph(): FlowGraph {
  return {
    lanes: [
      { id: 'a', label: 'A', size: LANE_SIZE },
      { id: 'b', label: 'B', size: LANE_SIZE },
      { id: 'c', label: 'C', size: LANE_SIZE },
    ],
    nodes: [
      { id: 'n1', label: '1', shape: 'process', laneId: 'a', x: 100, y: 100 },
      { id: 'n2', label: '2', shape: 'process', laneId: 'b', x: 300, y: 100 },
      { id: 'n3', label: '3', shape: 'process', laneId: 'c', x: 500, y: 100 },
    ],
    edges: [],
  };
}

function getNode(graph: FlowGraph, id: string): FlowNode {
  return graph.nodes.find((node) => node.id === id) as FlowNode;
}

describe('addLane', () => {
  it('should append the lane', () => {
    // Act
    const result = addLane(createGraph(), { id: 'd', label: 'D' });

    // Assert
    expect(result.lanes?.map((lane) => lane.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should throw when the id already exists', () => {
    // Act & Assert
    expect(() => addLane(createGraph(), { id: 'a', label: 'A' })).toThrow('already exists');
  });
});

describe('updateLane', () => {
  it('should shift nodes in later lanes when a lane grows', () => {
    // Act
    const result = updateLane(createGraph(), 'b', { size: LANE_SIZE + 50 }, 'TB', lightTheme);

    // Assert
    expect([getNode(result, 'n2').x, getNode(result, 'n3').x]).toEqual([300, 550]);
  });

  it('should shift along y when lanes are rows', () => {
    // Act
    const result = updateLane(createGraph(), 'a', { size: LANE_SIZE + 10 }, 'LR', lightTheme);

    // Assert
    expect(getNode(result, 'n2').y).toBe(110);
  });

  it('should keep node positions when only the label changes', () => {
    // Arrange
    const graph = createGraph();

    // Act
    const result = updateLane(graph, 'a', { label: 'AA' }, 'TB', lightTheme);

    // Assert
    expect(result.nodes).toBe(graph.nodes);
  });
});

describe('removeLane', () => {
  it('should move nodes of the removed lane into the previous lane', () => {
    // Act
    const result = removeLane(createGraph(), 'b', 'TB', lightTheme);

    // Assert
    expect([getNode(result, 'n2').laneId, getNode(result, 'n2').x]).toEqual(['a', 100]);
  });

  it('should close the gap for later lanes', () => {
    // Act
    const result = removeLane(createGraph(), 'b', 'TB', lightTheme);

    // Assert
    expect(getNode(result, 'n3').x).toBe(300);
  });

  it('should move nodes into the next lane when removing the first lane', () => {
    // Act
    const result = removeLane(createGraph(), 'a', 'TB', lightTheme);

    // Assert
    expect([getNode(result, 'n1').laneId, getNode(result, 'n1').x]).toEqual(['b', 100]);
  });
});

describe('setNodeLanes', () => {
  it('should change the lane of listed nodes only', () => {
    // Act
    const result = setNodeLanes(createGraph(), new Map([['n1', 'c']]));

    // Assert
    expect(result.nodes.map((node) => node.laneId)).toEqual(['c', 'b', 'c']);
  });
});
