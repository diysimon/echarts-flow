import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';
import { buildGridPath, renderFlowGrid } from './renderFlowGrid';
import { renderFlowLane } from './renderFlowLane';
import type { FlowGridPayload, FlowLanePayload } from './flowPayload';
import { calcLaneLayout } from '../layout/laneLayout';
import { createFlowTheme } from '../theme/flowTheme';
import { lightTheme } from '../theme/lightThemes';

interface ElementLike {
  type: string;
  name?: string;
  rotation?: number;
  silent?: boolean;
  info?: unknown;
  children?: ElementLike[];
}

function renderLane(direction: 'TB' | 'LR', dataIndex: number, title?: string, label = 'A'): ElementLike {
  const graph = { title, nodes: [], edges: [], lanes: [{ id: 'a', label, size: 200 }] };
  const layout = calcLaneLayout(graph, [], lightTheme, direction);
  const payload: FlowLanePayload = { ...layout, viewport: { x: 0, y: 0, scale: 1 }, theme: lightTheme };
  return renderFlowLane({ dataIndex, itemPayload: payload } as unknown as CustomSeriesRenderItemParams) as unknown as ElementLike;
}

function findChild(root: ElementLike, name: string): ElementLike | undefined {
  return root.children?.find((child) => child.name === name);
}

describe('renderFlowLane', () => {
  it('should keep the lane body silent so empty lane space pans the canvas', () => {
    // Act
    const root = renderLane('TB', 0);

    // Assert
    expect(findChild(root, 'body')?.silent).toBe(true);
  });

  it('should attach lane hit info to the header', () => {
    // Act
    const root = renderLane('TB', 0);

    // Assert
    expect(findChild(root, 'header')?.info).toEqual({ role: 'lane', laneId: 'a' });
  });

  it('should rotate the header label when lanes are rows', () => {
    // Act
    const root = renderLane('LR', 0);

    // Assert
    expect(findChild(root, 'label')?.rotation).not.toBe(0);
  });

  it('should stack a Chinese row header one character per line instead of rotating it', () => {
    // Act
    const root = renderLane('LR', 0, undefined, '仓储');

    // Assert
    const label = findChild(root, 'label') as ElementLike & { style?: { text?: string } };
    expect([label.rotation, label.style?.text]).toEqual([0, '仓\n储']);
  });

  it('should render the title as the item after the last lane', () => {
    // Act
    const root = renderLane('TB', 1, '标题');

    // Assert
    expect(findChild(root, 'background')?.info).toEqual({ role: 'title' });
  });
});

describe('buildGridPath', () => {
  it('should draw one square per dot including one spare cell to the right and bottom', () => {
    // Act
    const pathData = buildGridPath('dot', 10, 0, 0, 20, 20);

    // Assert: dots at -10, 0, 10, 20, 30 on each axis
    expect(pathData.split('M').length - 1).toBe(25);
  });

  it('should keep lines on half pixels so 1px lines stay crisp', () => {
    // Act
    const pathData = buildGridPath('line', 10, 0, 0, 20, 20);

    // Assert
    expect(pathData).toContain('M0.5,-10');
  });
});

describe('renderFlowGrid', () => {
  const api = { getWidth: () => 100, getHeight: () => 100 } as unknown as CustomSeriesRenderItemAPI;

  function render(payload: FlowGridPayload) {
    return renderFlowGrid({ itemPayload: payload } as unknown as CustomSeriesRenderItemParams, api);
  }

  it('should draw nothing when the theme has no grid', () => {
    // Act
    const result = render({ viewport: { x: 0, y: 0, scale: 1 }, theme: lightTheme });

    // Assert
    expect(result).toBeNull();
  });

  it('should skip the grid when zoomed out too far', () => {
    // Arrange
    const theme = createFlowTheme(lightTheme, { grid: { type: 'dot', size: 20 } });

    // Act
    const result = render({ viewport: { x: 0, y: 0, scale: 0.2 }, theme });

    // Assert
    expect(result).toBeNull();
  });
});
