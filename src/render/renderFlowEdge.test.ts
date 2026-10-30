import type { CustomSeriesRenderItemParams } from 'echarts';
import { renderFlowEdge } from './renderFlowEdge';
import type { FlowEdgePayload, RenderedEdge } from './flowPayload';
import { lightTheme } from '../theme/lightThemes';
import { resolveEdgeAppearance } from '../style/resolveAppearance';

interface ElementLike {
  type: string;
  name?: string;
  silent?: boolean;
  info?: unknown;
  shape?: Record<string, unknown>;
  style?: Record<string, unknown>;
  keyframeAnimation?: unknown;
  children?: ElementLike[];
}

function createEdge(patch: Partial<RenderedEdge> = {}): RenderedEdge {
  const edge = { id: 'e1', source: 'a', target: 'b' };
  return {
    ...edge,
    points: [{ x: 0, y: 0 }, { x: 0, y: 100 }],
    isCurve: false,
    labelPosition: { x: 0, y: 50 },
    appearance: resolveEdgeAppearance(edge, lightTheme),
    isDraft: false,
    isRunning: false,
    ...patch,
  };
}

function render(edge: RenderedEdge, selectedIds: string[] = []): ElementLike {
  const payload: FlowEdgePayload = { edges: [edge], viewport: { x: 0, y: 0, scale: 1 }, selectedIds, theme: lightTheme };
  const params = { dataIndex: 0, itemPayload: payload } as unknown as CustomSeriesRenderItemParams;
  return renderFlowEdge(params) as unknown as ElementLike;
}

function findChild(root: ElementLike, name: string): ElementLike | undefined {
  return root.children?.find((child) => child.name === name);
}

describe('renderFlowEdge', () => {
  it('should align a 1px line to the pixel center', () => {
    // Act
    const root = render(createEdge());

    // Assert: x = 0 becomes 0.5 for a 1px stroke
    expect(findChild(root, 'line')?.shape?.pathData).toMatch(/^M0\.5,0\.5/);
  });
  it('should attach edge hit info to the hit path', () => {
    // Act
    const root = render(createEdge());

    // Assert
    expect(findChild(root, 'hit')?.info).toEqual({ role: 'edge', edgeId: 'e1' });
  });

  it('should render a label when edge has label', () => {
    // Act
    const root = render(createEdge({ label: '是' }));

    // Assert
    expect(findChild(root, 'label')?.style?.text).toBe('是');
  });

  it('should use selected color when edge is selected', () => {
    // Act
    const root = render(createEdge(), ['e1']);

    // Assert
    expect(findChild(root, 'line')?.style?.stroke).toBe(lightTheme.selected);
  });

  it('should animate the dash when edge is running', () => {
    // Act
    const root = render(createEdge({ isRunning: true }));

    // Assert
    expect(findChild(root, 'line')?.keyframeAnimation).toBeDefined();
  });

  it('should be silent when edge is a draft', () => {
    // Act
    const root = render(createEdge({ isDraft: true }));

    // Assert
    expect(root.silent).toBe(true);
  });

  it('should return null when edge has fewer than two points', () => {
    // Act
    const result = render(createEdge({ points: [{ x: 0, y: 0 }] }));

    // Assert
    expect(result).toBeNull();
  });

  it('should draw an arrow at both ends when both arrows are set', () => {
    // Arrange
    const edge = createEdge();
    edge.appearance = { ...edge.appearance, sourceArrow: 'circle', targetArrow: 'diamond' };

    // Act
    const root = render(edge);

    // Assert
    expect([findChild(root, 'arrow-source')?.type, findChild(root, 'arrow-target')?.type]).toEqual(['circle', 'polygon']);
  });

  it('should skip the arrow when the arrow type is none', () => {
    // Arrange
    const edge = createEdge();
    edge.appearance = { ...edge.appearance, targetArrow: 'none' };

    // Act
    const root = render(edge);

    // Assert
    expect(findChild(root, 'arrow-target')).toBeUndefined();
  });

  it('should scale a custom line dash with zoom', () => {
    // Arrange
    const edge = createEdge();
    edge.appearance = { ...edge.appearance, lineDash: [4, 2] };

    // Act
    const root = render(edge);

    // Assert
    expect(findChild(root, 'line')?.style?.lineDash).toEqual([4, 2]);
  });

  it('should draw a cubic path when the route is a curve', () => {
    // Arrange
    const edge = createEdge({ isCurve: true, points: [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 100 }] });

    // Act
    const root = render(edge);

    // Assert
    expect(findChild(root, 'line')?.shape?.pathData).toContain('C');
  });
});
