import { getElement } from './shared/caseUtils';

const SAMPLE_TEXT = '开始 提交申请 审批 驳回 Approve 123';
const SAMPLE_WIDTH = 300;
const SAMPLE_HEIGHT = 28;
const FONT_FAMILY = "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
const FONTS = [`13px ${FONT_FAMILY}`, `600 14px ${FONT_FAMILY}`];

interface CanvasVariant {
  name: string;
  /** Options for getContext; `alpha: false` makes the canvas opaque. */
  contextOptions: CanvasRenderingContext2DSettings;
  isFilled: boolean;
}

const CANVAS_VARIANTS: CanvasVariant[] = [
  { name: 'C1 Canvas 默认（透明背景，同 ECharts）', contextOptions: {}, isFilled: false },
  { name: 'C2 Canvas 默认 + 白底', contextOptions: {}, isFilled: true },
  { name: 'C3 Canvas 不透明 alpha:false + 白底', contextOptions: { alpha: false }, isFilled: true },
];

const rows = getElement<HTMLElement>('#rows');

function addRow(name: string, sample: HTMLElement | SVGElement): void {
  const label = document.createElement('span');
  label.className = 'clarity__name';
  label.textContent = name;
  rows.append(label, sample);
}

function buildDomSample(font: string): HTMLElement {
  const sample = document.createElement('div');
  sample.className = 'clarity__sample';
  sample.style.font = font;
  sample.style.lineHeight = `${SAMPLE_HEIGHT}px`;
  sample.textContent = SAMPLE_TEXT;
  return sample;
}

function buildSvgSample(font: string): SVGElement {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(SAMPLE_WIDTH));
  svg.setAttribute('height', String(SAMPLE_HEIGHT));
  svg.style.background = '#fff';
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', String(SAMPLE_HEIGHT / 2));
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('style', `font: ${font}; fill: #1f2329`);
  text.textContent = SAMPLE_TEXT;
  svg.append(text);
  return svg;
}

function buildCanvasSample(font: string, variant: CanvasVariant): HTMLCanvasElement {
  const ratio = window.devicePixelRatio;
  const canvas = document.createElement('canvas');
  canvas.style.width = `${SAMPLE_WIDTH}px`;
  canvas.style.height = `${SAMPLE_HEIGHT}px`;
  canvas.width = Math.round(SAMPLE_WIDTH * ratio);
  canvas.height = Math.round(SAMPLE_HEIGHT * ratio);
  const context = canvas.getContext('2d', variant.contextOptions);
  if (!context) {
    return canvas;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (variant.isFilled) {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  }
  context.font = font;
  context.fillStyle = '#1f2329';
  context.textBaseline = 'middle';
  context.fillText(SAMPLE_TEXT, 0, SAMPLE_HEIGHT / 2);
  return canvas;
}

FONTS.forEach((font, index) => {
  const suffix = index === 0 ? '13px' : '14px 粗体';
  addRow(`D DOM 文字 ${suffix}`, buildDomSample(font));
  addRow(`S SVG 文字 ${suffix}`, buildSvgSample(font));
  CANVAS_VARIANTS.forEach((variant) => addRow(`${variant.name} ${suffix}`, buildCanvasSample(font, variant)));
});

const firstCanvas = rows.querySelector('canvas');
const rect = firstCanvas?.getBoundingClientRect();
getElement<HTMLElement>('#env').textContent = `devicePixelRatio = ${window.devicePixelRatio}；`
  + `Canvas 左上角在设备像素 (${rect ? (rect.left * window.devicePixelRatio).toFixed(2) : '-'}, ${rect ? ((rect.top + window.scrollY) * window.devicePixelRatio).toFixed(2) : '-'})；`
  + `${navigator.userAgent}`;
