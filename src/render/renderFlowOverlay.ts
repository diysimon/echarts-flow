import type { CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { toScreen } from '../geometry/viewport';
import type { AlignGuide, EdgeHandle, FlowHitInfo, FlowOverlayPayload } from './flowPayload';
import { alignToPixel } from './pixelAlign';
import type { ElementOption } from './renderFlowNode';

const SELECTION_BOX_FILL_OPACITY = 0.08;
const SELECTION_BOX_DASH = [4, 3];
const GUIDE_LINE_WIDTH = 1;
const GUIDE_DASH = [3, 3];
const HANDLE_LINE_WIDTH = 2;

function buildSelectionBox(payload: FlowOverlayPayload): ElementOption | null {
  const { selectionBox, viewport, theme } = payload;
  if (!selectionBox) {
    return null;
  }
  const topLeft = toScreen(viewport, selectionBox);
  return {
    type: 'rect',
    name: 'selection-box',
    silent: true,
    shape: {
      x: alignToPixel(topLeft.x, 1),
      y: alignToPixel(topLeft.y, 1),
      width: Math.round(selectionBox.width * viewport.scale),
      height: Math.round(selectionBox.height * viewport.scale),
    },
    style: {
      fill: theme.selected,
      fillOpacity: SELECTION_BOX_FILL_OPACITY,
      stroke: theme.selected,
      lineWidth: 1,
      lineDash: SELECTION_BOX_DASH,
    },
  };
}

function buildGuide(payload: FlowOverlayPayload, guide: AlignGuide, index: number): ElementOption {
  const { viewport, theme } = payload;
  const isVertical = guide.axis === 'x';
  const start = toScreen(viewport, isVertical ? { x: guide.position, y: guide.start } : { x: guide.start, y: guide.position });
  const end = toScreen(viewport, isVertical ? { x: guide.position, y: guide.end } : { x: guide.end, y: guide.position });
  const across = alignToPixel(isVertical ? start.x : start.y, GUIDE_LINE_WIDTH);
  return {
    type: 'line',
    name: `guide-${index}`,
    silent: true,
    shape: isVertical
      ? { x1: across, y1: Math.round(start.y), x2: across, y2: Math.round(end.y) }
      : { x1: Math.round(start.x), y1: across, x2: Math.round(end.x), y2: across },
    style: { stroke: theme.selected, lineWidth: GUIDE_LINE_WIDTH, lineDash: GUIDE_DASH },
  };
}

function buildEdgeHandle(payload: FlowOverlayPayload, handle: EdgeHandle): ElementOption {
  const { viewport, theme } = payload;
  const center = toScreen(viewport, handle.point);
  const info: FlowHitInfo = { role: 'edge-end', edgeId: handle.edgeId, end: handle.end };
  return {
    type: 'circle',
    name: `edge-handle-${handle.end}`,
    info,
    shape: { cx: Math.round(center.x), cy: Math.round(center.y), r: theme.port.radius },
    style: { fill: theme.port.fill, stroke: theme.selected, lineWidth: HANDLE_LINE_WIDTH },
  };
}

/** Draws editor feedback above nodes; only the edge handles take pointer events. */
export function renderFlowOverlay(params: CustomSeriesRenderItemParams): CustomSeriesRenderItemReturn {
  const payload = params.itemPayload as unknown as FlowOverlayPayload;
  const children = [
    ...payload.guides.map((guide, index) => buildGuide(payload, guide, index)),
    buildSelectionBox(payload),
    ...payload.edgeHandles.map((handle) => buildEdgeHandle(payload, handle)),
  ].filter((child): child is ElementOption => child !== null);
  if (children.length === 0) {
    return null;
  }
  return { type: 'group', children };
}
