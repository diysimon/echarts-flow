import { init } from 'echarts/core';
import { DEFAULT_EDIT_OPTIONS, FlowEditor, type FlowEditOptions, type FlowGraph, type FlowSelection } from '../../src/index';
import { bindButton, createLogger, getElement } from './shared/caseUtils';

type BooleanOption = {
  [K in keyof FlowEditOptions]-?: FlowEditOptions[K] extends boolean ? K : never;
}[keyof FlowEditOptions];
type NumberOption = 'gridSize' | 'minZoom' | 'maxZoom' | 'wheelZoomSpeed';

const FLAG_LABELS: Record<BooleanOption, string> = {
  isEnabled: '启用编辑（总开关）',
  canSelect: '选择',
  canMultiSelect: '多选',
  canMoveNodes: '拖动节点',
  canConnect: '拖线连接',
  canEditLabels: '双击改文字',
  canDelete: '键盘删除',
  canUndo: '撤销快捷键',
  canChangeLane: '拖入泳道换道',
  canPan: '拖动画布平移',
  canZoom: '滚轮缩放',
  hasKeyboardShortcuts: '键盘快捷键',
  shouldSnapToGrid: '吸附网格',
};
const NUMBER_STEPS: Record<NumberOption, number> = { gridSize: 5, minZoom: 0.1, maxZoom: 0.1, wheelZoomSpeed: 0.0005 };
const MAX_DECISION_OUTPUTS = 2;
const PERCENT = 100;

const PRESETS: Record<string, Partial<FlowEditOptions>> = {
  all: { ...DEFAULT_EDIT_OPTIONS },
  readonly: { ...DEFAULT_EDIT_OPTIONS, isEnabled: false },
  static: { ...DEFAULT_EDIT_OPTIONS, isEnabled: false, canSelect: false, canPan: false, canZoom: false },
  'connect-only': { ...DEFAULT_EDIT_OPTIONS, canMoveNodes: false, canEditLabels: false, canDelete: false },
  'move-only': { ...DEFAULT_EDIT_OPTIONS, canConnect: false, canEditLabels: false, canDelete: false },
};

const GRAPH: FlowGraph = {
  nodes: [
    { id: 'start', label: '开始', shape: 'start' },
    { id: 'apply', label: '提交申请', shape: 'process' },
    { id: 'approve', label: '审批', shape: 'decision' },
    { id: 'archive', label: '归档（已锁定）', shape: 'database', isLocked: true, style: { lineDash: [4, 3] } },
    { id: 'reject', label: '驳回', shape: 'process' },
    { id: 'end', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'apply' },
    { id: 'e2', source: 'apply', target: 'approve' },
    { id: 'e3', source: 'approve', target: 'archive', label: '通过' },
    { id: 'e4', source: 'approve', target: 'reject', label: '不通过' },
    { id: 'e5', source: 'archive', target: 'end', isLocked: true },
  ],
};

const log = createLogger(getElement<HTMLElement>('#log'));

/** No edges into the start node, and a decision has at most two outgoing edges. */
function validateConnection(sourceId: string, targetId: string, graph: FlowGraph): boolean {
  const target = graph.nodes.find((node) => node.id === targetId);
  const source = graph.nodes.find((node) => node.id === sourceId);
  const outputs = graph.edges.filter((edge) => edge.source === sourceId).length;
  const isAllowed = target?.shape !== 'start' && (source?.shape !== 'decision' || outputs < MAX_DECISION_OUTPUTS);
  if (!isAllowed) {
    log(`validateConnection 拒绝：${sourceId} → ${targetId}`);
  }
  return isAllowed;
}

function beforeDelete(selection: FlowSelection): boolean {
  return window.confirm(`删除 ${selection.nodeIds.length} 个节点、${selection.edgeIds.length} 条连线？`);
}

const chart = init(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart, {
  graph: GRAPH,
  edit: { validateConnection, beforeDelete },
  onChange: (graph) => log(`onChange：${graph.nodes.length} 个节点，${graph.edges.length} 条连线`),
  onSelectionChange: (selection) => log(`onSelectionChange：${JSON.stringify(selection)}`),
});

const flagInputs = new Map<BooleanOption, HTMLInputElement>();
const numberInputs = new Map<NumberOption, HTMLInputElement>();

function syncControls(): void {
  const options = editor.getEditOptions();
  flagInputs.forEach((input, key) => {
    input.checked = options[key];
  });
  numberInputs.forEach((input, key) => {
    input.value = String(options[key]);
  });
}

function buildControls(): void {
  const flagList = getElement<HTMLElement>('#flag-list');
  (Object.keys(FLAG_LABELS) as BooleanOption[]).forEach((key) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.addEventListener('change', () => {
      editor.setEditOptions({ [key]: input.checked });
      log(`setEditOptions({ ${key}: ${input.checked} })`);
    });
    label.append(input, ` ${FLAG_LABELS[key]}`);
    flagList.appendChild(label);
    flagInputs.set(key, input);
  });
  const numberList = getElement<HTMLElement>('#number-list');
  (Object.keys(NUMBER_STEPS) as NumberOption[]).forEach((key) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = String(NUMBER_STEPS[key]);
    input.addEventListener('change', () => {
      editor.setEditOptions({ [key]: Number(input.value) });
      log(`setEditOptions({ ${key}: ${input.value} })`);
      syncControls();
    });
    label.append(`${key} `, input);
    numberList.appendChild(label);
    numberInputs.set(key, input);
  });
}

function toggleLockOnSelection(): void {
  const { nodeIds } = editor.getSelection();
  nodeIds.forEach((nodeId) => {
    const node = editor.getGraph().nodes.find((item) => item.id === nodeId);
    const isLocked = !node?.isLocked;
    // The dashed border makes locked nodes recognizable in this demo.
    editor.updateNode(nodeId, { isLocked, style: { ...node?.style, lineDash: isLocked ? [4, 3] : null } });
    log(`updateNode('${nodeId}', { isLocked: ${isLocked} })`);
  });
}

buildControls();
syncControls();

document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    const preset = button.dataset.preset ?? 'all';
    editor.setEditOptions(PRESETS[preset]);
    log(`预设：${button.textContent}`);
    syncControls();
  });
});
bindButton('#lock-button', toggleLockOnSelection);
bindButton('#api-connect-button', () => log(`connect('approve', 'start') → ${editor.connect('approve', 'start')}`));
bindButton('#api-delete-button', () => editor.deleteSelection());
getElement<HTMLInputElement>('#rule-connection').addEventListener('change', (event) => {
  editor.setEditOptions({ validateConnection: (event.target as HTMLInputElement).checked ? validateConnection : null });
});
getElement<HTMLInputElement>('#rule-delete').addEventListener('change', (event) => {
  editor.setEditOptions({ beforeDelete: (event.target as HTMLInputElement).checked ? beforeDelete : null });
});
getElement<HTMLInputElement>('#zoom-range').addEventListener('input', (event) => {
  editor.setZoom(Number((event.target as HTMLInputElement).value) / PERCENT);
});
window.addEventListener('resize', () => chart.resize());
