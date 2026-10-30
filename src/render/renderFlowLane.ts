import type { CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { Viewport } from '../types';
import type { LaneBox, Rect, TitleBox } from '../layout/laneLayout';
import { isWideText } from '../geometry/textLayout';
import type { FlowTheme } from '../theme/flowTheme';
import type { FlowHitInfo, FlowLanePayload } from './flowPayload';
import { toZrColor } from './flowColor';
import { alignToPixel, snapLineHeight } from './pixelAlign';
import type { ElementOption } from './renderFlowNode';

/** Row headers read bottom to top, like a book spine. */
const ROW_HEADER_ROTATION = Math.PI / 2;
const STACKED_LINE_HEIGHT_RATIO = 1.25;

/** Screen rect with edges snapped so a border of `lineWidth` stays crisp. */
function projectRect(viewport: Viewport, rect: Rect, lineWidth: number) {
  const left = Math.round(viewport.x + rect.x * viewport.scale);
  const top = Math.round(viewport.y + rect.y * viewport.scale);
  const right = Math.round(viewport.x + (rect.x + rect.width) * viewport.scale);
  const bottom = Math.round(viewport.y + (rect.y + rect.height) * viewport.scale);
  return { x: alignToPixel(left, lineWidth), y: alignToPixel(top, lineWidth), width: right - left, height: bottom - top };
}

function buildLane(lane: LaneBox, viewport: Viewport, theme: FlowTheme): ElementOption {
  const { borderWidth, headerFontSize, headerFontWeight } = theme.lane;
  const body = projectRect(viewport, lane, borderWidth);
  const header = projectRect(viewport, lane.header, borderWidth);
  const info: FlowHitInfo = { role: 'lane', laneId: lane.id };
  // Row headers stack CJK labels one character per line; latin labels turn sideways instead.
  const isStacked = !lane.isColumn && isWideText(lane.label);
  const isRotated = !lane.isColumn && !isStacked;
  const fontSize = headerFontSize * viewport.scale;
  return {
    type: 'group',
    children: [
      {
        type: 'rect',
        name: 'body',
        // Silent so presses on empty lane space pan the canvas.
        silent: true,
        shape: body,
        style: { fill: toZrColor(lane.style.fill), stroke: lane.style.borderColor, lineWidth: borderWidth },
      },
      {
        type: 'rect',
        name: 'header',
        info,
        shape: header,
        style: { fill: toZrColor(lane.style.headerFill), stroke: lane.style.borderColor, lineWidth: borderWidth },
      },
      {
        type: 'text',
        name: 'label',
        silent: true,
        x: Math.round(header.x + header.width / 2),
        y: Math.round(header.y + header.height / 2),
        rotation: isRotated ? ROW_HEADER_ROTATION : 0,
        style: {
          text: isStacked ? Array.from(lane.label.replace(/\s/g, '')).join('\n') : lane.label,
          fill: lane.style.headerTextColor,
          fontSize,
          fontWeight: headerFontWeight,
          fontFamily: theme.fontFamily,
          lineHeight: snapLineHeight(fontSize * STACKED_LINE_HEIGHT_RATIO),
          align: 'center',
          verticalAlign: 'middle',
          width: (isRotated ? header.height : header.width) - headerFontSize,
          overflow: 'truncate',
        },
      },
    ],
  };
}

function buildTitle(title: TitleBox, viewport: Viewport, theme: FlowTheme): ElementOption {
  const box = projectRect(viewport, title, theme.lane.borderWidth);
  const info: FlowHitInfo = { role: 'title' };
  const hasFill = theme.title.fill !== 'transparent';
  return {
    type: 'group',
    children: [
      {
        type: 'rect',
        name: 'background',
        info,
        shape: box,
        style: {
          fill: theme.title.fill,
          stroke: hasFill ? theme.lane.borderColor : 'transparent',
          lineWidth: theme.lane.borderWidth,
        },
      },
      {
        type: 'text',
        name: 'label',
        silent: true,
        // A filled title bar centers its text; a bare title reads like a caption on the left.
        x: Math.round(hasFill ? box.x + box.width / 2 : box.x),
        y: Math.round(box.y + box.height / 2),
        style: {
          text: title.text,
          fill: theme.title.color,
          fontSize: theme.title.fontSize * viewport.scale,
          fontWeight: theme.title.fontWeight,
          fontFamily: theme.fontFamily,
          align: hasFill ? 'center' : 'left',
          verticalAlign: 'middle',
        },
      },
    ],
  };
}

/** Item i < lanes.length draws lane i; the item after the last lane draws the title. */
export function renderFlowLane(params: CustomSeriesRenderItemParams): CustomSeriesRenderItemReturn {
  const payload = params.itemPayload as unknown as FlowLanePayload;
  const lane = payload.lanes[params.dataIndex];
  if (lane) {
    return buildLane(lane, payload.viewport, payload.theme);
  }
  return payload.title ? buildTitle(payload.title, payload.viewport, payload.theme) : null;
}
