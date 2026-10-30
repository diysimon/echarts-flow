import { calcFlowLayout, fillMissingPositions } from './calcFlowLayout';
import { calcLaneLayout, findLaneAt } from './laneLayout';
import { resolveNode } from '../geometry/nodeShape';
import { lightTheme } from '../theme/lightThemes';
import type { FlowGraph, FlowNode } from '../types';

function createLaneGraph(): FlowGraph {
  return {
    lanes: [
      { id: 'customer', label: 'Customer' },
      { id: 'sales', label: 'Sales' },
    ],
    nodes: [
      { id: 'order', label: 'Order', shape: 'start', laneId: 'customer' },
      { id: 'confirm', label: 'Confirm', shape: 'process', laneId: 'sales' },
      { id: 'done', label: 'Done', shape: 'end', laneId: 'customer' },
    ],
    edges: [
      { id: 'e1', source: 'order', target: 'confirm' },
      { id: 'e2', source: 'confirm', target: 'done' },
    ],
  };
}

function getNode(graph: FlowGraph, id: string): FlowNode {
  return graph.nodes.find((node) => node.id === id) as FlowNode;
}

function layoutLanes(graph: FlowGraph, direction: 'TB' | 'LR' = 'TB') {
  const laidOut = calcFlowLayout(graph, { direction });
  const nodes = laidOut.nodes.map((node) => resolveNode(node, lightTheme));
  return { laidOut, lanes: calcLaneLayout(laidOut, nodes, lightTheme, direction) };
}

describe('calcFlowLayout with lanes', () => {
  it('should keep every node inside its own column when direction is TB', () => {
    // Act
    const { laidOut, lanes } = layoutLanes(createLaneGraph(), 'TB');

    // Assert
    const isInside = laidOut.nodes.every((node) => findLaneAt(lanes, { x: node.x ?? 0, y: node.y ?? 0 })?.id === node.laneId);
    expect(isInside).toBe(true);
  });

  it('should keep every node inside its own row when direction is LR', () => {
    // Act
    const { laidOut, lanes } = layoutLanes(createLaneGraph(), 'LR');

    // Assert
    const isInside = laidOut.nodes.every((node) => findLaneAt(lanes, { x: node.x ?? 0, y: node.y ?? 0 })?.id === node.laneId);
    expect(isInside).toBe(true);
  });

  it('should place nodes below the lane headers', () => {
    // Act
    const { laidOut } = layoutLanes(createLaneGraph(), 'TB');

    // Assert
    const order = getNode(laidOut, 'order');
    expect((order.y ?? 0) - 20).toBeGreaterThanOrEqual(lightTheme.lane.headerSize);
  });

  it('should keep the flow order along the main axis', () => {
    // Act
    const { laidOut } = layoutLanes(createLaneGraph(), 'TB');

    // Assert
    expect((getNode(laidOut, 'order').y ?? 0) < (getNode(laidOut, 'confirm').y ?? 0)).toBe(true);
  });

  it('should give every lane a size of at least the theme minimum', () => {
    // Act
    const { laidOut } = layoutLanes(createLaneGraph());

    // Assert
    expect(laidOut.lanes?.every((lane) => (lane.size ?? 0) >= lightTheme.lane.minSize)).toBe(true);
  });

  it('should put nodes with an unknown lane into the first lane', () => {
    // Arrange
    const graph = createLaneGraph();
    graph.nodes.push({ id: 'stray', label: 'Stray', shape: 'process', laneId: 'ghost' });

    // Act
    const { laidOut, lanes } = layoutLanes(graph);

    // Assert
    const stray = getNode(laidOut, 'stray');
    expect(findLaneAt(lanes, { x: stray.x ?? 0, y: stray.y ?? 0 })?.id).toBe('customer');
  });
});

describe('fillMissingPositions with lanes', () => {
  it('should size lanes even when every node is already positioned', () => {
    // Arrange
    const graph = createLaneGraph();
    graph.nodes = graph.nodes.map((node, index) => ({ ...node, x: 100, y: 100 * (index + 1) }));

    // Act
    const result = fillMissingPositions(graph);

    // Assert
    expect(result.lanes?.every((lane) => lane.size != null)).toBe(true);
  });

  it('should keep a lane size that is already set', () => {
    // Arrange
    const graph = createLaneGraph();
    graph.lanes = [{ id: 'customer', label: 'Customer', size: 333 }, { id: 'sales', label: 'Sales' }];

    // Act
    const result = fillMissingPositions(graph);

    // Assert
    expect(result.lanes?.[0].size).toBe(333);
  });
});
