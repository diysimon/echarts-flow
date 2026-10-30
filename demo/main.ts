import { init, use } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { FlowEditor, flowExtension, type FlowGraph, type FlowNodeShape, type FlowStatus, type FlowThemeName } from '../src/index';
import { APPROVAL_GRAPH } from './sampleGraph';

use([CustomChart, CanvasRenderer, flowExtension]);

const SIMULATION_STEP_DELAY = 1200;

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Demo element not found: ${selector}`);
  }
  return element;
}

const chartContainer = getElement<HTMLElement>('#flow-chart');
const jsonOutput = getElement<HTMLElement>('#graph-json');
const undoButton = getElement<HTMLButtonElement>('#undo-button');
const redoButton = getElement<HTMLButtonElement>('#redo-button');
const editableToggle = getElement<HTMLInputElement>('#editable-toggle');

const chart = init(chartContainer);
const editor = new FlowEditor(chart, { graph: APPROVAL_GRAPH, onChange: updatePanel });

function updatePanel(graph: FlowGraph = editor.getGraph()): void {
  jsonOutput.textContent = JSON.stringify(graph, null, 2);
  undoButton.disabled = !editor.canUndo;
  redoButton.disabled = !editor.canRedo;
}

let simulationTimer: number | null = null;

/** Walks the nodes in order, marking each one running and then done. */
function toggleSimulation(): void {
  if (simulationTimer !== null) {
    window.clearInterval(simulationTimer);
    simulationTimer = null;
    setAllStatuses(undefined);
    return;
  }
  const nodeIds = editor.getGraph().nodes.map((node) => node.id);
  setAllStatuses('pending');
  let step = 0;
  simulationTimer = window.setInterval(() => {
    if (step > 0) {
      editor.setNodeStatus(nodeIds[step - 1], 'done');
    }
    if (step < nodeIds.length) {
      editor.setNodeStatus(nodeIds[step], 'running');
    }
    step = (step + 1) % (nodeIds.length + 1);
    if (step === 0) {
      setAllStatuses('pending');
    }
  }, SIMULATION_STEP_DELAY);
}

function setAllStatuses(status: FlowStatus | undefined): void {
  editor.getGraph().nodes.forEach((node) => editor.setNodeStatus(node.id, status));
}

const ACTIONS: Record<string, () => void> = {
  undo: () => editor.undo(),
  redo: () => editor.redo(),
  delete: () => editor.deleteSelection(),
  layout: () => editor.autoLayout(),
  fit: () => editor.fitView(),
  'zoom-in': () => editor.zoomIn(),
  'zoom-out': () => editor.zoomOut(),
  simulate: toggleSimulation,
};

function handleToolbarClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) {
    return;
  }
  const shape = button.dataset.shape as FlowNodeShape | undefined;
  if (shape) {
    editor.addNode({ shape });
  }
  const action = button.dataset.action;
  if (action) {
    ACTIONS[action]?.();
  }
  updatePanel();
}

getElement<HTMLElement>('.flow-demo__toolbar').addEventListener('click', handleToolbarClick);
editableToggle.addEventListener('change', () => editor.setEditable(editableToggle.checked));
const themeSelect = getElement<HTMLSelectElement>('#theme-select');
themeSelect.addEventListener('change', () => editor.setTheme(themeSelect.value as FlowThemeName));
window.addEventListener('resize', () => chart.resize());
updatePanel();
