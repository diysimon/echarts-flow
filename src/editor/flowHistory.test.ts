import { FlowHistory } from './flowHistory';
import type { FlowGraph } from '../types';

function createGraph(label: string): FlowGraph {
  return { nodes: [{ id: 'a', label, shape: 'process' }], edges: [] };
}

describe('FlowHistory', () => {
  it('should return the recorded state when undoing', () => {
    // Arrange
    const history = new FlowHistory();
    const before = createGraph('before');
    history.record(before);

    // Act
    const restored = history.undo(createGraph('after'));

    // Assert
    expect(restored).toBe(before);
  });

  it('should return the undone state when redoing', () => {
    // Arrange
    const history = new FlowHistory();
    const after = createGraph('after');
    history.record(createGraph('before'));
    const restored = history.undo(after);

    // Act
    const redone = history.redo(restored as FlowGraph);

    // Assert
    expect(redone).toBe(after);
  });

  it('should return null when nothing to undo', () => {
    // Arrange
    const history = new FlowHistory();

    // Act
    const restored = history.undo(createGraph('now'));

    // Assert
    expect(restored).toBeNull();
  });

  it('should clear redo stack when a new change is recorded', () => {
    // Arrange
    const history = new FlowHistory();
    history.record(createGraph('v1'));
    history.undo(createGraph('v2'));

    // Act
    history.record(createGraph('v1b'));

    // Assert
    expect(history.canRedo).toBe(false);
  });

  it('should drop the oldest state when limit is exceeded', () => {
    // Arrange
    const history = new FlowHistory(1);
    history.record(createGraph('v1'));
    history.record(createGraph('v2'));

    // Act
    history.undo(createGraph('v3'));

    // Assert
    expect(history.canUndo).toBe(false);
  });
});
