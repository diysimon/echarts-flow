import { init } from 'echarts/core';
import { FlowEditor, type FlowGraph } from '../../src/index';
import { bindButton, getElement } from './shared/caseUtils';

const LANE_SIZE = 180;
const GROW_STEP = 40;
const ROW_CENTER = { customer: 90, sales: 270, stocks: 450 };
const COLUMN = [210, 480, 700, 920];

const ORDER_SWIMLANE: FlowGraph = {
  title: 'Swimlane Diagram',
  lanes: [
    { id: 'customer', label: 'Customer', size: LANE_SIZE, nodeStyle: { fill: '#ffc9cf', stroke: '#ef4b5d', fontWeight: 'bold' } },
    { id: 'sales', label: 'Sales', size: LANE_SIZE, nodeStyle: { fill: '#ffe7a8', stroke: '#e3a21a' } },
    { id: 'stocks', label: 'Stocks', size: LANE_SIZE, nodeStyle: { fill: '#e9ddff', stroke: '#8b5cf6' } },
  ],
  nodes: [
    { id: 'place', label: 'Place a product order', shape: 'process', laneId: 'customer', x: COLUMN[0], y: ROW_CENTER.customer },
    {
      id: 'done', label: 'Done', shape: 'process', laneId: 'customer', x: COLUMN[3], y: ROW_CENTER.customer,
      style: { fill: '#c8f0d0', stroke: '#3fb15a' },
    },
    { id: 'confirm', label: 'Confirm if order is needed', shape: 'process', laneId: 'sales', x: COLUMN[0], y: ROW_CENTER.sales },
    {
      id: 'no', label: 'No', shape: 'circle', laneId: 'sales', x: COLUMN[1], y: ROW_CENTER.sales,
      style: { fill: '#ffffff', stroke: '#1f1f1f' },
    },
    { id: 'reconfirm', label: 'Confirm if order is needed', shape: 'process', laneId: 'sales', x: COLUMN[2], y: ROW_CENTER.sales },
    { id: 'check', label: 'Check the inventory', shape: 'process', laneId: 'stocks', x: COLUMN[0], y: ROW_CENTER.stocks },
    { id: 'in-stock', label: 'Is the product in stock', shape: 'decision', laneId: 'stocks', x: COLUMN[1], y: ROW_CENTER.stocks },
    { id: 'deliver', label: 'Deliver the order', shape: 'process', laneId: 'stocks', x: COLUMN[2], y: ROW_CENTER.stocks },
    {
      id: 'placeholder', label: 'Add text', shape: 'process', laneId: 'stocks', x: COLUMN[3], y: ROW_CENTER.stocks,
      style: { textColor: '#a99bd6', fontWeight: 'normal' },
    },
  ],
  edges: [
    { id: 'e1', source: 'place', target: 'confirm' },
    { id: 'e2', source: 'confirm', target: 'check' },
    { id: 'e3', source: 'check', target: 'in-stock' },
    { id: 'e4', source: 'in-stock', target: 'no' },
    { id: 'e5', source: 'no', target: 'reconfirm' },
    { id: 'e6', source: 'reconfirm', target: 'done' },
    { id: 'e7', source: 'in-stock', target: 'deliver' },
    { id: 'e8', source: 'deliver', target: 'placeholder' },
  ],
};

const chart = init(getElement<HTMLElement>('#chart'));
const editor = new FlowEditor(chart, { graph: ORDER_SWIMLANE, direction: 'LR', theme: 'whiteboard' });

bindButton('#layout-button', () => editor.autoLayout());
bindButton('#undo-button', () => editor.undo());
bindButton('#add-lane-button', () => editor.addLane({ nodeStyle: { fill: '#d6f0ff', stroke: '#1a8fd6' } }));
bindButton('#grow-lane-button', () => {
  const sales = editor.getGraph().lanes?.find((lane) => lane.id === 'sales');
  if (sales) {
    editor.updateLane('sales', { size: (sales.size ?? LANE_SIZE) + GROW_STEP });
  }
});
bindButton('#remove-lane-button', () => {
  const lanes = editor.getGraph().lanes ?? [];
  if (lanes.length > 1) {
    editor.removeLane(lanes[lanes.length - 1].id);
  }
});
bindButton('#fit-button', () => editor.fitView());
window.addEventListener('resize', () => chart.resize());
