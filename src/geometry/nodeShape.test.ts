import { getPortOffset, getPortPosition, getShapeDecorations, getShapePath, getShapePolygon, resolveNode } from './nodeShape';
import { DEFAULT_NODE_SIZE } from '../theme/flowStyle';
import { createFlowTheme } from '../theme/flowTheme';
import { lightTheme } from '../theme/lightThemes';
import type { FlowNode } from '../types';

describe('resolveNode', () => {
  it('should use shape defaults when label is short', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: '开始', shape: 'start' };

    // Act
    const { width, height } = resolveNode(node, lightTheme);

    // Assert
    expect({ width, height }).toEqual(DEFAULT_NODE_SIZE.start);
  });

  it('should wrap a long label into several lines', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: '这是一个非常非常长的处理步骤名称需要换行显示', shape: 'process' };

    // Act
    const resolved = resolveNode(node, lightTheme);

    // Assert
    expect(resolved.lines.length).toBeGreaterThan(1);
  });

  it('should grow the height when the label wraps', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: '长'.repeat(60), shape: 'process' };

    // Act
    const resolved = resolveNode(node, lightTheme);

    // Assert
    expect(resolved.height).toBeGreaterThan(DEFAULT_NODE_SIZE.process.height);
  });

  it('should never exceed the theme max width', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: '长'.repeat(100), shape: 'process' };

    // Act
    const resolved = resolveNode(node, lightTheme);

    // Assert
    expect(resolved.width).toBeLessThanOrEqual(lightTheme.node.maxWidth);
  });

  it('should keep one line when the theme truncates text', () => {
    // Arrange
    const theme = createFlowTheme(lightTheme, { text: { overflow: 'truncate' } });
    const node: FlowNode = { id: 'a', label: '长'.repeat(100), shape: 'process' };

    // Act
    const resolved = resolveNode(node, theme);

    // Assert
    expect(resolved.lines).toHaveLength(1);
  });

  it('should keep explicit size when width and height are given', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: 'A', shape: 'process', width: 80, height: 30 };

    // Act
    const { width, height } = resolveNode(node, lightTheme);

    // Assert
    expect({ width, height }).toEqual({ width: 80, height: 30 });
  });

  it('should keep circles round', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: '一个比较长的圆形标签', shape: 'circle' };

    // Act
    const { width, height } = resolveNode(node, lightTheme);

    // Assert
    expect(width).toBe(height);
  });

  it('should apply node style over lane style', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: 'A', shape: 'process', style: { fill: '#111111' } };

    // Act
    const resolved = resolveNode(node, lightTheme, { fill: '#222222', stroke: '#333333' });

    // Assert
    expect([resolved.appearance.fill, resolved.appearance.stroke]).toEqual(['#111111', '#333333']);
  });

  it('should use fallback position when node has no coordinates', () => {
    // Arrange
    const node: FlowNode = { id: 'a', label: 'A', shape: 'process' };

    // Act
    const resolved = resolveNode(node, lightTheme, undefined, { x: 5, y: 6 });

    // Assert
    expect([resolved.x, resolved.y]).toEqual([5, 6]);
  });
});

describe('getShapePolygon', () => {
  it('should return diamond vertices when shape is decision', () => {
    // Act
    const polygon = getShapePolygon('decision', 100, 60);

    // Assert
    expect(polygon).toEqual([[0, -30], [50, 0], [0, 30], [-50, 0]]);
  });

  it('should return six vertices when shape is hexagon', () => {
    // Act
    const polygon = getShapePolygon('hexagon', 100, 60);

    // Assert
    expect(polygon).toHaveLength(6);
  });

  it('should return null when shape is rect based', () => {
    // Act
    const polygon = getShapePolygon('process', 100, 60);

    // Assert
    expect(polygon).toBeNull();
  });
});

describe('getShapePath', () => {
  it('should build an arc outline when shape is database', () => {
    // Act
    const pathData = getShapePath('database', 100, 60);

    // Assert
    expect(pathData).toContain('A');
  });

  it('should return null when shape has a straight outline', () => {
    // Act
    const pathData = getShapePath('process', 100, 60);

    // Assert
    expect(pathData).toBeNull();
  });
});

describe('getShapeDecorations', () => {
  it('should draw two side bars when shape is subprocess', () => {
    // Act
    const decorations = getShapeDecorations('subprocess', 100, 60);

    // Assert
    expect(decorations).toHaveLength(2);
  });
});

describe('getPortOffset', () => {
  it('should place the right port on the slanted edge when shape is io', () => {
    // Arrange: slant is 0.3 * 40 = 12, so the right edge midpoint is 50 - 6
    const expectedX = 44;

    // Act
    const offset = getPortOffset('io', 100, 40, 'right');

    // Assert
    expect(offset).toEqual({ x: expectedX, y: 0 });
  });

  it('should lift the bottom port above the wave when shape is document', () => {
    // Act
    const offset = getPortOffset('document', 100, 60, 'bottom');

    // Assert
    expect(offset.y).toBeLessThan(30);
  });
});

describe('getPortPosition', () => {
  it('should return world position offset from node center', () => {
    // Arrange
    const node = resolveNode({ id: 'a', label: 'A', shape: 'process', x: 100, y: 50, width: 80, height: 40 }, lightTheme);

    // Act
    const position = getPortPosition(node, 'left');

    // Assert
    expect(position).toEqual({ x: 60, y: 50 });
  });
});
