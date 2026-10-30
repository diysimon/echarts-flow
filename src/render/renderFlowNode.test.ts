import type { CustomSeriesRenderItemParams } from 'echarts';
import { renderFlowNode } from './renderFlowNode';
import type { FlowNodePayload } from './flowPayload';
import { resolveNode } from '../geometry/nodeShape';
import { darkTheme } from '../theme/darkThemes';
import { lightTheme } from '../theme/lightThemes';
import { auroraTheme } from '../theme/modernThemes';
import { createFlowTheme } from '../theme/flowTheme';
import type { FlowNode } from '../types';

interface ElementLike {
  type: string;
  name?: string;
  x?: number;
  y?: number;
  scaleX?: number;
  info?: unknown;
  shape?: Record<string, unknown>;
  style?: Record<string, unknown>;
  clipPath?: { shape?: Record<string, unknown> };
  children?: ElementLike[];
}

function createParams(nodes: FlowNode[], patch: Partial<FlowNodePayload> = {}, dataIndex = 0): CustomSeriesRenderItemParams {
  const payload: FlowNodePayload = {
    nodes: nodes.map((node) => resolveNode(node, (patch.theme ?? lightTheme))),
    viewport: { x: 0, y: 0, scale: 1 },
    selectedIds: [],
    hoveredId: null,
    isEditable: true,
    theme: lightTheme,
    ...patch,
  };
  return { dataIndex, itemPayload: payload } as unknown as CustomSeriesRenderItemParams;
}

function render(params: CustomSeriesRenderItemParams): ElementLike {
  return renderFlowNode(params) as unknown as ElementLike;
}

function getNodeChildren(root: ElementLike): ElementLike[] {
  return root.children ?? [];
}

function findChild(root: ElementLike, name: string): ElementLike | undefined {
  return getNodeChildren(root).find((child) => child.name === name);
}

const PROCESS_NODE: FlowNode = { id: 'p', label: '处理', shape: 'process', x: 10, y: 20 };

