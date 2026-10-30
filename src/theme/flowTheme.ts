import type { ArrowType, EdgeRouting, FlowNodeShape, FlowStatus, FontWeight, TextOverflow } from '../types';

export interface FlowShapeStyle {
  fill: string;
  stroke: string;
  text: string;
}

export interface FlowTheme {
  /** Canvas background; 'transparent' lets the host page show through. */
  background: string;
  fontFamily: string;
  /** Background grid that pans and zooms with the canvas. */
  grid: { type: 'dot' | 'line' | 'none'; size: number; color: string };
  text: {
    fontSize: number;
    fontWeight: FontWeight;
    lineHeight: number;
    /** 'wrap' grows the node to fit; 'truncate' keeps one line with an ellipsis. */
    overflow: TextOverflow;
    paddingX: number;
    paddingY: number;
  };
  shapes: Record<FlowNodeShape, FlowShapeStyle>;
  node: {
    lineWidth: number;
    activeLineWidth: number;
    lineDash: number[] | null;
    /** Corner radius of box shapes; start/end are always capsules. */
    radius: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetY: number;
    /** Auto-sized nodes stop growing here and wrap or truncate instead. */
    maxWidth: number;
    /** Blur of the selection and running glow. */
    glowBlur: number;
  };
  edge: {
    stroke: string;
    lineWidth: number;
    activeLineWidth: number;
    lineDash: number[] | null;
    routing: EdgeRouting;
    cornerRadius: number;
    sourceArrow: ArrowType;
    targetArrow: ArrowType;
    arrowSize: number;
    labelColor: string;
    labelBackground: string;
    labelBorder: string;
    labelFontSize: number;
    labelRadius: number;
    opacity: number;
  };
  lane: {
    fill: string;
    /** Every other lane uses this, for zebra striping. */
    alternateFill: string;
    headerFill: string;
    headerTextColor: string;
    headerFontSize: number;
    headerFontWeight: FontWeight;
    /** Header thickness: height of a column header, width of a row header. */
    headerSize: number;
    borderColor: string;
    borderWidth: number;
    /** Space between lane borders and the nodes inside. */
    padding: number;
    minSize: number;
  };
  title: { color: string; fill: string; fontSize: number; fontWeight: FontWeight; height: number };
  selected: string;
  hover: string;
  port: { fill: string; stroke: string; radius: number };
  status: Record<FlowStatus, string>;
  /** 'stroke' also recolors the node border; 'dot' only shows the status dot. */
  statusIndicator: 'stroke' | 'dot';
  statusDot: { radius: number; isVisible: boolean };
}

export type FlowThemeName = 'light' | 'dark' | 'macarons' | 'tech-blue' | 'whiteboard' | 'classic';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends unknown[] | null ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(base: T, overrides: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return (overrides === undefined ? base : overrides) as T;
  }
  const result: Record<string, unknown> = { ...base };
  Object.entries(overrides).forEach(([key, value]) => {
    if (value !== undefined) {
      result[key] = mergeDeep((base as Record<string, unknown>)[key], value);
    }
  });
  return result as T;
}

/** Builds a theme from a base theme plus nested overrides; arrays replace instead of merging. */
export function createFlowTheme(base: FlowTheme, overrides: DeepPartial<FlowTheme> = {}): FlowTheme {
  return mergeDeep(base, overrides);
}
