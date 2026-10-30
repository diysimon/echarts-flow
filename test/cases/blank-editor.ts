import { init } from 'echarts/core';
import { FlowEditor, type FlowNodeShape } from '../../src/index';
import { bindButton, createLogger, getElement } from './shared/caseUtils';

const REQUIRED_SELECTION_COUNT = 2;

const log = createLogger(getElement<HTMLElement>('#log'));
const chart = init(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart, {
  onChange: (graph) => log(`onChange: ${graph.nodes.length} 个节点, ${graph.edges.length} 条连线`),
  onSelectionChange: (selection) => log(`onSelectionChange: ${JSON.stringify(selection)}`),
});

document.querySelectorAll<HTMLButtonElement>('[data-shape]').forEach((button) => {
  button.addEventListener('click', () => {
    const id = editor.addNode({ shape: button.dataset.shape as FlowNodeShape });
    log(`addNode → ${id}`);
  });
});

bindButton('#connect-button', () => {
  const { nodeIds } = editor.getSelection();
  if (nodeIds.length !== REQUIRED_SELECTION_COUNT) {
    log(`connect 需要恰好选中 2 个节点，当前 ${nodeIds.length} 个`);
    return;
  }
  const [sourceId, targetId] = nodeIds;
  const edgeId = editor.connect(sourceId, targetId);
  log(edgeId ? `connect ${sourceId} → ${targetId} = ${edgeId}` : `connect 被拒绝（重复或自连）`);
});
bindButton('#undo-button', () => editor.undo());
bindButton('#redo-button', () => editor.redo());
bindButton('#delete-button', () => editor.deleteSelection());
bindButton('#layout-button', () => editor.autoLayout());
bindButton('#clear-button', () => editor.setGraph({ nodes: [], edges: [] }, true));

window.addEventListener('resize', () => chart.resize());
