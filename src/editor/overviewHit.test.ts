import type { ResolvedNode } from '../types';
import { findEdgeAt, findNodeAt, isPointInNode } from './overviewHit';

function createNode(patch: Partial<ResolvedNode>): ResolvedNode {
  return { id: 'n', label: '', shape: 'process', x: 0, y: 0, width: 100, height: 60, ...patch } as ResolvedNode;
}

describe('isPointInNode', () => {
  it('should include a point inside a rectangular node', () => {
    // Act
    const isInside = isPointInNode(createNode({ x: 0, y: 0 }), { x: 40, y: 20 });

    // Assert
    expect(isInside).toBe(true);
  });

  it('should exclude a point outside a rectangular node', () => {
    // Act
    const isInside = isPointInNode(createNode({ x: 0, y: 0 }), { x: 60, y: 0 });

    // Assert
    expect(isInside).toBe(false);
  });

  it('should use the diamond outline for a decision node', () => {
    // Act: a corner of the bounding box is outside the diamond
    const isInside = isPointInNode(createNode({ shape: 'decision' }), { x: 45, y: 25 });

    // Assert
    expect(isInside).toBe(false);
  });

  it('should use the ellipse outline for a circle node', () => {
    // Act
    const isInside = isPointInNode(createNode({ shape: 'circle' }), { x: 49, y: 29 });

    // Assert
    expect(isInside).toBe(false);
  });
});

describe('findNodeAt', () => {
  it('should return the topmost node when nodes overlap', () => {
    // Arrange
    const under = createNode({ id: 'under', x: 0, y: 0 });
    const over = createNode({ id: 'over', x: 10, y: 0 });

    // Act
    const hit = findNodeAt([under, over], { x: 10, y: 0 });

    // Assert
    expect(hit?.id).toBe('over');
  });

  it('should return null when no node contains the point', () => {
    // Act
    const hit = findNodeAt([createNode({ x: 0, y: 0 })], { x: 500, y: 500 });

    // Assert
    expect(hit).toBeNull();
  });
});

describe('findEdgeAt', () => {
  const edge = { id: 'e', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };

  it('should return the edge when the point is within tolerance of a segment', () => {
    // Act
    const hit = findEdgeAt([edge], { x: 50, y: 3 }, 5);

    // Assert
    expect(hit?.id).toBe('e');
  });

  it('should return null when the point is beyond tolerance', () => {
    // Act
    const hit = findEdgeAt([edge], { x: 50, y: 20 }, 5);

    // Assert
    expect(hit).toBeNull();
  });
});
