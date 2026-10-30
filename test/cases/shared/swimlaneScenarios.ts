import type { FlowDirection, FlowEdge, FlowGraph, FlowNodeShape, FlowThemeName } from '../../../src/index';

type NodeSpec = [id: string, label: string, shape: FlowNodeShape, laneId: string];
type EdgeSpec = [source: string, target: string, label?: string];

export interface SwimlaneScenario {
  id: string;
  name: string;
  description: string;
  direction: FlowDirection;
  theme: FlowThemeName;
  isLaneCompact: boolean;
  graph: FlowGraph;
}

function buildGraph(title: string, lanes: [string, string][], nodes: NodeSpec[], edges: EdgeSpec[]): FlowGraph {
  return {
    title,
    lanes: lanes.map(([id, label]) => ({ id, label })),
    nodes: nodes.map(([id, label, shape, laneId]) => ({ id, label, shape, laneId })),
    edges: edges.map(([source, target, label], index): FlowEdge => ({ id: `e${index + 1}`, source, target, label })),
  };
}

const LEAVE = buildGraph(
  '请假审批流程',
  [['staff', '员工'], ['leader', '直属主管'], ['manager', '部门经理'], ['hr', 'HR']],
  [
    ['apply', '提交请假申请', 'start', 'staff'],
    ['fill', '填写请假单', 'io', 'staff'],
    ['leader-review', '主管审批', 'process', 'leader'],
    ['leader-ok', '同意?', 'decision', 'leader'],
    ['days', '超过 3 天?', 'decision', 'leader'],
    ['manager-review', '经理审批', 'process', 'manager'],
    ['manager-ok', '同意?', 'decision', 'manager'],
    ['record', '登记考勤', 'database', 'hr'],
    ['notify', '通知员工', 'process', 'hr'],
    ['done', '结束', 'end', 'staff'],
  ],
  [
    ['apply', 'fill'], ['fill', 'leader-review'], ['leader-review', 'leader-ok'],
    ['leader-ok', 'days', '是'], ['leader-ok', 'fill', '驳回'],
    ['days', 'manager-review', '是'], ['days', 'record', '否'],
    ['manager-review', 'manager-ok'], ['manager-ok', 'record', '是'], ['manager-ok', 'fill', '驳回'],
    ['record', 'notify'], ['notify', 'done'],
  ],
);

const ORDER = buildGraph(
  '电商订单履约',
  [['user', '用户'], ['mall', '商城'], ['warehouse', '仓储'], ['logistics', '物流']],
  [
    ['place', '下单', 'start', 'user'],
    ['pay', '支付', 'process', 'user'],
    ['paid', '支付成功?', 'decision', 'mall'],
    ['cancel', '取消订单', 'process', 'mall'],
    ['split', '拆分包裹', 'process', 'mall'],
    ['pick', '拣货', 'process', 'warehouse'],
    ['stock', '库存充足?', 'decision', 'warehouse'],
    ['restock', '调拨补货', 'subprocess', 'warehouse'],
    ['pack', '打包出库', 'process', 'warehouse'],
    ['ship', '揽收运输', 'process', 'logistics'],
    ['deliver', '派送签收', 'process', 'logistics'],
    ['confirm', '确认收货', 'end', 'user'],
  ],
  [
    ['place', 'pay'], ['pay', 'paid'], ['paid', 'split', '是'], ['paid', 'cancel', '否'],
    ['split', 'pick'], ['pick', 'stock'], ['stock', 'pack', '是'], ['stock', 'restock', '否'], ['restock', 'pick'],
    ['pack', 'ship'], ['ship', 'deliver'], ['deliver', 'confirm'],
  ],
);

const RELEASE = buildGraph(
  'CI/CD 发布流程',
  [['dev', '开发'], ['ci', 'CI'], ['qa', '测试'], ['ops', '运维']],
  [
    ['commit', '提交代码', 'start', 'dev'],
    ['review', '代码评审', 'process', 'dev'],
    ['build', '编译打包', 'process', 'ci'],
    ['unit', '单元测试', 'process', 'ci'],
    ['passed', '通过?', 'decision', 'ci'],
    ['fix', '修复问题', 'process', 'dev'],
    ['deploy-test', '部署测试环境', 'process', 'ops'],
    ['regression', '回归测试', 'process', 'qa'],
    ['qa-ok', '测试通过?', 'decision', 'qa'],
    ['release', '灰度发布', 'process', 'ops'],
    ['monitor', '监控指标', 'document', 'ops'],
    ['online', '全量上线', 'end', 'ops'],
  ],
  [
    ['commit', 'review'], ['review', 'build'], ['build', 'unit'], ['unit', 'passed'],
    ['passed', 'deploy-test', '是'], ['passed', 'fix', '否'], ['fix', 'review'],
    ['deploy-test', 'regression'], ['regression', 'qa-ok'], ['qa-ok', 'release', '是'], ['qa-ok', 'fix', '否'],
    ['release', 'monitor'], ['monitor', 'online'],
  ],
);

