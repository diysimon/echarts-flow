import type { EChartsType } from 'echarts';
import type { Viewport } from '../types';
import { FLOW_GRID_SERIES_ID } from '../render/flowPayload';
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

  constructor(private readonly chart: EChartsType) {}

  /** Shows `next` by transforming the frame drawn for `rendered`. Returns false when that is not possible. */
  apply(rendered: Viewport, next: Viewport, gridStep: number): boolean {
    const groups = this.findSeriesGroups();
    if (!groups) {
      return false;
    }
    const scale = next.scale / rendered.scale;
    const x = Math.round(next.x - rendered.x * scale);
    const y = Math.round(next.y - rendered.y * scale);
    groups.forEach((group, seriesId) => {
      if (seriesId === FLOW_GRID_SERIES_ID) {
        this.slideGrid(group, scale === 1 ? x : 0, scale === 1 ? y : 0, gridStep);
      } else {
        setTransform(group, x, y, scale);
      }
    });
    this.isTransformed = true;
    this.chart.getZr().refresh();
    return true;
  }

  /** Puts every series back in place; call before a full render. */
  reset(): void {
    if (!this.isTransformed) {
      return;
    }
    this.isTransformed = false;
    this.findSeriesGroups()?.forEach((group, seriesId) => {
      if (seriesId === FLOW_GRID_SERIES_ID) {
        this.slideGrid(group, 0, 0, 0);
      } else {
        setTransform(group, 0, 0, 1);
      }
    });
  }

  /** The grid repeats every cell, so sliding it by the offset modulo one cell looks the same as moving it. */
  private slideGrid(group: ZrGroupLike, x: number, y: number, step: number): void {
    const wrap = (value: number) => (step > 0 ? ((value % step) + step) % step : 0);
    group.traverse((element) => {
      if (element.name === GRID_ELEMENT_NAME) {
        setTransform(element, Math.round(wrap(x)), Math.round(wrap(y)), 1);
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
