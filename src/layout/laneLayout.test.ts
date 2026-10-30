import { calcLaneLayout, findLaneAt, getNodeLaneId } from './laneLayout';
import { lightTheme } from '../theme/lightThemes';
import type { FlowGraph } from '../types';

const LANE_SIZE = 200;

function createGraph(title?: string): FlowGraph {
  return {
    title,
    lanes: [
      { id: 'a', label: 'A', size: LANE_SIZE },
      { id: 'b', label: 'B', size: LANE_SIZE, style: { fill: '#ff0000' } },
    ],
    nodes: [],
    edges: [],
  };
}

describe('calcLaneLayout', () => {
  it('should stack lanes as columns when direction is TB', () => {
    // Act
    const { lanes } = calcLaneLayout(createGraph(), [], lightTheme, 'TB');

    // Assert
    expect(lanes.map((lane) => lane.x)).toEqual([0, LANE_SIZE]);
  });

  it('should stack lanes as rows when direction is LR', () => {
    // Act
    const { lanes } = calcLaneLayout(createGraph(), [], lightTheme, 'LR');

    // Assert
    expect(lanes.map((lane) => lane.y)).toEqual([0, LANE_SIZE]);
  });

  it('should put the header on the left of a row', () => {
    // Act
    const { lanes } = calcLaneLayout(createGraph(), [], lightTheme, 'LR');

    // Assert
    expect(lanes[0].header.width).toBe(lightTheme.lane.headerSize);
  });

  it('should let a lane style override the theme fill', () => {
    // Act
    const { lanes } = calcLaneLayout(createGraph(), [], lightTheme, 'TB');

    // Assert
    expect(lanes[1].style.fill).toBe('#ff0000');
  });

  it('should alternate lane fills', () => {
    // Arrange
    const graph = createGraph();
    graph.lanes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];

    // Act
    const { lanes } = calcLaneLayout(graph, [], lightTheme, 'TB');

    // Assert
    expect([lanes[0].style.fill, lanes[1].style.fill]).toEqual([lightTheme.lane.fill, lightTheme.lane.alternateFill]);
  });

  it('should place the title above the lanes when the graph has a title', () => {
    // Act
    const { title } = calcLaneLayout(createGraph('流程'), [], lightTheme, 'TB');

    // Assert
    expect([title?.y, title?.width]).toEqual([-lightTheme.title.height, LANE_SIZE * 2]);
  });

  it('should return no lanes when the graph has none', () => {
    // Act
    const layout = calcLaneLayout({ nodes: [], edges: [] }, [], lightTheme, 'TB');

    // Assert
    expect(layout.lanes).toEqual([]);
  });
});

describe('findLaneAt', () => {
  it('should find the lane containing the point', () => {
    // Arrange
    const layout = calcLaneLayout(createGraph(), [], lightTheme, 'TB');

    // Act
    const lane = findLaneAt(layout, { x: LANE_SIZE + 10, y: 50 });

    // Assert
    expect(lane?.id).toBe('b');
  });

  it('should snap a point past the last lane to the last lane', () => {
    // Arrange
    const layout = calcLaneLayout(createGraph(), [], lightTheme, 'TB');

    // Act
    const lane = findLaneAt(layout, { x: 9999, y: 50 });

    // Assert
    expect(lane?.id).toBe('b');
  });
});

describe('getNodeLaneId', () => {
  it('should fall back to the first lane when the node lane is unknown', () => {
    // Act
    const laneId = getNodeLaneId({ id: 'n', label: 'N', shape: 'process', laneId: 'ghost' }, createGraph().lanes ?? []);

    // Assert
    expect(laneId).toBe('a');
  });
});
