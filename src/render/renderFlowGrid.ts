import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { FlowBackdropBlob } from '../theme/flowTheme';
import type { FlowGridPayload } from './flowPayload';
import type { ElementOption } from './renderFlowNode';

/** Skip the grid when zoomed out so far that cells would be denser than this. */
const MIN_CELL_PIXELS = 6;
const DOT_SIZE = 1.5;
export const GRID_ELEMENT_NAME = 'grid';

/** First grid line at or before 0 on screen, so lines stay fixed to the world as the canvas pans. */
function calcGridStart(offset: number, step: number): number {
  return ((offset % step) + step) % step - step;
}

/**
 * Draws the whole grid as one path so thousands of dots or lines cost a
 * single element. It covers the visible area plus one extra cell to the right
 * and bottom, so the editor can slide it by up to one cell while panning
 * without exposing an edge.
 */
export function buildGridPath(type: 'dot' | 'line', step: number, offsetX: number, offsetY: number, width: number, height: number): string {
  const startX = calcGridStart(offsetX, step);
  const startY = calcGridStart(offsetY, step);
  const endX = width + step;
  const endY = height + step;
  const commands: string[] = [];
  if (type === 'line') {
    for (let x = startX; x <= endX; x += step) {
      const lineX = Math.round(x) + 0.5;
      commands.push(`M${lineX},${-step} L${lineX},${endY}`);
    }
    for (let y = startY; y <= endY; y += step) {
      const lineY = Math.round(y) + 0.5;
      commands.push(`M${-step},${lineY} L${endX},${lineY}`);
    }
    return commands.join(' ');
  }
  for (let x = startX; x <= endX; x += step) {
    for (let y = startY; y <= endY; y += step) {
      commands.push(`M${Math.round(x)},${Math.round(y)} h${DOT_SIZE} v${DOT_SIZE} h${-DOT_SIZE} Z`);
    }
  }
  return commands.join(' ');
}

/** Large soft radial glows behind the grid, fixed to the screen for an ambient backdrop. */
function buildBackdrop(blobs: FlowBackdropBlob[], width: number, height: number): ElementOption[] {
  const size = Math.max(width, height);
  return blobs.map((blob, index) => ({
    type: 'circle',
    name: `backdrop-${index}`,
    silent: true,
    shape: { cx: blob.x * width, cy: blob.y * height, r: blob.radius * size },
    style: {
      fill: {
        type: 'radial',
        x: 0.5,
        y: 0.5,
        r: 0.5,
        colorStops: [{ offset: 0, color: blob.color }, { offset: 1, color: 'rgba(0,0,0,0)' }],
        global: false,
      },
    },
  }));
}

function buildGrid(payload: FlowGridPayload, width: number, height: number): ElementOption | null {
  const { viewport, theme } = payload;
  const { grid } = theme;
  const step = grid.size * viewport.scale;
  if (grid.type === 'none' || step < MIN_CELL_PIXELS) {
    return null;
  }
  const pathData = buildGridPath(grid.type, step, viewport.x, viewport.y, width, height);
  const style = grid.type === 'line'
    ? { fill: 'none', stroke: grid.color, lineWidth: 1 }
    : { fill: grid.color, stroke: 'none' };
  // x and y are set explicitly because the editor moves this element while panning.
  return { type: 'path', name: GRID_ELEMENT_NAME, silent: true, x: 0, y: 0, shape: { pathData }, style };
}

export function renderFlowGrid(params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn {
  const payload = params.itemPayload as unknown as FlowGridPayload;
  const width = api.getWidth();
  const height = api.getHeight();
  const children = [...buildBackdrop(payload.theme.backdrop.blobs, width, height), buildGrid(payload, width, height)]
    .filter((child): child is ElementOption => child !== null);
  if (children.length === 0) {
    return null;
  }
  return { type: 'group', silent: true, children };
}
