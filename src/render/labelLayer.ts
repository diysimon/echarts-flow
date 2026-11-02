import type { BatchText } from './elementBatch';

const ELLIPSIS = '…';
/** zrender sizes a line by the width of a CJK glyph, which is the font size. */
const DEFAULT_LINE_HEIGHT_RATIO = 1;

interface LabelStyle {
  text?: string;
  fill?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: number;
  width?: number;
  overflow?: string;
  align?: CanvasTextAlign;
  opacity?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetY?: number;
}

interface LabelLayers {
  edge: HTMLCanvasElement;
  node: HTMLCanvasElement;
}

/** One pair of label canvases per chart, reused across renders. */
const layersByChart = new WeakMap<object, LabelLayers>();

export function getLabelLayers(owner: object): LabelLayers {
  let layers = layersByChart.get(owner);
  if (!layers) {
    layers = { edge: document.createElement('canvas'), node: document.createElement('canvas') };
    layersByChart.set(owner, layers);
  }
  return layers;
}

function truncateLine(context: CanvasRenderingContext2D, line: string, maxWidth: number): string {
  if (context.measureText(line).width <= maxWidth) {
    return line;
  }
  let end = line.length;
  while (end > 0 && context.measureText(line.slice(0, end) + ELLIPSIS).width > maxWidth) {
    end -= 1;
  }
  return end > 0 ? line.slice(0, end) + ELLIPSIS : '';
}

function drawBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, style: LabelStyle): void {
  if (!style.backgroundColor && !style.borderColor) {
    return;
  }
  context.save();
  if (style.shadowColor && style.shadowBlur) {
    context.shadowColor = style.shadowColor;
    context.shadowBlur = style.shadowBlur;
    context.shadowOffsetY = style.shadowOffsetY ?? 0;
  }
  context.beginPath();
  context.roundRect(x, y, width, height, style.borderRadius ?? 0);
  if (style.backgroundColor) {
    context.fillStyle = style.backgroundColor;
    context.fill();
  }
  context.restore();
  if (style.borderColor && style.borderWidth) {
    context.lineWidth = style.borderWidth;
    context.strokeStyle = style.borderColor;
    context.stroke();
  }
}

/**
 * Draws one label the way zrender lays out centered text: lines stacked
 * around (x, y), each line vertically centered in its line height, with an
 * optional box behind them.
 */
function drawLabel(context: CanvasRenderingContext2D, label: BatchText): void {
  const style = label.style as LabelStyle;
  if (!style.text || !style.fontSize) {
    return;
  }
  context.font = `${style.fontWeight ?? 'normal'} ${style.fontSize}px ${style.fontFamily ?? 'sans-serif'}`;
  const lineHeight = style.lineHeight ?? style.fontSize * DEFAULT_LINE_HEIGHT_RATIO;
  const lines = style.text.split('\n').map((line) => (style.width && style.overflow === 'truncate' ? truncateLine(context, line, style.width) : line));
  const [paddingY, paddingX] = style.padding ?? [0, 0];
  const textWidth = Math.max(...lines.map((line) => context.measureText(line).width));
  const textHeight = lines.length * lineHeight;
  context.globalAlpha = style.opacity ?? 1;
  drawBox(context, label.x - textWidth / 2 - paddingX, label.y - textHeight / 2 - paddingY, textWidth + paddingX * 2, textHeight + paddingY * 2, style);
  context.fillStyle = style.fill ?? '#000';
  const top = label.y - textHeight / 2;
  lines.forEach((line, index) => context.fillText(line, label.x, top + lineHeight * (index + 0.5)));
}

/**
 * Paints labels onto a canvas covering the chart, at device resolution, so
 * thousands of labels cost one image element instead of one text element each.
 */
export function paintLabels(canvas: HTMLCanvasElement, labels: BatchText[], width: number, height: number, pixelRatio: number): void {
  const deviceWidth = Math.round(width * pixelRatio);
  const deviceHeight = Math.round(height * pixelRatio);
  if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
    canvas.width = deviceWidth;
    canvas.height = deviceHeight;
  }
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  labels.forEach((label) => drawLabel(context, label));
  context.globalAlpha = 1;
}
