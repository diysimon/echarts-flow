import type { EChartsType } from 'echarts';
import type { Viewport } from '../types';
import { FLOW_GRID_SERIES_ID } from '../render/flowPayload';
import { snapToPixel } from '../render/pixelAlign';
import { GRID_ELEMENT_NAME } from '../render/renderFlowGrid';

/** The zrender group fields used here; ECharts has no public API for moving a series as a whole. */
interface ZrGroupLike {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  name?: string;
  __ecComponentInfo?: { mainType: string; index: number } | null;
  markRedraw(): void;
  traverse(callback: (element: ZrGroupLike) => void): void;
}

interface ChartInternals {
  getModel(): { getSeriesByIndex(index: number): { id: string } | undefined };
}

const FLOW_SERIES_PREFIX = 'echarts-flow-';

function setTransform(element: ZrGroupLike, x: number, y: number, scale: number): void {
  if (element.x === x && element.y === y && element.scaleX === scale && element.scaleY === scale) {
    return;
  }
  element.x = x;
  element.y = y;
  element.scaleX = scale;
  element.scaleY = scale;
  element.markRedraw();
}

/**
 * Moves the already drawn flow series instead of rebuilding them, so panning
 * and wheel zoom stay smooth on large graphs. The editor shows the transformed
 * frame while the pointer moves and does a full render when it settles.
 * Relies on ECharts internals; when they are missing, `apply` returns false
 * and the caller falls back to a full render.
 */
export class ViewTransformer {
  private isTransformed = false;
  /** Root element moved with a CSS transform, while that mode is active. */
  private cssRoot: HTMLElement | null = null;

  constructor(private readonly chart: EChartsType) {}

  /**
   * Shows `next` by moving the chart's rendered bitmap with a CSS transform.
   * The browser composites it without any repaint, so the cost does not grow
   * with the graph; areas scrolled into view stay empty until the next full
   * render. Returns false when the root element is not available.
   */
  applyCss(rendered: Viewport, next: Viewport, pixelRatio = 1): boolean {
    const painter = this.chart.getZr().painter as unknown as { getViewportRoot?(): HTMLElement };
    const root = painter.getViewportRoot?.();
    if (!root?.style) {
      return false;
    }
    const scale = next.scale / rendered.scale;
    const x = snapToPixel(next.x - rendered.x * scale, pixelRatio);
    const y = snapToPixel(next.y - rendered.y * scale, pixelRatio);
    root.style.transformOrigin = '0 0';
    root.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.cssRoot = root;
    return true;
  }

  /** Whether a CSS transform is showing a moved view. */
  get isCssTransformed(): boolean {
    return this.cssRoot !== null;
  }

  /**
   * Shows `next` by transforming the frame drawn for `rendered`. Offsets snap
   * to the device pixel grid of `pixelRatio` so the moved picture stays sharp.
   * Returns false when that is not possible.
   */
  apply(rendered: Viewport, next: Viewport, gridStep: number, pixelRatio = 1): boolean {
    const groups = this.findSeriesGroups();
    if (!groups) {
      return false;
    }
    const scale = next.scale / rendered.scale;
    const x = snapToPixel(next.x - rendered.x * scale, pixelRatio);
    const y = snapToPixel(next.y - rendered.y * scale, pixelRatio);
    groups.forEach((group, seriesId) => {
      if (seriesId === FLOW_GRID_SERIES_ID) {
        this.slideGrid(group, scale === 1 ? x : 0, scale === 1 ? y : 0, gridStep, pixelRatio);
      } else {
        setTransform(group, x, y, scale);
      }
    });
    this.isTransformed = true;
    this.chart.getZr().refresh();
    return true;
  }

  /** Puts every series back in place; call before a full render. Returns whether anything was moved. */
  reset(): boolean {
    const wasCssTransformed = this.cssRoot !== null;
    if (this.cssRoot) {
      this.cssRoot.style.transform = '';
      this.cssRoot = null;
    }
    if (!this.isTransformed) {
      return wasCssTransformed;
    }
    this.isTransformed = false;
    this.findSeriesGroups()?.forEach((group, seriesId) => {
      if (seriesId === FLOW_GRID_SERIES_ID) {
        this.slideGrid(group, 0, 0, 0);
      } else {
        setTransform(group, 0, 0, 1);
      }
    });
    return true;
  }

  /** The grid repeats every cell, so sliding it by the offset modulo one cell looks the same as moving it. */
  private slideGrid(group: ZrGroupLike, x: number, y: number, step: number, pixelRatio = 1): void {
    const wrap = (value: number) => (step > 0 ? ((value % step) + step) % step : 0);
    group.traverse((element) => {
      if (element.name === GRID_ELEMENT_NAME) {
        setTransform(element, snapToPixel(wrap(x), pixelRatio), snapToPixel(wrap(y), pixelRatio), 1);
      }
    });
  }

  private findSeriesGroups(): Map<string, ZrGroupLike> | null {
    const model = (this.chart as unknown as Partial<ChartInternals>).getModel?.();
    const roots = (this.chart.getZr().storage as unknown as { getRoots?(): ZrGroupLike[] }).getRoots?.();
    if (!model || !roots) {
      return null;
    }
    const groups = new Map<string, ZrGroupLike>();
    roots.forEach((group) => {
      const info = group.__ecComponentInfo;
      const id = info?.mainType === 'series' ? model.getSeriesByIndex(info.index)?.id : undefined;
      if (id?.startsWith(FLOW_SERIES_PREFIX)) {
        groups.set(id, group);
      }
    });
    return groups.size > 0 ? groups : null;
  }
}
