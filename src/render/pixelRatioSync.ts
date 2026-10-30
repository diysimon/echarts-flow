import type { EChartsType } from 'echarts';

/**
 * The parts of zrender's canvas painter that hold the pixel ratio. ECharts
 * reads devicePixelRatio once at init and has no public way to change it.
 */
interface CanvasLayerLike {
  dpr: number;
  ctx?: { dpr?: number };
  resize(width: number, height: number): void;
}

interface CanvasPainterLike {
  type: string;
  dpr: number;
  _opts?: { devicePixelRatio?: number };
  getWidth(): number;
  getHeight(): number;
  eachLayer(callback: (layer: CanvasLayerLike) => void): void;
  refresh(options: { paintAll: boolean }): void;
}

function getCanvasPainter(chart: EChartsType): CanvasPainterLike | null {
  const painter = (chart.getZr() as unknown as { painter?: CanvasPainterLike }).painter;
  return painter?.type === 'canvas' ? painter : null;
}

/**
 * Resizes the chart's canvas backing store to a new pixel ratio and repaints.
 * Returns false when nothing changed: SVG renderer, a ratio fixed through
 * `init(..., { devicePixelRatio })`, or the ratio is already current.
 */
export function applyDevicePixelRatio(chart: EChartsType, ratio: number): boolean {
  const painter = getCanvasPainter(chart);
  const isFixedByUser = painter?._opts?.devicePixelRatio != null;
  if (!painter || isFixedByUser || painter.dpr === ratio) {
    return false;
  }
  const width = painter.getWidth();
  const height = painter.getHeight();
  painter.dpr = ratio;
  painter.eachLayer((layer) => {
    layer.dpr = ratio;
    if (layer.ctx) {
      layer.ctx.dpr = ratio;
    }
    layer.resize(width, height);
  });
  painter.refresh({ paintAll: true });
  return true;
}

/**
 * Keeps the canvas sharp when the pixel ratio changes after init: browser
 * zoom, or moving the window between a Retina and a regular display.
 * Without this the old bitmap is stretched and text turns soft.
 * Returns a function that stops watching.
 */
export function watchDevicePixelRatio(chart: EChartsType): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  let query: MediaQueryList | null = null;
  const handleChange = (): void => {
    applyDevicePixelRatio(chart, window.devicePixelRatio);
    listen();
  };
  // A resolution query only matches one ratio, so re-arm it after each change.
  function listen(): void {
    query?.removeEventListener('change', handleChange);
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', handleChange);
  }
  listen();
  return () => query?.removeEventListener('change', handleChange);
}
