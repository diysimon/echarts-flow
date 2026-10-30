import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { FlowGridPayload } from './flowPayload';

/** Skip the grid when zoomed out so far that cells would be denser than this. */
const MIN_CELL_PIXELS = 6;
const DOT_SIZE = 1.5;

/** First grid line at or before 0 on screen, so lines stay fixed to the world as the canvas pans. */
function calcGridStart(offset: number, step: number): number {
  return ((offset % step) + step) % step - step;
}

/**
 * Draws the whole grid as one path so thousands of dots or lines cost a
 * single element. It covers the visible area only and moves with the viewport.
 */
export function buildGridPath(type: 'dot' | 'line', step: number, offsetX: number, offsetY: number, width: number, height: number): string {
  const startX = calcGridStart(offsetX, step);
  const startY = calcGridStart(offsetY, step);
  const commands: string[] = [];
  if (type === 'line') {
    for (let x = startX; x <= width; x += step) {
      const lineX = Math.round(x) + 0.5;
      commands.push(`M${lineX},0 L${lineX},${height}`);
    }
    for (let y = startY; y <= height; y += step) {
      const lineY = Math.round(y) + 0.5;
      commands.push(`M0,${lineY} L${width},${lineY}`);
    }
    return commands.join(' ');
  }
  for (let x = startX; x <= width; x += step) {
    for (let y = startY; y <= height; y += step) {
      commands.push(`M${Math.round(x)},${Math.round(y)} h${DOT_SIZE} v${DOT_SIZE} h${-DOT_SIZE} Z`);
    }
  }
  return commands.join(' ');
}

export function renderFlowGrid(params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn {
  const { viewport, theme } = params.itemPayload as unknown as FlowGridPayload;
  const { grid } = theme;
  const step = grid.size * viewport.scale;
  if (grid.type === 'none' || step < MIN_CELL_PIXELS) {
    return null;
  }
  const pathData = buildGridPath(grid.type, step, viewport.x, viewport.y, api.getWidth(), api.getHeight());
  const style = grid.type === 'line'
    ? { fill: 'none', stroke: grid.color, lineWidth: 1 }
    : { fill: grid.color, stroke: 'none' };
  return { type: 'path', silent: true, shape: { pathData }, style };
}
