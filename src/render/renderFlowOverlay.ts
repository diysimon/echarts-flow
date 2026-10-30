import type { CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { toScreen } from '../geometry/viewport';
import type { AlignGuide, EdgeHandle, FlowHitInfo, FlowOverlayPayload } from './flowPayload';
import { alignToPixel, snapLineWidth, snapToPixel } from './pixelAlign';
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
  const ratio = payload.pixelRatio ?? 1;
  const topLeft = toScreen(viewport, selectionBox);
  return {
    type: 'rect',
    name: 'selection-box',
    silent: true,
    shape: {
      x: alignToPixel(topLeft.x, 1, ratio),
      y: alignToPixel(topLeft.y, 1, ratio),
      width: snapToPixel(selectionBox.width * viewport.scale, ratio),
      height: snapToPixel(selectionBox.height * viewport.scale, ratio),
    },
    style: {
      fill: theme.selected,
      fillOpacity: SELECTION_BOX_FILL_OPACITY,
      stroke: theme.selected,
      lineWidth: snapLineWidth(1, ratio),
      lineDash: SELECTION_BOX_DASH,
    },
  };
}

function buildGuide(payload: FlowOverlayPayload, guide: AlignGuide, index: number): ElementOption {
  const { viewport, theme } = payload;
  const ratio = payload.pixelRatio ?? 1;
  const isVertical = guide.axis === 'x';
  const start = toScreen(viewport, isVertical ? { x: guide.position, y: guide.start } : { x: guide.start, y: guide.position });
  const end = toScreen(viewport, isVertical ? { x: guide.position, y: guide.end } : { x: guide.end, y: guide.position });
  const across = alignToPixel(isVertical ? start.x : start.y, GUIDE_LINE_WIDTH, ratio);
  return {
    type: 'line',
    name: `guide-${index}`,
    silent: true,
    shape: isVertical
      ? { x1: across, y1: snapToPixel(start.y, ratio), x2: across, y2: snapToPixel(end.y, ratio) }
      : { x1: snapToPixel(start.x, ratio), y1: across, x2: snapToPixel(end.x, ratio), y2: across },
    style: { stroke: theme.selected, lineWidth: snapLineWidth(GUIDE_LINE_WIDTH, ratio), lineDash: GUIDE_DASH },
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
    shape: { cx: snapToPixel(center.x, payload.pixelRatio), cy: snapToPixel(center.y, payload.pixelRatio), r: theme.port.radius },
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
