import * as echarts from 'echarts';
import { FlowEditor } from './FlowEditor';
import { flowExtension } from '../install';
import { lightTheme } from '../theme/lightThemes';
import type { FlowGraph } from '../types';

echarts.use(flowExtension);

// jsdom has no canvas; give zrender a fixed-width text measurer.
const FAKE_CHAR_WIDTH = 7;
echarts.setPlatformAPI({ measureText: (text: string) => ({ width: text.length * FAKE_CHAR_WIDTH }) });

const CHART_SIZE = { width: 800, height: 600 };

function createGraph(): FlowGraph {
  return {
    nodes: [
      { id: 'a', label: 'A', shape: 'start', x: 0, y: 0 },
      { id: 'b', label: 'B', shape: 'process', x: 0, y: 120 },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b' }],
  };
}

function createEditor(options: ConstructorParameters<typeof FlowEditor>[1] = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = echarts.init(container, null, { renderer: 'svg', ...CHART_SIZE });
  const editor = new FlowEditor(chart, { graph: createGraph(), ...options });
  return { editor, chart, container };
}

function pressKey(target: HTMLElement, key: string, patch: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...patch }));
}

describe('FlowEditor', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  function setup(options: ConstructorParameters<typeof FlowEditor>[1] = {}) {
    const result = createEditor(options);
    cleanup = () => {
      result.editor.dispose();
      result.chart.dispose();
      result.container.remove();
    };
    return result;
  }

  it('should fill missing positions when graph has unpositioned nodes', () => {
    // Arrange
    const graph: FlowGraph = { nodes: [{ id: 'x', label: 'X', shape: 'process' }], edges: [] };

    // Act
    const { editor } = setup({ graph });

    // Assert
    expect(Number.isFinite(editor.getGraph().nodes[0].x)).toBe(true);
  });

  it('should add and select a node with a default label', () => {
    // Arrange
    const { editor } = setup();

    // Act
    const id = editor.addNode({ shape: 'decision' });

    // Assert
    expect(editor.getSelection().nodeIds).toEqual([id]);
  });

  it('should not stack a new node on an existing node center', () => {
    // Arrange
    const { editor } = setup();

    // Act
    const id = editor.addNode({ shape: 'process', x: 0, y: 0 });

    // Assert
    const node = editor.getGraph().nodes.find((item) => item.id === id);
    expect([node?.x, node?.y]).not.toEqual([0, 0]);
  });

  it('should reject a duplicate connection', () => {
    // Arrange
    const { editor } = setup();

    // Act
    const edgeId = editor.connect('a', 'b');

    // Assert
    expect(edgeId).toBeNull();
  });

  it('should remove attached edges when deleting a selected node', () => {
    // Arrange
    const { editor } = setup();
    editor.setSelection({ nodeIds: ['a'], edgeIds: [] });

    // Act
    editor.deleteSelection();

    // Assert
    expect(editor.getGraph().edges).toEqual([]);
  });

  it('should restore the graph when undoing a delete', () => {
    // Arrange
    const { editor } = setup();
    const before = editor.getGraph();
    editor.setSelection({ nodeIds: ['a'], edgeIds: [] });
    editor.deleteSelection();

    // Act
    editor.undo();

    // Assert
    expect(editor.getGraph()).toBe(before);
  });

  it('should reapply the change when redoing', () => {
    // Arrange
    const { editor } = setup();
    editor.updateNode('a', { label: 'A2' });
    editor.undo();

    // Act
    editor.redo();

    // Assert
    expect(editor.getGraph().nodes[0].label).toBe('A2');
  });

  it('should notify onChange when graph changes', () => {
    // Arrange
    const onChange = vi.fn();
    const { editor } = setup({ onChange });

    // Act
    editor.updateEdge('e1', { label: '是' });

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should make auto layout undoable', () => {
    // Arrange
    const { editor } = setup();

    // Act
    editor.autoLayout();

    // Assert
    expect(editor.canUndo).toBe(true);
  });

  it('should delete selection when Delete is pressed', () => {
    // Arrange
    const { editor, container } = setup();
    editor.setSelection({ nodeIds: [], edgeIds: ['e1'] });

    // Act
    pressKey(container, 'Delete');

    // Assert
    expect(editor.getGraph().edges).toHaveLength(0);
  });

  it('should ignore Delete when editor is read only', () => {
    // Arrange
    const { editor, container } = setup({ isEditable: false });
    editor.setSelection({ nodeIds: [], edgeIds: ['e1'] });

    // Act
    pressKey(container, 'Delete');

    // Assert
    expect(editor.getGraph().edges).toHaveLength(1);
  });

  it('should undo when Ctrl+Z is pressed', () => {
    // Arrange
    const { editor, container } = setup();
    editor.updateNode('a', { label: 'changed' });

    // Act
    pressKey(container, 'z', { ctrlKey: true });

    // Assert
    expect(editor.getGraph().nodes[0].label).toBe('A');
  });

  it('should drop deleted ids from selection', () => {
    // Arrange
    const { editor } = setup();
    editor.setSelection({ nodeIds: ['a', 'b'], edgeIds: [] });

    // Act
    editor.deleteSelection();

    // Assert
    expect(editor.getSelection().nodeIds).toEqual([]);
  });

  it('should zoom in around the center', () => {
    // Arrange
    const { editor } = setup();
    const scaleBefore = editor.getViewport().scale;

    // Act
    editor.zoomIn();

    // Assert
    expect(editor.getViewport().scale).toBeGreaterThan(scaleBefore);
  });

  it('should size lanes of a lane graph on load', () => {
    // Arrange
    const graph: FlowGraph = { ...createGraph(), lanes: [{ id: 'l1', label: 'L1' }, { id: 'l2', label: 'L2' }] };

    // Act
    const { editor } = setup({ graph });

    // Assert
    expect(editor.getGraph().lanes?.every((lane) => lane.size != null)).toBe(true);
  });

  it('should append a lane with the theme minimum size', () => {
    // Arrange
    const { editor } = setup();

    // Act
    const laneId = editor.addLane({ label: '新泳道' });

    // Assert
    expect(editor.getGraph().lanes?.find((lane) => lane.id === laneId)?.size).toBe(lightTheme.lane.minSize);
  });

  it('should put a node added inside a lane into that lane', () => {
    // Arrange
    const graph: FlowGraph = { nodes: [], edges: [], lanes: [{ id: 'l1', label: 'L1', size: 200 }, { id: 'l2', label: 'L2', size: 200 }] };
    const { editor } = setup({ graph });

    // Act
    const id = editor.addNode({ shape: 'process', x: 300, y: 100 });

    // Assert
    expect(editor.getGraph().nodes.find((node) => node.id === id)?.laneId).toBe('l2');
  });

  it('should make a lane removal undoable', () => {
    // Arrange
    const graph: FlowGraph = { ...createGraph(), lanes: [{ id: 'l1', label: 'L1', size: 200 }, { id: 'l2', label: 'L2', size: 200 }] };
    const { editor } = setup({ graph });
    editor.removeLane('l2');

    // Act
    editor.undo();

    // Assert
    expect(editor.getGraph().lanes).toHaveLength(2);
  });

  it('should drop the title when it is cleared', () => {
    // Arrange
    const { editor } = setup({ graph: { ...createGraph(), title: '标题' } });

    // Act
    editor.setTitle(undefined);

    // Assert
    expect(editor.getGraph().title).toBeUndefined();
  });

  describe('edit options', () => {
    it('should map the isEditable shorthand onto edit.isEnabled', () => {
      // Act
      const { editor } = setup({ isEditable: false });

      // Assert
      expect(editor.getEditOptions().isEnabled).toBe(false);
    });

    it('should let edit options override the shorthands', () => {
      // Act
      const { editor } = setup({ isEditable: false, edit: { isEnabled: true } });

      // Assert
      expect(editor.getEditOptions().isEnabled).toBe(true);
    });

    it('should ignore Delete after deleting is turned off at runtime', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setEditOptions({ canDelete: false });
      editor.setSelection({ nodeIds: [], edgeIds: ['e1'] });

      // Act
      pressKey(container, 'Delete');

      // Assert
      expect(editor.getGraph().edges).toHaveLength(1);
    });

    it('should ignore Ctrl+Z when undo shortcuts are off', () => {
      // Arrange
      const { editor, container } = setup({ edit: { canUndo: false } });
      editor.updateNode('a', { label: 'changed' });

      // Act
      pressKey(container, 'z', { ctrlKey: true });

      // Assert
      expect(editor.getGraph().nodes[0].label).toBe('changed');
    });

    it('should ignore all shortcuts when keyboard shortcuts are off', () => {
      // Arrange
      const { editor, container } = setup({ edit: { hasKeyboardShortcuts: false } });
      editor.setSelection({ nodeIds: [], edgeIds: ['e1'] });

      // Act
      pressKey(container, 'Delete');

      // Assert
      expect(editor.getGraph().edges).toHaveLength(1);
    });

    it('should reject a connection refused by validateConnection', () => {
      // Arrange
      const { editor } = setup({ edit: { validateConnection: (sourceId) => sourceId !== 'b' } });

      // Act
      const edgeId = editor.connect('b', 'a');

      // Assert
      expect(edgeId).toBeNull();
    });

    it('should keep the graph when beforeDelete cancels', () => {
      // Arrange
      const { editor } = setup({ edit: { beforeDelete: () => false } });
      editor.setSelection({ nodeIds: ['a'], edgeIds: [] });

      // Act
      editor.deleteSelection();

      // Assert
      expect(editor.getGraph().nodes).toHaveLength(2);
    });

    it('should pass only deletable ids to beforeDelete', () => {
      // Arrange
      const graph = createGraph();
      graph.edges[0] = { ...graph.edges[0], isLocked: true };
      const beforeDelete = vi.fn(() => true);
      const { editor } = setup({ graph, edit: { beforeDelete } });
      editor.setSelection({ nodeIds: ['b'], edgeIds: ['e1'] });

      // Act
      editor.deleteSelection();

      // Assert
      expect(beforeDelete).toHaveBeenCalledWith({ nodeIds: ['b'], edgeIds: [] }, expect.anything());
    });

    it('should skip locked nodes when deleting', () => {
      // Arrange
      const graph = createGraph();
      graph.nodes[0] = { ...graph.nodes[0], isLocked: true };
      const { editor } = setup({ graph });
      editor.setSelection({ nodeIds: ['a', 'b'], edgeIds: [] });

      // Act
      editor.deleteSelection();

      // Assert
      expect(editor.getGraph().nodes.map((node) => node.id)).toEqual(['a']);
    });

    it('should keep the zoom within maxZoom', () => {
      // Arrange
      const { editor } = setup({ edit: { maxZoom: 1.5 } });

      // Act
      editor.setZoom(10);

      // Assert
      expect(editor.getViewport().scale).toBe(1.5);
    });

    it('should clamp the current zoom when limits tighten at runtime', () => {
      // Arrange
      const { editor } = setup();
      editor.setZoom(2);

      // Act
      editor.setEditOptions({ maxZoom: 1.2 });

      // Assert
      expect(editor.getViewport().scale).toBe(1.2);
    });

    it('should leave the view alone on wheel when zooming is off', () => {
      // Arrange
      const { editor, container } = setup({ edit: { canZoom: false } });
      const before = editor.getViewport();

      // Act
      container.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true }));

      // Assert
      expect(editor.getViewport()).toBe(before);
    });

    it('should clear the selection when selecting is turned off', () => {
      // Arrange
      const { editor } = setup();
      editor.setSelection({ nodeIds: ['a'], edgeIds: [] });

      // Act
      editor.setEditOptions({ canSelect: false });

      // Assert
      expect(editor.getSelection().nodeIds).toEqual([]);
    });

    it('should snap added nodes to a custom grid size', () => {
      // Arrange
      const { editor } = setup({ edit: { gridSize: 50 } });

      // Act
      const id = editor.addNode({ shape: 'process', x: 130, y: 260 });

      // Assert
      const node = editor.getGraph().nodes.find((item) => item.id === id);
      expect([node?.x, node?.y]).toEqual([150, 250]);
    });
  });

  describe('clipboard and selection shortcuts', () => {
    it('should select every node and edge when Cmd+A is pressed', () => {
      // Arrange
      const { editor, container } = setup();

      // Act
      pressKey(container, 'a', { metaKey: true });

      // Assert
      expect(editor.getSelection()).toEqual({ nodeIds: ['a', 'b'], edgeIds: ['e1'] });
    });

    it('should paste copies of the copied nodes and their edge', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setSelection({ nodeIds: ['a', 'b'], edgeIds: [] });
      pressKey(container, 'c', { metaKey: true });

      // Act
      pressKey(container, 'v', { metaKey: true });

      // Assert
      expect([editor.getGraph().nodes.length, editor.getGraph().edges.length]).toEqual([4, 2]);
    });

    it('should select the pasted copies when pasting', () => {
      // Arrange
      const { editor } = setup();
      editor.setSelection({ nodeIds: ['a'], edgeIds: [] });
      editor.copySelection();

      // Act
      editor.paste();

      // Assert
      expect(editor.getSelection().nodeIds).not.toContain('a');
    });

    it('should place each paste one step further from the original', () => {
      // Arrange
      const { editor } = setup();
      editor.setSelection({ nodeIds: ['a'], edgeIds: [] });
      editor.copySelection();
      editor.paste();

      // Act
      editor.paste();

      // Assert
      const secondCopy = editor.getGraph().nodes[editor.getGraph().nodes.length - 1];
      expect([secondCopy.x, secondCopy.y]).toEqual([40, 40]);
    });

    it('should remove the nodes when cutting', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setSelection({ nodeIds: ['a'], edgeIds: [] });

      // Act
      pressKey(container, 'x', { ctrlKey: true });

      // Assert
      expect(editor.getGraph().nodes.map((node) => node.id)).toEqual(['b']);
    });

    it('should not paste when editing is turned off', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setSelection({ nodeIds: ['a'], edgeIds: [] });
      editor.copySelection();
      editor.setEditOptions({ isEnabled: false });

      // Act
      pressKey(container, 'v', { metaKey: true });

      // Assert
      expect(editor.getGraph().nodes).toHaveLength(2);
    });

    it('should duplicate the selection with one step of offset when Cmd+D is pressed', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setSelection({ nodeIds: ['b'], edgeIds: [] });

      // Act
      pressKey(container, 'd', { metaKey: true });

      // Assert
      const copy = editor.getGraph().nodes[2];
      expect([copy.x, copy.y]).toEqual([20, 140]);
    });
  });

  describe('nudging and reconnecting', () => {
    it('should move the selection one grid step when an arrow key is pressed', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setSelection({ nodeIds: ['b'], edgeIds: [] });

      // Act
      pressKey(container, 'ArrowRight');

      // Assert
      expect(editor.getGraph().nodes[1].x).toBe(10);
    });

    it('should move ten steps when Shift and an arrow key are pressed', () => {
      // Arrange
      const { editor, container } = setup();
      editor.setSelection({ nodeIds: ['b'], edgeIds: [] });

      // Act
      pressKey(container, 'ArrowUp', { shiftKey: true });

      // Assert
      expect(editor.getGraph().nodes[1].y).toBe(20);
    });

    it('should not nudge when moving nodes is turned off', () => {
      // Arrange
      const { editor, container } = setup({ edit: { canMoveNodes: false } });
      editor.setSelection({ nodeIds: ['b'], edgeIds: [] });

      // Act
      pressKey(container, 'ArrowRight');

      // Assert
      expect(editor.getGraph().nodes[1].x).toBe(0);
    });

    it('should move the edge end when reconnecting to another node', () => {
      // Arrange
      const { editor } = setup();
      const id = editor.addNode({ shape: 'process', x: 200, y: 120 });

      // Act
      editor.reconnectEdge('e1', 'target', id);

      // Assert
      expect(editor.getGraph().edges[0].target).toBe(id);
    });

    it('should refuse to reconnect when validateConnection rejects it', () => {
      // Arrange
      const { editor } = setup({ edit: { validateConnection: () => false } });
      const id = editor.addNode({ shape: 'process', x: 200, y: 120 });

      // Act
      const isReconnected = editor.reconnectEdge('e1', 'target', id);

      // Assert
      expect(isReconnected).toBe(false);
    });

    it('should refuse to reconnect a locked edge', () => {
      // Arrange
      const { editor } = setup();
      editor.updateEdge('e1', { isLocked: true });
      const id = editor.addNode({ shape: 'process', x: 200, y: 120 });

      // Act
      const isReconnected = editor.reconnectEdge('e1', 'source', id);

      // Assert
      expect(isReconnected).toBe(false);
    });
  });
});