const TICKET = buildGraph(
  '客服工单处理',
  [['customer', '客户'], ['tier1', '一线客服'], ['tier2', '二线技术'], ['product', '产品']],
  [
    ['report', '提交工单', 'start', 'customer'],
    ['classify', '分类定级', 'process', 'tier1'],
    ['known', '已知问题?', 'decision', 'tier1'],
    ['answer', '给出解决方案', 'process', 'tier1'],
    ['analyze', '排查定位', 'process', 'tier2'],
    ['bug', '是缺陷?', 'decision', 'tier2'],
    ['workaround', '临时方案', 'process', 'tier2'],
    ['requirement', '记录需求', 'document', 'product'],
    ['schedule', '排期修复', 'process', 'product'],
    ['feedback', '确认解决', 'process', 'customer'],
    ['solved', '满意?', 'decision', 'customer'],
    ['close', '关闭工单', 'end', 'tier1'],
  ],
  [
    ['report', 'classify'], ['classify', 'known'], ['known', 'answer', '是'], ['known', 'analyze', '否'],
    ['analyze', 'bug'], ['bug', 'workaround', '否'], ['bug', 'requirement', '是'], ['requirement', 'schedule'],
    ['schedule', 'workaround'], ['workaround', 'feedback'], ['answer', 'feedback'],
    ['feedback', 'solved'], ['solved', 'close', '是'], ['solved', 'classify', '否'],
  ],
);

const HIRING = buildGraph(
  '招聘流程',
  [['dept', '用人部门'], ['hr', 'HR'], ['interviewer', '面试官'], ['candidate', '候选人']],
  [
    ['need', '提出用人需求', 'start', 'dept'],
    ['approve', '审批编制', 'decision', 'dept'],
    ['post', '发布职位', 'process', 'hr'],
    ['apply', '投递简历', 'process', 'candidate'],
    ['screen', '简历筛选', 'process', 'hr'],
    ['fit', '匹配?', 'decision', 'hr'],
    ['first', '初试', 'process', 'interviewer'],
    ['second', '复试', 'process', 'interviewer'],
    ['pass', '通过?', 'decision', 'interviewer'],
    ['offer', '发放 Offer', 'process', 'hr'],
    ['accept', '接受 Offer?', 'decision', 'candidate'],
    ['onboard', '入职', 'end', 'candidate'],
    ['pool', '进入人才库', 'database', 'hr'],
  ],
  [
    ['need', 'approve'], ['approve', 'post', '通过'], ['post', 'apply'], ['apply', 'screen'], ['screen', 'fit'],
    ['fit', 'first', '是'], ['fit', 'pool', '否'], ['first', 'second'], ['second', 'pass'],
    ['pass', 'offer', '是'], ['pass', 'pool', '否'], ['offer', 'accept'], ['accept', 'onboard', '是'], ['accept', 'pool', '否'],
  ],
);

const PURCHASE = buildGraph(
  '采购审批',
  [['applicant', '申请人'], ['dept', '部门负责人'], ['purchase', '采购部'], ['finance', '财务部'], ['ceo', '总经理']],
  [
    ['request', '提交采购申请', 'start', 'applicant'],
    ['dept-check', '部门审核', 'process', 'dept'],
    ['budget', '在预算内?', 'decision', 'finance'],
    ['amount', '金额 > 5 万?', 'decision', 'finance'],
    ['ceo-check', '总经理审批', 'process', 'ceo'],
    ['inquiry', '询价比价', 'process', 'purchase'],
    ['contract', '签订合同', 'document', 'purchase'],
    ['pay', '付款', 'process', 'finance'],
    ['receive', '验收入库', 'process', 'applicant'],
    ['finish', '完成', 'end', 'applicant'],
  ],
  [
    ['request', 'dept-check'], ['dept-check', 'budget'], ['budget', 'amount', '是'], ['budget', 'request', '否'],
    ['amount', 'ceo-check', '是'], ['amount', 'inquiry', '否'], ['ceo-check', 'inquiry'], ['inquiry', 'contract'],
    ['contract', 'pay'], ['pay', 'receive'], ['receive', 'finish'],
  ],
);

export const SWIMLANE_SCENARIOS: SwimlaneScenario[] = [
  { id: 'leave', name: '请假审批', description: '4 条竖向泳道，两级审批，驳回回边回到员工。', direction: 'TB', theme: 'light', isLaneCompact: false, graph: LEAVE },
  { id: 'order', name: '电商订单履约', description: '4 条横向泳道，支付分支和缺货补货循环。', direction: 'LR', theme: 'whiteboard', isLaneCompact: false, graph: ORDER },
  { id: 'release', name: 'CI/CD 发布', description: '横向泳道，两处失败都回到开发修复，跨多条泳道的回边。', direction: 'LR', theme: 'tech-blue', isLaneCompact: false, graph: RELEASE },
  { id: 'ticket', name: '客服工单', description: '竖向紧凑泳道，升级到二线和产品后再回到客户确认。', direction: 'TB', theme: 'classic', isLaneCompact: true, graph: TICKET },
  { id: 'hiring', name: '招聘流程', description: '竖向泳道，多个判断都汇入人才库（多条线进入同一节点）。', direction: 'TB', theme: 'macarons', isLaneCompact: false, graph: HIRING },
  { id: 'purchase', name: '采购审批', description: '5 条横向泳道，按金额分支，申请被拒时回到起点。', direction: 'LR', theme: 'dark', isLaneCompact: false, graph: PURCHASE },
];
