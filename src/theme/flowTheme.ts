import type { ArrowType, EdgeRouting, FlowColor, FlowNodeShape, FlowStatus, FontWeight, TextOverflow } from '../types';

export interface FlowShapeStyle {
  fill: FlowColor;
  stroke: FlowColor;
  text: string;
  /** Accent bar along the left edge of box shapes; omit for none. */
  accent?: FlowColor;
}

/** A soft glow fixed to the screen behind the canvas, positioned relative to the chart size. */
export interface FlowBackdropBlob {
  /** Center, 0 to 1 across the chart width and height. */
  x: number;
  y: number;
  /** Radius relative to the larger chart side. */
  radius: number;
  color: string;
}

export interface FlowTheme {
  /** Canvas background; 'transparent' lets the host page show through. */
  background: FlowColor;
  /** Glows painted between the background and the grid; they stay put while the canvas pans. */
  backdrop: { blobs: FlowBackdropBlob[] };
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
    /** Width of the accent bar on box shapes whose style has an accent. */
    accentWidth: number;
    /** 'stroke' recolors the border when selected; 'ring' draws a halo outside it instead. */
    selectionStyle: 'stroke' | 'ring';
    /** Shadow growth on hover, so cards appear to lift; 1 means no lift. */
    hoverLift: number;
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
    /** Soft shadow under edge labels; 'transparent' for none. */
    labelShadowColor: string;
    opacity: number;
  };
  lane: {
    fill: FlowColor;
    /** Every other lane uses this, for zebra striping. */
    alternateFill: FlowColor;
    headerFill: FlowColor;
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

export type FlowThemeName = 'light' | 'dark' | 'macarons' | 'tech-blue' | 'whiteboard' | 'classic' | 'aurora' | 'aurora-dark';

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
