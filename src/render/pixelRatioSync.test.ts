import type { EChartsType } from 'echarts';
import { applyDevicePixelRatio, watchDevicePixelRatio } from './pixelRatioSync';

interface FakeLayer {
  dpr: number;
  ctx: { dpr: number };
  backingWidth: number;
  resize(width: number, height: number): void;
}

const CHART_WIDTH = 400;
const CHART_HEIGHT = 300;

function createLayer(dpr: number): FakeLayer {
  return {
    dpr,
    ctx: { dpr },
    backingWidth: CHART_WIDTH * dpr,
    resize(width) {
      this.backingWidth = width * this.dpr;
    },
  };
}

function createChart(options: { type?: string; dpr?: number; fixedRatio?: number } = {}) {
  const dpr = options.dpr ?? 1;
  const layers = [createLayer(dpr), createLayer(dpr)];
  const painter = {
    type: options.type ?? 'canvas',
    dpr,
    _opts: { devicePixelRatio: options.fixedRatio },
    getWidth: () => CHART_WIDTH,
    getHeight: () => CHART_HEIGHT,
    eachLayer: (callback: (layer: FakeLayer) => void) => layers.forEach(callback),
    refresh: vi.fn(),
  };
  const chart = { getZr: () => ({ painter }) } as unknown as EChartsType;
  return { chart, painter, layers };
}

interface FakeMediaQuery {
  listeners: Set<() => void>;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

function stubMatchMedia(): FakeMediaQuery[] {
  const queries: FakeMediaQuery[] = [];
  vi.stubGlobal('matchMedia', () => {
    const query: FakeMediaQuery = {
      listeners: new Set(),
      addEventListener(_type, listener) { this.listeners.add(listener); },
      removeEventListener(_type, listener) { this.listeners.delete(listener); },
    };
    queries.push(query);
    return query;
  });
  return queries;
}

function changeRatio(queries: FakeMediaQuery[], ratio: number): void {
  vi.stubGlobal('devicePixelRatio', ratio);
  queries[queries.length - 1]?.listeners.forEach((listener) => listener());
}

describe('applyDevicePixelRatio', () => {
  it('should resize every layer backing store when ratio changes', () => {
    // Arrange
    const { chart, layers } = createChart();

    // Act
    applyDevicePixelRatio(chart, 2);

    // Assert
    expect(layers.map((layer) => layer.backingWidth)).toEqual([CHART_WIDTH * 2, CHART_WIDTH * 2]);
  });

  it('should update the context ratio used for transforms when ratio changes', () => {
    // Arrange
    const { chart, layers } = createChart();

    // Act
    applyDevicePixelRatio(chart, 2);

    // Assert
    expect(layers[0].ctx.dpr).toBe(2);
  });

  it('should repaint everything when ratio changes', () => {
    // Arrange
    const { chart, painter } = createChart();

    // Act
    applyDevicePixelRatio(chart, 2);

    // Assert
    expect(painter.refresh).toHaveBeenCalledWith({ paintAll: true });
  });

  it('should leave the chart alone when ratio was fixed at init', () => {
    // Arrange
    const { chart } = createChart({ fixedRatio: 3 });

    // Act
    const isChanged = applyDevicePixelRatio(chart, 2);

    // Assert
    expect(isChanged).toBe(false);
  });

  it('should leave the chart alone when renderer is svg', () => {
    // Arrange
    const { chart } = createChart({ type: 'svg' });

    // Act
    const isChanged = applyDevicePixelRatio(chart, 2);

    // Assert
    expect(isChanged).toBe(false);
  });
});

describe('watchDevicePixelRatio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should apply the new ratio when the resolution query changes', () => {
    // Arrange
    const queries = stubMatchMedia();
    const { chart, painter } = createChart();
    watchDevicePixelRatio(chart);

    // Act
    changeRatio(queries, 2);

    // Assert
    expect(painter.dpr).toBe(2);
  });

  it('should keep following changes when ratio changes twice', () => {
    // Arrange
    const queries = stubMatchMedia();
    const { chart, painter } = createChart();
    watchDevicePixelRatio(chart);

    // Act
    changeRatio(queries, 2);
    changeRatio(queries, 1.5);

    // Assert
    expect(painter.dpr).toBe(1.5);
  });

  it('should stop following changes when the returned function is called', () => {
    // Arrange
    const queries = stubMatchMedia();
    const { chart, painter } = createChart();
    const stop = watchDevicePixelRatio(chart);

    // Act
    stop();
    changeRatio(queries, 2);

    // Assert
    expect(painter.dpr).toBe(1);
  });
});
