import type { FlowGraph } from '../src/index';

/** Expense approval flow without coordinates, so the editor lays it out on load. */
export const APPROVAL_GRAPH: FlowGraph = {
  nodes: [
    { id: 'submit', label: '提交报销申请', shape: 'start' },
    { id: 'fill', label: '填写报销单', shape: 'io' },
    { id: 'check-amount', label: '金额大于 5000?', shape: 'decision' },
    { id: 'manager', label: '部门经理审批', shape: 'process' },
    { id: 'director', label: '总监审批', shape: 'process' },
    { id: 'approved', label: '审批通过?', shape: 'decision' },
    { id: 'finance', label: '财务打款', shape: 'process' },
    { id: 'done', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'submit', target: 'fill' },
    { id: 'e2', source: 'fill', target: 'check-amount' },
    { id: 'e3', source: 'check-amount', target: 'director', label: '是' },
    { id: 'e4', source: 'check-amount', target: 'manager', label: '否' },
    { id: 'e5', source: 'manager', target: 'approved' },
    { id: 'e6', source: 'director', target: 'approved' },
    { id: 'e7', source: 'approved', target: 'finance', label: '是' },
    { id: 'e8', source: 'approved', target: 'fill', label: '驳回' },
    { id: 'e9', source: 'finance', target: 'done' },
  ],
};
