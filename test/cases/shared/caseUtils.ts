import { use } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { flowExtension } from '../../../src/index';

use([CustomChart, CanvasRenderer, SVGRenderer, flowExtension]);

const MAX_LOG_LINES = 50;

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
