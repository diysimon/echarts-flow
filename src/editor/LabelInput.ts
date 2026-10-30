import type { Point } from '../types';

export interface LabelInputRequest {
  value: string;
  /** Center of the input in container pixels. */
  center: Point;
  width: number;
  onCommit(value: string): void;
}

const INPUT_CLASS = 'echarts-flow__label-input';
const INPUT_HEIGHT = 26;
const MIN_INPUT_WIDTH = 80;

/** A single floating <input> used for in-place label editing. */
export class LabelInput {
  private input: HTMLInputElement | null = null;

  constructor(private readonly container: HTMLElement) {}

  get isOpen(): boolean {
    return this.input !== null;
  }

  open(request: LabelInputRequest): void {
    this.close();
    const input = document.createElement('input');
    const width = Math.max(request.width, MIN_INPUT_WIDTH);
    input.className = INPUT_CLASS;
    input.type = 'text';
    input.value = request.value;
    Object.assign(input.style, {
      position: 'absolute',
      left: `${request.center.x - width / 2}px`,
      top: `${request.center.y - INPUT_HEIGHT / 2}px`,
      width: `${width}px`,
      height: `${INPUT_HEIGHT}px`,
      boxSizing: 'border-box',
      textAlign: 'center',
      zIndex: '10',
    });

    let isDone = false;
    const finish = (shouldCommit: boolean) => {
      if (isDone) {
        return;
      }
      isDone = true;
      const value = input.value.trim();
      this.close();
      if (shouldCommit) {
        request.onCommit(value);
      }
    };
    input.addEventListener('keydown', (event) => {
      // Keep Backspace and shortcuts from reaching the editor.
      event.stopPropagation();
      if (event.key === 'Enter') {
        finish(true);
      } else if (event.key === 'Escape') {
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));

    this.container.appendChild(input);
    this.input = input;
    input.focus();
    input.select();
  }

  close(): void {
    const input = this.input;
    this.input = null;
    input?.remove();
  }
}
