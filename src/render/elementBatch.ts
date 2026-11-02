import { graphic } from 'echarts/core';
import { OffsetTracer, type PathTracer } from '../geometry/pathTracer';
import { traceElementShape } from './flowShapes';
import type { ElementOption } from './renderFlowNode';

/** Registered element type that draws many shapes with one style in one path. */
export const BATCH_SHAPE = 'flowBatch';

/** Style props a batch carries; everything else about an element is geometry. */
interface BatchStyle {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[];
  lineJoin?: string;
  lineCap?: string;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetY?: number;
}

interface BatchItem {
  type: string;
  shape: Record<string, unknown>;
  dx: number;
  dy: number;
}

interface BatchShape {
  items: BatchItem[];
}

/** Text element found while batching, in absolute coordinates. */
export interface BatchText {
  x: number;
  y: number;
  style: Record<string, unknown>;
}

interface Bucket {
  rank: number;
  order: number;
  style: BatchStyle;
  items: BatchItem[];
}

interface RawElement {
  type?: string;
  name?: string;
  x?: number;
  y?: number;
  shape?: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: RawElement[];
  clipPath?: { type?: string; shape?: Record<string, number> };
}

const sharedTracer = new OffsetTracer();

const BatchPath = graphic.extendShape({
  type: BATCH_SHAPE,
  shape: { items: [] as BatchItem[] },
  buildPath(ctx: PathTracer, shape: BatchShape) {
    shape.items.forEach((item) => traceElementShape(sharedTracer.reset(ctx, item.dx, item.dy), item.type, item.shape));
  },
});

let isRegistered = false;

export function registerBatchShape(): void {
  if (!isRegistered) {
    graphic.registerShape(BATCH_SHAPE, BatchPath);
    isRegistered = true;
  }
}

function isPaintless(style: Record<string, unknown>): boolean {
  const isEmpty = (color: unknown) => color == null || color === 'none' || color === 'transparent';
  return isEmpty(style.fill) && isEmpty(style.stroke);
}

function readStyle(style: Record<string, unknown>): BatchStyle {
  const { fill, stroke, lineWidth, lineDash, lineJoin, lineCap, opacity, shadowColor, shadowBlur, shadowOffsetY } = style as BatchStyle;
  return { fill, stroke, lineWidth, lineDash, lineJoin, lineCap, opacity, shadowColor, shadowBlur, shadowOffsetY };
}

function buildStyleKey(style: BatchStyle): string {
  return [
    style.fill, style.stroke, style.lineWidth, style.lineDash?.join(','), style.lineJoin, style.lineCap,
    style.opacity, style.shadowColor, style.shadowBlur, style.shadowOffsetY,
  ].join('|');
}

/**
 * A narrow rect clip, as used by accent bars, is applied by drawing the clip
 * rect itself; the rounded corners it would cut are below a pixel at the zoom
 * levels batching is used for.
 */
function resolveClippedRect(element: RawElement): Record<string, unknown> | null {
  const clip = element.clipPath;
  if (!clip) {
    return element.shape ?? null;
  }
  if (clip.type !== 'rect' || element.type !== 'rect' || !clip.shape) {
    return null;
  }
  return { ...clip.shape, r: 0 };
}

/**
 * Collects renderItem output and regroups it by style, so thousands of
 * elements become a few paths. Draw order follows `ranks` by element name,
 * then first appearance. Text is collected separately for a label layer.
 */
export class ElementBatcher {
  readonly texts: BatchText[] = [];
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly ranks: Record<string, number> = {}) {}

  add(element: ElementOption | null, dx = 0, dy = 0): void {
    if (!element) {
      return;
    }
    const raw = element as unknown as RawElement;
    const x = dx + (raw.x ?? 0);
    const y = dy + (raw.y ?? 0);
    if (raw.type === 'group') {
      raw.children?.forEach((child) => this.add(child as unknown as ElementOption, x, y));
      return;
    }
    if (raw.type === 'text') {
      this.texts.push({ x, y, style: raw.style ?? {} });
      return;
    }
    const style = raw.style ?? {};
    const shape = resolveClippedRect(raw);
    if (!raw.type || !shape || isPaintless(style)) {
      return;
    }
    const type = raw.clipPath ? 'rect' : raw.type;
    this.addItem(readStyle(style), raw.name ?? '', { type, shape, dx: x, dy: y });
  }

  private addItem(style: BatchStyle, name: string, item: BatchItem): void {
    const rank = this.ranks[name] ?? 0;
    const key = `${rank}#${buildStyleKey(style)}`;
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.items.push(item);
      return;
    }
    this.buckets.set(key, { rank, order: this.buckets.size, style, items: [item] });
  }

  /** One element per style, lowest rank first. */
  toElements(): ElementOption[] {
    return [...this.buckets.values()]
      .sort((a, b) => a.rank - b.rank || a.order - b.order)
      .map((bucket) => ({
        type: BATCH_SHAPE,
        silent: true,
        shape: { items: bucket.items },
        style: { ...bucket.style, fill: bucket.style.fill ?? 'none' },
      }) as unknown as ElementOption);
  }
}
