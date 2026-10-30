import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { FlowBackdropBlob } from '../theme/flowTheme';
import type { FlowGridPayload } from './flowPayload';
import { alignToPixel, snapLineWidth, snapToPixel } from './pixelAlign';
import type { ElementOption } from './renderFlowNode';

/** Skip the grid when zoomed out so far that cells would be denser than this. */
const MIN_CELL_PIXELS = 6;
const DOT_SIZE = 1.5;
const GRID_LINE_WIDTH = 1;
export const GRID_ELEMENT_NAME = 'grid';
/** Tiles are tiny; the cap only stops a long zoom session from keeping hundreds of them. */
const MAX_CACHED_TILES = 64;

const tileCache = new Map<string, HTMLCanvasElement>();

/**
 * One grid cell drawn into a small canvas, in device pixels. Filling a single
 * rectangle with it as a repeating pattern costs about the same at any grid
 * density, while a path with thousands of dots took over 20ms to paint each
 * frame. Returns null where there is no canvas, such as server-side rendering
 * or jsdom, and the caller falls back to the path.
 */
function getGridTile(type: 'dot' | 'line', tilePixels: number, color: string, ratio: number): HTMLCanvasElement | null {
  const key = `${type}|${tilePixels}|${color}|${ratio}`;
  const cached = tileCache.get(key);
  if (cached) {
    return cached;
  }
  if (typeof document === 'undefined') {
    return null;
  }
  const tile = document.createElement('canvas');
  tile.width = tilePixels;
  tile.height = tilePixels;
  const context = tile.getContext('2d');
  if (!context) {
    return null;
  }
  context.fillStyle = color;
  if (type === 'dot') {
    const dot = Math.max(Math.round(DOT_SIZE * ratio), 1);
    context.fillRect(0, 0, dot, dot);
  } else {
    const line = Math.max(Math.round(GRID_LINE_WIDTH * ratio), 1);
    context.fillRect(0, 0, tilePixels, line);
    context.fillRect(0, 0, line, tilePixels);
  }
  if (tileCache.size >= MAX_CACHED_TILES) {
    tileCache.clear();
  }
  tileCache.set(key, tile);
  return tile;
}

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
export function buildGridPath(
  type: 'dot' | 'line',
  step: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  ratio = 1,
): string {
  const startX = calcGridStart(offsetX, step);
  const startY = calcGridStart(offsetY, step);
  const endX = width + step;
  const endY = height + step;
  const commands: string[] = [];
  if (type === 'line') {
    for (let x = startX; x <= endX; x += step) {
      const lineX = alignToPixel(x, 1, ratio);
      commands.push(`M${lineX},${-step} L${lineX},${endY}`);
    }
    for (let y = startY; y <= endY; y += step) {
      const lineY = alignToPixel(y, 1, ratio);
      commands.push(`M${-step},${lineY} L${endX},${lineY}`);
    }
    return commands.join(' ');
  }
  const dot = snapLineWidth(DOT_SIZE, ratio);
  for (let x = startX; x <= endX; x += step) {
    for (let y = startY; y <= endY; y += step) {
      commands.push(`M${snapToPixel(x, ratio)},${snapToPixel(y, ratio)} h${dot} v${dot} h${-dot} Z`);
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

/**
 * A rectangle filled with the cell tile as a repeating pattern. The tile is a
 * whole number of device pixels, so the pattern is scaled to the exact cell
 * size and stays fixed to the world as the canvas pans.
 */
function buildPatternGrid(payload: FlowGridPayload, step: number, width: number, height: number): ElementOption | null {
  const { viewport, theme } = payload;
  const ratio = payload.pixelRatio ?? 1;
  const tilePixels = Math.max(Math.round(step * ratio), 1);
  const tile = getGridTile(theme.grid.type === 'line' ? 'line' : 'dot', tilePixels, theme.grid.color, ratio);
  if (!tile) {
    return null;
  }
  const pattern = {
    image: tile,
    repeat: 'repeat' as const,
    x: snapToPixel(calcGridStart(viewport.x, step), ratio),
    y: snapToPixel(calcGridStart(viewport.y, step), ratio),
    scaleX: step / tilePixels,
    scaleY: step / tilePixels,
  };
  // Covers one spare cell on each side so the editor can slide it while panning.
  const shape = { x: -step, y: -step, width: width + step * 3, height: height + step * 3 };
  return { type: 'rect', name: GRID_ELEMENT_NAME, silent: true, x: 0, y: 0, shape, style: { fill: pattern, stroke: 'none' } };
}

function buildGrid(payload: FlowGridPayload, width: number, height: number): ElementOption | null {
  const { viewport, theme } = payload;
  const { grid } = theme;
  const step = grid.size * viewport.scale;
  if (grid.type === 'none' || step < MIN_CELL_PIXELS) {
    return null;
  }
  const patternGrid = payload.shouldUsePattern ? buildPatternGrid(payload, step, width, height) : null;
  if (patternGrid) {
    return patternGrid;
  }
  const ratio = payload.pixelRatio ?? 1;
  const pathData = buildGridPath(grid.type, step, viewport.x, viewport.y, width, height, ratio);
  const style = grid.type === 'line'
    ? { fill: 'none', stroke: grid.color, lineWidth: snapLineWidth(GRID_LINE_WIDTH, ratio) }
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
