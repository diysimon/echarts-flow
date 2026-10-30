import { init, use, type EChartsType } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { flowExtension } from '../../../src/index';

use([CustomChart, CanvasRenderer, SVGRenderer, flowExtension]);

const MAX_LOG_LINES = 50;
const RENDERER_PARAM = 'renderer';

export type CaseRenderer = 'canvas' | 'svg';

const RENDERER_LABELS: Record<CaseRenderer, string> = { canvas: 'Canvas', svg: 'SVG' };

let isRendererSwitchMounted = false;

/** Renderer chosen with `?renderer=svg` in the page URL; Canvas by default. */
export function getCaseRenderer(): CaseRenderer {
  return new URLSearchParams(window.location.search).get(RENDERER_PARAM) === 'svg' ? 'svg' : 'canvas';
}

function buildRendererHref(renderer: CaseRenderer): string {
  const url = new URL(window.location.href);
  url.searchParams.set(RENDERER_PARAM, renderer);
  return url.toString();
}

/**
 * Adds a Canvas / SVG switch to the page nav. Each option is a link that
 * reloads the page, so every chart on it is created with the new renderer.
 */
function mountRendererSwitch(): void {
  const nav = document.querySelector('.case__nav');
  if (!nav || isRendererSwitchMounted) {
    return;
  }
  isRendererSwitchMounted = true;
  const current = getCaseRenderer();
  const group = document.createElement('span');
  group.className = 'case__renderer';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', '渲染器');
  group.append('渲染器');
  (Object.keys(RENDERER_LABELS) as CaseRenderer[]).forEach((renderer) => {
    const isActive = renderer === current;
    const option = document.createElement('a');
    option.className = isActive ? 'case__renderer-option case__renderer-option--active' : 'case__renderer-option';
    option.href = buildRendererHref(renderer);
    option.textContent = RENDERER_LABELS[renderer];
    if (isActive) {
      option.setAttribute('aria-current', 'true');
    }
    group.append(option);
  });
  nav.append(group);
}

/** Creates a chart with the renderer picked in the page's renderer switch. */
export function initCaseChart(element: HTMLElement): EChartsType {
  mountRendererSwitch();
  return init(element, null, { renderer: getCaseRenderer() });
}

export function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Case element not found: ${selector}`);
  }
  return element;
}

/** Prepends timestamped lines to a <pre> so the newest event is on top. */
export function createLogger(output: HTMLElement): (message: string) => void {
  const lines: string[] = [];
  return (message: string) => {
    const time = new Date().toLocaleTimeString();
    lines.unshift(`[${time}] ${message}`);
    lines.length = Math.min(lines.length, MAX_LOG_LINES);
    output.textContent = lines.join('\n');
  };
}

export function bindButton(selector: string, handler: () => void): void {
  getElement<HTMLButtonElement>(selector).addEventListener('click', handler);
}
