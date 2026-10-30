import type { FlowGraph } from '../types';

const DEFAULT_HISTORY_LIMIT = 100;

/**
 * Undo/redo stacks of graph snapshots. Graphs are treated as immutable,
 * so storing references is enough.
 */
export class FlowHistory {
  private undoStack: FlowGraph[] = [];
  private redoStack: FlowGraph[] = [];

  constructor(private readonly limit: number = DEFAULT_HISTORY_LIMIT) {}

  /** Records the state before a change. Any redo branch is discarded. */
  record(previous: FlowGraph): void {
    this.undoStack.push(previous);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(current: FlowGraph): FlowGraph | null {
    const previous = this.undoStack.pop();
    if (!previous) {
      return null;
    }
    this.redoStack.push(current);
    return previous;
  }

  redo(current: FlowGraph): FlowGraph | null {
    const next = this.redoStack.pop();
    if (!next) {
      return null;
    }
    this.undoStack.push(current);
    return next;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
