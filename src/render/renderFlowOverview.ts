import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { ElementBatcher } from './elementBatch';
import type { FlowEdgePayload, FlowNodePayload, FlowOverviewPayload } from './flowPayload';
import { getLabelLayers, paintLabels } from './labelLayer';
import { renderFlowEdge } from './renderFlowEdge';
import { renderFlowNode, type ElementOption } from './renderFlowNode';

/** Draw order inside each layer, by element name; unnamed and other elements go first. */
const EDGE_RANKS = { line: 0, 'arrow-target': 1, 'arrow-source': 1 };
const NODE_RANKS = { shape: 0, accent: 1, decoration: 2, status: 3 };

function renderItems(
  payload: FlowNodePayload | FlowEdgePayload,
  count: number,
  render: (params: CustomSeriesRenderItemParams) => CustomSeriesRenderItemReturn,
  batcher: ElementBatcher,
): void {
  const params = { itemPayload: payload, dataIndex: 0 } as unknown as CustomSeriesRenderItemParams;
  for (let index = 0; index < count; index++) {
    params.dataIndex = index;
    batcher.add(render(params) as ElementOption | null);
  }
}

function buildLabelImage(canvas: HTMLCanvasElement, width: number, height: number): ElementOption {
  return { type: 'image', silent: true, style: { image: canvas, x: 0, y: 0, width, height } };
}

/**
 * Draws many nodes and edges as a handful of elements: each is rendered as
 * usual, then elements with the same style are merged into one path and all
 * labels are painted onto one canvas per layer. Looks the same as the
 * regular series at the zoom levels it is used for, but cannot be hit.
 */
export function renderFlowOverview(params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn {
  const payload = params.itemPayload as unknown as FlowOverviewPayload;
  const edgeBatch = new ElementBatcher(EDGE_RANKS);
  const nodeBatch = new ElementBatcher(NODE_RANKS);
  renderItems(payload.edges, payload.edges.edges.length, renderFlowEdge, edgeBatch);
  renderItems(payload.nodes, payload.nodes.nodes.length, renderFlowNode, nodeBatch);

  const width = api.getWidth();
  const height = api.getHeight();
  const pixelRatio = api.getDevicePixelRatio();
  const layers = getLabelLayers(api.getZr());
  paintLabels(layers.edge, edgeBatch.texts, width, height, pixelRatio);
  paintLabels(layers.node, nodeBatch.texts, width, height, pixelRatio);
  return {
    type: 'group',
    silent: true,
    children: [
      ...edgeBatch.toElements(),
      buildLabelImage(layers.edge, width, height),
      ...nodeBatch.toElements(),
      buildLabelImage(layers.node, width, height),
    ],
  };
}
