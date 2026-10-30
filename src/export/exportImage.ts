import { init } from 'echarts/core';
import type { FlowGraph, Point } from '../types';
import { buildFlowOptionFromScene, buildFlowScene, type FlowOptionConfig, type FlowScene } from '../option/buildFlowOption';
import { calcNodesBounds, calcRectsBounds, mergeBounds, type Bounds } from '../geometry/viewport';

export interface FlowImageOptions extends Pick<FlowOptionConfig, 'direction' | 'theme' | 'layout' | 'routing'> {
  /** Space around the drawing, in output pixels before `pixelRatio`. Defaults to 24. */
  padding?: number;
  /** Zoom of the drawing; 1 draws world units as CSS pixels. Defaults to 1. */
  scale?: number;
  /** PNG only: device pixels per CSS pixel. Defaults to 2 so the image stays sharp on Retina screens. */
  pixelRatio?: number;
  /** Overrides the theme background, for example 'transparent'. */
  backgroundColor?: string;
}

const DEFAULT_PADDING = 24;
const DEFAULT_PIXEL_RATIO = 2;

function calcPointsBounds(points: Point[]): Bounds | null {
  if (points.length === 0) {
    return null;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Everything drawn: nodes, lanes, the title and edges, which may route outside the nodes. */
function calcSceneBounds(scene: FlowScene): Bounds | null {
  const laneRects = [...scene.lanes.lanes, ...(scene.lanes.title ? [scene.lanes.title] : [])];
  const edgePoints = scene.edges.flatMap((edge) => [...edge.points, edge.labelPosition]);
  return mergeBounds(mergeBounds(calcNodesBounds(scene.nodes), calcRectsBounds(laneRects)), calcPointsBounds(edgePoints));
}

interface ExportFrame {
  scene: FlowScene;
  config: FlowOptionConfig;
  width: number;
  height: number;
}

/** Scene plus a viewport that puts the whole drawing inside an image of the returned size. */
function buildExportFrame(graph: FlowGraph, options: FlowImageOptions): ExportFrame {
  const padding = options.padding ?? DEFAULT_PADDING;
  const scale = options.scale ?? 1;
  const base: FlowOptionConfig = { ...options, animation: false };
  const scene = buildFlowScene(graph, base);
  const bounds = calcSceneBounds(scene) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const viewport = { scale, x: padding - bounds.minX * scale, y: padding - bounds.minY * scale };
  return {
    scene,
    config: { ...base, viewport },
    width: Math.ceil((bounds.maxX - bounds.minX) * scale + padding * 2),
    height: Math.ceil((bounds.maxY - bounds.minY) * scale + padding * 2),
  };
}

function buildExportOption(frame: ExportFrame, options: FlowImageOptions) {
  const option = buildFlowOptionFromScene(frame.scene, frame.config);
  return options.backgroundColor ? { ...option, backgroundColor: options.backgroundColor } : option;
}

/**
 * Renders the whole graph, not just the visible part, to an SVG document
 * string. Needs `SVGRenderer` registered with `echarts.use()`. Uses server
 * side rendering, so it works without a DOM.
 */
export function exportFlowSvg(graph: FlowGraph, options: FlowImageOptions = {}): string {
  const frame = buildExportFrame(graph, options);
  const chart = init(null, null, { renderer: 'svg', ssr: true, width: frame.width, height: frame.height });
  try {
    chart.setOption(buildExportOption(frame, options));
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

/**
 * Renders the whole graph to a PNG data URL in an off-screen chart. Needs a
 * browser and `CanvasRenderer` registered with `echarts.use()`.
 */
export function exportFlowPng(graph: FlowGraph, options: FlowImageOptions = {}): string {
  const frame = buildExportFrame(graph, options);
  const container = document.createElement('div');
  const pixelRatio = options.pixelRatio ?? DEFAULT_PIXEL_RATIO;
  const chart = init(container, null, { renderer: 'canvas', width: frame.width, height: frame.height, devicePixelRatio: pixelRatio });
  try {
    chart.setOption(buildExportOption(frame, options));
    return chart.getDataURL({ type: 'png', pixelRatio });
  } finally {
    chart.dispose();
  }
}
