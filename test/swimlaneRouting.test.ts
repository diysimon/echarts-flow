import { buildFlowScene, type FlowDirection, type FlowGraph, type FlowScene } from '../src/index';
import { isSegmentHittingBox, toSegments } from '../src/geometry/orthogonalRouter';
import { SWIMLANE_SCENARIOS } from './cases/shared/swimlaneScenarios';
import { APPROVAL_GRAPH } from '../demo/sampleGraph';

const DIRECTIONS: FlowDirection[] = ['TB', 'LR'];

function buildScene(graph: FlowGraph, direction: FlowDirection, isLaneCompact: boolean): FlowScene {
  return buildFlowScene(graph, { direction, layout: { isLaneCompact } });
}

/**
 * Edges that pass through a node. Their own source and target count too,
 * except for the first and last segment, which leave and enter them.
 */
function findNodeCrossings(scene: FlowScene): string[] {
  const crossings: string[] = [];
  scene.edges.forEach((edge) => {
    const segments = toSegments(edge.points);
    segments.forEach((segment, index) => {
      const isEndSegment = index === 0 || index === segments.length - 1;
      scene.nodes
        .filter((node) => !isEndSegment || (node.id !== edge.source && node.id !== edge.target))
        .forEach((node) => {
          const box = { minX: node.x - node.width / 2, minY: node.y - node.height / 2, maxX: node.x + node.width / 2, maxY: node.y + node.height / 2 };
          if (isSegmentHittingBox(segment, box)) {
            crossings.push(`${edge.id} -> ${node.id}`);
          }
        });
    });
  });
  return crossings;
}

/** Edge segments lying on top of each other for more than a few pixels. */
function countOverlaps(scene: FlowScene): number {
  const MIN_OVERLAP = 12;
  const TOLERANCE = 2;
  const segments = scene.edges.flatMap((edge) => toSegments(edge.points).map((segment) => ({ ...segment, edgeId: edge.id })));
  let overlaps = 0;
  segments.forEach((segment, index) => {
    segments.slice(index + 1).forEach((other) => {
      const isParallel = segment.isHorizontal === other.isHorizontal && Math.abs(segment.at - other.at) <= TOLERANCE;
      const shared = Math.min(segment.b, other.b) - Math.max(segment.a, other.a);
      if (segment.edgeId !== other.edgeId && isParallel && shared > MIN_OVERLAP) {
        overlaps++;
      }
    });
  });
  return overlaps;
}

describe('demo approval graph without lanes', () => {
  it.each(DIRECTIONS)('should not route edges through nodes when direction is %s', (direction) => {
    // Act
    const scene = buildScene(APPROVAL_GRAPH, direction, false);

    // Assert
    expect(findNodeCrossings(scene)).toEqual([]);
  });
});

describe.each(SWIMLANE_SCENARIOS)('swimlane scenario $name', (scenario) => {
  it.each(DIRECTIONS)('should not route edges through nodes when direction is %s', (direction) => {
    // Act
    const scene = buildScene(scenario.graph, direction, scenario.isLaneCompact);

    // Assert
    expect(findNodeCrossings(scene)).toEqual([]);
  });

  it('should not stack edges on top of each other in its default setup', () => {
    // Act
    const scene = buildScene(scenario.graph, scenario.direction, scenario.isLaneCompact);

    // Assert
    expect(countOverlaps(scene)).toBe(0);
  });

  it('should keep every node inside its own lane', () => {
    // Act
    const scene = buildScene(scenario.graph, scenario.direction, scenario.isLaneCompact);

    // Assert
    const isInside = scene.nodes.every((node) => {
      const lane = scene.lanes.lanes.find((item) => item.id === node.laneId);
      return lane !== undefined && node.x >= lane.x && node.x <= lane.x + lane.width && node.y >= lane.y && node.y <= lane.y + lane.height;
    });
    expect(isInside).toBe(true);
  });
});
