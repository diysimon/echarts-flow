import type { EChartsType } from 'echarts';
import { ViewTransformer } from './viewTransform';

interface FakeElement {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  name?: string;
  __ecComponentInfo?: { mainType: string; index: number };
  children: FakeElement[];
  markRedraw(): void;
  traverse(callback: (element: FakeElement) => void): void;
}

function createElement(patch: Partial<FakeElement> = {}): FakeElement {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    children: [],
    markRedraw: vi.fn(),
    traverse(callback) {
      this.children.forEach(callback);
    },
    ...patch,
  };
}

const SERIES_IDS = ['echarts-flow-grid', 'echarts-flow-node'];

function createChart() {
  const gridPath = createElement({ name: 'grid' });
  const gridGroup = createElement({ __ecComponentInfo: { mainType: 'series', index: 0 }, children: [gridPath] });
  const nodeGroup = createElement({ __ecComponentInfo: { mainType: 'series', index: 1 } });
  const chart = {
    getModel: () => ({ getSeriesByIndex: (index: number) => ({ id: SERIES_IDS[index] }) }),
    getZr: () => ({ storage: { getRoots: () => [gridGroup, nodeGroup] }, refresh: vi.fn() }),
  } as unknown as EChartsType;
  return { chart, gridPath, gridGroup, nodeGroup };
}

const RENDERED = { x: 0, y: 0, scale: 1 };

describe('ViewTransformer', () => {
  it('should move the node series by the pan offset', () => {
    // Arrange
    const { chart, nodeGroup } = createChart();

    // Act
    new ViewTransformer(chart).apply(RENDERED, { x: 35, y: -12, scale: 1 }, 20);

    // Assert
    expect([nodeGroup.x, nodeGroup.y]).toEqual([35, -12]);
  });

  it('should slide the grid by the offset modulo one cell', () => {
    // Arrange
    const { chart, gridPath } = createChart();

    // Act
    new ViewTransformer(chart).apply(RENDERED, { x: 35, y: -12, scale: 1 }, 20);

    // Assert
    expect([gridPath.x, gridPath.y]).toEqual([15, 8]);
  });

  it('should scale around the origin so the anchor stays put when zooming', () => {
    // Arrange: zoom 2x keeping screen point 100 fixed
    const { chart, nodeGroup } = createChart();

    // Act
    new ViewTransformer(chart).apply(RENDERED, { x: -100, y: -100, scale: 2 }, 20);

    // Assert
    expect([nodeGroup.scaleX, nodeGroup.x]).toEqual([2, -100]);
  });

  it('should put the series back when reset', () => {
    // Arrange
    const { chart, nodeGroup } = createChart();
    const transformer = new ViewTransformer(chart);
    transformer.apply(RENDERED, { x: 35, y: -12, scale: 1 }, 20);

    // Act
    transformer.reset();

    // Assert
    expect([nodeGroup.x, nodeGroup.y, nodeGroup.scaleX]).toEqual([0, 0, 1]);
  });

  it('should report that it moved something when reset after a transform', () => {
    // Arrange
    const { chart } = createChart();
    const transformer = new ViewTransformer(chart);
    transformer.apply(RENDERED, { x: 35, y: -12, scale: 1 }, 20);

    // Act
    const wasTransformed = transformer.reset();

    // Assert
    expect(wasTransformed).toBe(true);
  });

  it('should report that nothing moved when reset without a transform', () => {
    // Act
    const wasTransformed = new ViewTransformer(createChart().chart).reset();

    // Assert
    expect(wasTransformed).toBe(false);
  });

  it('should report failure when the chart internals are missing', () => {
    // Arrange
    const chart = { getZr: () => ({ storage: {} }) } as unknown as EChartsType;

    // Act
    const isApplied = new ViewTransformer(chart).apply(RENDERED, { x: 10, y: 0, scale: 1 }, 20);

    // Assert
    expect(isApplied).toBe(false);
  });
});

function createCssChart() {
  const root = { style: { transform: '', transformOrigin: '' } };
  const chart = {
    getZr: () => ({ painter: { getViewportRoot: () => root } }),
  } as unknown as EChartsType;
  return { chart, root };
}

describe('ViewTransformer.applyCss', () => {
  it('should translate and scale the viewport root when the view moves', () => {
    // Arrange
    const { chart, root } = createCssChart();

    // Act
    new ViewTransformer(chart).applyCss(RENDERED, { x: -100, y: 20, scale: 2 });

    // Assert
    expect(root.style.transform).toBe('translate(-100px, 20px) scale(2)');
  });

  it('should clear the root transform when reset', () => {
    // Arrange
    const { chart, root } = createCssChart();
    const transformer = new ViewTransformer(chart);
    transformer.applyCss(RENDERED, { x: 30, y: 0, scale: 1 });

    // Act
    transformer.reset();

    // Assert
    expect(root.style.transform).toBe('');
  });

  it('should report that it moved something when reset after a css transform', () => {
    // Arrange
    const { chart } = createCssChart();
    const transformer = new ViewTransformer(chart);
    transformer.applyCss(RENDERED, { x: 30, y: 0, scale: 1 });

    // Act
    const wasTransformed = transformer.reset();

    // Assert
    expect(wasTransformed).toBe(true);
  });

  it('should report failure when the painter has no viewport root', () => {
    // Arrange
    const chart = { getZr: () => ({ painter: {} }) } as unknown as EChartsType;

    // Act
    const isApplied = new ViewTransformer(chart).applyCss(RENDERED, { x: 30, y: 0, scale: 1 });

    // Assert
    expect(isApplied).toBe(false);
  });
});
