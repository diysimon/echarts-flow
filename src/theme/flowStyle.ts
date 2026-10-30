import type { FlowNodeShape } from '../types';

/** Pointer hit area of edges, in screen pixels at every zoom level. */
export const EDGE_HIT_WIDTH = 12;

export const DEFAULT_NODE_SIZE: Record<FlowNodeShape, { width: number; height: number }> = {
  start: { width: 100, height: 40 },
  end: { width: 100, height: 40 },
  process: { width: 120, height: 48 },
  decision: { width: 130, height: 70 },
  io: { width: 130, height: 48 },
  circle: { width: 48, height: 48 },
  hexagon: { width: 130, height: 52 },
  document: { width: 120, height: 56 },
  database: { width: 100, height: 64 },
  subprocess: { width: 130, height: 48 },
  text: { width: 80, height: 30 },
};

/**
 * Share of the node width usable for text. Shapes with slanted or curved
 * sides keep text away from the outline.
 */
export const TEXT_WIDTH_RATIO: Record<FlowNodeShape, number> = {
  start: 0.85,
  end: 0.85,
  process: 1,
  decision: 0.6,
  io: 0.8,
  circle: 0.7,
  hexagon: 0.75,
  document: 1,
  database: 1,
  subprocess: 0.8,
  text: 1,
};
