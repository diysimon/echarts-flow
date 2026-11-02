import type { CustomSeriesRenderItem } from 'echarts';
import { registerBatchShape } from './render/elementBatch';
import { registerFlowShapes } from './render/flowShapes';
import { renderFlowEdge } from './render/renderFlowEdge';
import { renderFlowGrid } from './render/renderFlowGrid';
import { renderFlowLane } from './render/renderFlowLane';
import { renderFlowNode } from './render/renderFlowNode';
import { renderFlowOverlay } from './render/renderFlowOverlay';
import { renderFlowOverview } from './render/renderFlowOverview';
import {
  FLOW_EDGE_SERIES_TYPE,
  FLOW_GRID_SERIES_TYPE,
  FLOW_LANE_SERIES_TYPE,
  FLOW_NODE_SERIES_TYPE,
  FLOW_OVERLAY_SERIES_TYPE,
  FLOW_OVERVIEW_SERIES_TYPE,
} from './render/flowPayload';

/** The subset of ECharts extension registers this package needs. */
export interface FlowExtensionRegisters {
  registerCustomSeries(seriesType: string, renderItem: CustomSeriesRenderItem): void;
}

export function install(registers: FlowExtensionRegisters): void {
  registerFlowShapes();
  registerBatchShape();
  registers.registerCustomSeries(FLOW_GRID_SERIES_TYPE, renderFlowGrid as CustomSeriesRenderItem);
  registers.registerCustomSeries(FLOW_LANE_SERIES_TYPE, renderFlowLane as CustomSeriesRenderItem);
  registers.registerCustomSeries(FLOW_OVERVIEW_SERIES_TYPE, renderFlowOverview as CustomSeriesRenderItem);
  registers.registerCustomSeries(FLOW_EDGE_SERIES_TYPE, renderFlowEdge as CustomSeriesRenderItem);
  registers.registerCustomSeries(FLOW_NODE_SERIES_TYPE, renderFlowNode as CustomSeriesRenderItem);
  registers.registerCustomSeries(FLOW_OVERLAY_SERIES_TYPE, renderFlowOverlay as CustomSeriesRenderItem);
}

/** Pass to `echarts.use()` to register the flow custom series. */
export const flowExtension = { install };