describe('renderFlowNode', () => {
  it('should render a rect when shape is process', () => {
    // Act
    const root = render(createParams([PROCESS_NODE]));

    // Assert
    expect(findChild(root, 'shape')?.type).toBe('rect');
  });

  it('should render a polygon when shape is decision', () => {
    // Arrange
    const node: FlowNode = { ...PROCESS_NODE, shape: 'decision' };

    // Act
    const root = render(createParams([node]));

    // Assert
    expect(findChild(root, 'shape')?.type).toBe('polygon');
  });

  it('should place the node group at the projected screen position', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { viewport: { x: 5, y: 6, scale: 2 } }));

    // Assert: 10 * 2 + 5, 20 * 2 + 6
    expect([root.x, root.y]).toEqual([25, 46]);
  });

  it('should scale shape size instead of transforming the group', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { viewport: { x: 0, y: 0, scale: 2 } }));

    // Assert
    expect([root.scaleX, findChild(root, 'shape')?.shape?.width]).toEqual([undefined, 240]);
  });

  it('should round the group position to whole pixels', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { viewport: { x: 0.3, y: 0.7, scale: 1.05 } }));

    // Assert
    expect([root.x, root.y].every(Number.isInteger)).toBe(true);
  });

  it('should offset a 1px border by half a pixel to keep it crisp', () => {
    // Act
    const root = render(createParams([PROCESS_NODE]));

    // Assert: width 120, so the left edge is at -60 + 0.5
    expect(findChild(root, 'shape')?.shape?.x).toBe(-59.5);
  });

  it('should scale label font size with zoom', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { viewport: { x: 0, y: 0, scale: 2 } }));

    // Assert
    expect(findChild(root, 'label')?.style?.fontSize).toBe(26);
  });

  it('should use theme colors for the shape fill', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { theme: darkTheme }));

    // Assert
    expect(findChild(root, 'shape')?.style?.fill).toBe(darkTheme.shapes.process.fill);
  });

  it('should attach node hit info to the shape', () => {
    // Act
    const root = render(createParams([PROCESS_NODE]));

    // Assert
    expect(findChild(root, 'shape')?.info).toEqual({ role: 'node', nodeId: 'p' });
  });

  it('should use selected stroke when node is selected', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { selectedIds: ['p'] }));

    // Assert
    expect(findChild(root, 'shape')?.style?.stroke).toBe(lightTheme.selected);
  });

  it('should show four ports when node is hovered and editable', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { hoveredId: 'p' }));

    // Assert
    const ports = getNodeChildren(root).filter((child) => child.name?.startsWith('port-'));
    expect(ports).toHaveLength(4);
  });

  it('should hide ports when chart is read only', () => {
    // Act
    const root = render(createParams([PROCESS_NODE], { hoveredId: 'p', isEditable: false }));

    // Assert
    expect(findChild(root, 'port-top')).toBeUndefined();
  });

  it('should draw a status dot in the status color when node has status', () => {
    // Arrange
    const node: FlowNode = { ...PROCESS_NODE, status: 'error' };

    // Act
    const root = render(createParams([node]));

    // Assert
    expect(findChild(root, 'status')?.style?.fill).toBe(lightTheme.status.error);
  });

  it('should keep the status dot off the top vertex when shape is decision', () => {
    // Arrange
    const node: FlowNode = { ...PROCESS_NODE, shape: 'decision', status: 'done' };

    // Act
    const root = render(createParams([node]));

    // Assert
    const dot = findChild(root, 'status') as { shape?: { cx: number } } | undefined;
    expect(dot?.shape?.cx).toBeGreaterThan(0);
  });

  it('should skip the label when zoomed out too far to read it', () => {
    // Act: 13px font at 0.2 scale is 2.6px
    const root = render(createParams([PROCESS_NODE], { viewport: { x: 0, y: 0, scale: 0.2 } }));

    // Assert
    expect(findChild(root, 'label')).toBeUndefined();
  });

  it('should return null when data index has no node', () => {
    // Act
    const result = renderFlowNode(createParams([PROCESS_NODE], {}, 5));

    // Assert
    expect(result).toBeNull();
  });

  describe('modern theme', () => {
    it('should draw a selection ring when theme uses ring selection', () => {
      // Act
      const root = render(createParams([PROCESS_NODE], { theme: auroraTheme, selectedIds: ['p'] }));

      // Assert
      expect(findChild(root, 'selection-ring')?.style?.stroke).toBe(auroraTheme.selected);
    });

    it('should keep the node border color when theme uses ring selection', () => {
      // Act
      const root = render(createParams([PROCESS_NODE], { theme: auroraTheme, selectedIds: ['p'] }));

      // Assert
      expect(findChild(root, 'shape')?.style?.stroke).toBe(auroraTheme.shapes.process.stroke);
    });

    it('should not draw a selection ring when theme uses stroke selection', () => {
      // Act
      const root = render(createParams([PROCESS_NODE], { selectedIds: ['p'] }));

      // Assert
      expect(findChild(root, 'selection-ring')).toBeUndefined();
    });

    it('should clip the accent bar to the accent width when shape is process', () => {
      // Arrange
      const theme = createFlowTheme(auroraTheme, { shapes: { process: { ...auroraTheme.shapes.process, accent: '#6366f1' } } });

      // Act
      const root = render(createParams([PROCESS_NODE], { theme }));

      // Assert
      expect(findChild(root, 'accent')?.clipPath?.shape?.width).toBe(theme.node.accentWidth);
    });

    it('should not draw an accent bar when the shape style has no accent', () => {
      // Act
      const root = render(createParams([PROCESS_NODE], { theme: auroraTheme }));

      // Assert
      expect(findChild(root, 'accent')).toBeUndefined();
    });

    it('should not draw an accent bar when shape is decision', () => {
      // Arrange
      const node: FlowNode = { ...PROCESS_NODE, shape: 'decision' };

      // Act
      const root = render(createParams([node], { theme: auroraTheme }));

      // Assert
      expect(findChild(root, 'accent')).toBeUndefined();
    });

    it('should enlarge the shadow when node is hovered', () => {
      // Arrange
      const restBlur = findChild(render(createParams([PROCESS_NODE], { theme: auroraTheme })), 'shape')?.style?.shadowBlur as number;

      // Act
      const root = render(createParams([PROCESS_NODE], { theme: auroraTheme, hoveredId: 'p' }));

      // Assert
      expect(findChild(root, 'shape')?.style?.shadowBlur).toBe(restBlur * auroraTheme.node.hoverLift);
    });
  });
});
