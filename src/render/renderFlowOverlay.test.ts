import type { CustomSeriesRenderItemParams } from 'echarts';
import { renderFlowOverlay } from './renderFlowOverlay';
import type { FlowOverlayPayload } from './flowPayload';
import { lightTheme } from '../theme/lightThemes';

interface ElementLike {
  name?: string;
  info?: unknown;
  shape?: Record<string, number>;
  children?: ElementLike[];
}

function render(patch: Partial<FlowOverlayPayload> = {}): ElementLike | null {
  const payload: FlowOverlayPayload = {
    viewport: { x: 0, y: 0, scale: 1 },
    theme: lightTheme,
    selectionBox: null,
    guides: [],
    edgeHandles: [],
    ...patch,
  };
  const params = { dataIndex: 0, itemPayload: payload } as unknown as CustomSeriesRenderItemParams;
  return renderFlowOverlay(params) as unknown as ElementLike | null;
}

function findChild(root: ElementLike | null, name: string): ElementLike | undefined {
  return root?.children?.find((child) => child.name === name);
}

describe('renderFlowOverlay', () => {
  it('should render nothing when there is no feedback to show', () => {
    // Act
    const root = render();

    // Assert
    expect(root).toBeNull();
  });

  it('should scale the selection box with the viewport', () => {
    // Act
    const root = render({ viewport: { x: 0, y: 0, scale: 2 }, selectionBox: { x: 10, y: 10, width: 50, height: 30 } });

    // Assert
    expect(findChild(root, 'selection-box')?.shape?.width).toBe(100);
  });

  it('should draw a vertical guide at the projected x when axis is x', () => {
    // Act
    const root = render({ viewport: { x: 5, y: 0, scale: 1 }, guides: [{ axis: 'x', position: 100, start: 0, end: 50 }] });

    // Assert: 100 + 5, offset half a pixel for the 1px line
    expect(findChild(root, 'guide-0')?.shape?.x1).toBe(105.5);
  });

  it('should attach edge-end hit info to an edge handle', () => {
    // Act
    const root = render({ edgeHandles: [{ edgeId: 'e1', end: 'target', point: { x: 0, y: 0 } }] });

    // Assert
    expect(findChild(root, 'edge-handle-target')?.info).toEqual({ role: 'edge-end', edgeId: 'e1', end: 'target' });
  });
});
