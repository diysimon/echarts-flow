# echarts-flow

[English](./README.md) | 简体中文

基于 [Apache ECharts 6](https://echarts.apache.org/) 可注册自定义系列（`registerCustomSeries`）的流程图与泳道图扩展，支持只读展示和完整编辑。

- 11 种节点形状：开始、结束、处理、判断、输入/输出、圆形、六边形、文档、数据库、子流程、纯文本
- 泳道：横向（行）或竖向（列）、标题、按泳道配色、拖动节点换泳道
- 自动布局（dagre），可选紧凑泳道
- 避障正交路由：绕开节点、平行线错开、端口分散；也支持直线和曲线
- 8 套内置主题，可用 `createFlowTheme` 深度覆盖，支持渐变色；节点、连线、泳道可单独设置样式
- 编辑器：拖动、连线、双击改文字、多选、删除、撤销重做、平移缩放；每项能力都可配置
- 运行状态展示：pending / running / done / error，运行中的连线有流动动画
- Canvas 与 SVG 渲染都可用，文字按整像素绘制，缩放后依然清晰

## 安装

```bash
npm install echarts echarts-flow
```

`echarts` 是 peer 依赖，需要 6.0 及以上。

## 快速开始

### 只读展示

```ts
import { init, use } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { buildFlowOption, calcFitViewport, flowExtension, type FlowGraph } from 'echarts-flow';

use([CustomChart, CanvasRenderer, flowExtension]);

const graph: FlowGraph = {
  nodes: [
    { id: 'start', label: '提交申请', shape: 'start' },
    { id: 'check', label: '金额大于 5000?', shape: 'decision' },
    { id: 'approve', label: '经理审批', shape: 'process' },
    { id: 'end', label: '结束', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'check' },
    { id: 'e2', source: 'check', target: 'approve', label: '是' },
    { id: 'e3', source: 'check', target: 'end', label: '否' },
    { id: 'e4', source: 'approve', target: 'end' },
  ],
};

const chart = init(document.getElementById('chart')!);
const viewport = calcFitViewport(graph, chart.getWidth(), chart.getHeight());
chart.setOption(buildFlowOption(graph, { viewport, theme: 'light' }));
```

节点没有坐标时会自动布局。

ECharts 只在 init 时读取一次 `devicePixelRatio`，浏览器缩放或把窗口拖到另一块屏幕后，画布会被拉伸，文字发虚。`FlowEditor` 会自动处理；只读图表请调用 `watchDevicePixelRatio(chart)`（返回一个停止监听的函数）。

### 编辑器

```ts
import { FlowEditor } from 'echarts-flow';

const editor = new FlowEditor(chart, {
  graph,
  direction: 'TB',
  theme: 'light',
  onChange: (graph) => save(graph),
});

editor.addNode({ shape: 'process', label: '新步骤' });
editor.connect('start', 'approve', '是');
editor.autoLayout();
editor.undo();
```

## 数据结构

```ts
interface FlowGraph {
  nodes: FlowNode[];   // { id, label, shape, x?, y?, width?, height?, status?, laneId?, style?, isLocked? }
  edges: FlowEdge[];   // { id, source, target, label?, style?, isLocked? }
  lanes?: FlowLane[];  // { id, label, size?, style?, nodeStyle? }
  title?: string;
}
```

坐标是节点中心点。`label` 中的 `\n` 会保留为换行，过长的文字自动换行并撑高节点。

## 泳道

```ts
const graph: FlowGraph = {
  title: '订单流程',
  lanes: [
    { id: 'customer', label: '客户', nodeStyle: { fill: '#ffc9cf', stroke: '#ef4b5d' } },
    { id: 'sales', label: '销售' },
  ],
  nodes: [
    { id: 'order', label: '下单', shape: 'start', laneId: 'customer' },
    { id: 'confirm', label: '确认订单', shape: 'process', laneId: 'sales' },
  ],
  edges: [{ id: 'e1', source: 'order', target: 'confirm' }],
};

new FlowEditor(chart, { graph, direction: 'LR', theme: 'whiteboard', layout: { isLaneCompact: false } });
```

- `direction: 'TB'`：泳道是竖排的列，表头在顶部；`'LR'`：泳道是横排的行，表头在左侧。
- `layout.isLaneCompact`：每条泳道从顶部开始排，适合手绘风格的分栏流程图。
- 编辑器 API：`addLane`、`updateLane`（改尺寸会平移后面泳道的节点）、`removeLane`、`setTitle`。

## 主题与样式

内置主题：`light`、`dark`、`macarons`、`tech-blue`、`whiteboard`、`classic`，以及现代风格的 `aurora` 和 `aurora-dark`（渐变背景加柔和光晕、白色或毛玻璃卡片配渐变强调条、环形选中框、悬停时卡片浮起）。效果见 `test/cases/15-aurora.html`。

所有 `fill`、`stroke`、`accent`、泳道填充和主题 `background` 除了颜色字符串，也可以传渐变：

```ts
import { linearGradient } from 'echarts-flow';

const node = { id: 'a', label: '部署', style: { fill: linearGradient(135, '#6366f1', '#a855f7'), textColor: '#fff' } };
// 径向渐变：{ type: 'radial', stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#eef2ff' }] }
```

现代风格相关的主题配置：`backdrop.blobs`（固定在屏幕上的径向光晕）、`node.accentWidth`、`node.selectionStyle`（`'stroke'` 或 `'ring'`）、`node.hoverLift`（悬停时阴影放大倍数）、`edge.labelShadowColor`。

```ts
import { createFlowTheme, lightTheme } from 'echarts-flow';

const myTheme = createFlowTheme(lightTheme, {
  edge: { routing: 'curved', targetArrow: 'triangle-open', stroke: '#7b61ff', lineWidth: 2 },
  node: { radius: 12 },
  grid: { type: 'dot' },
});
editor.setTheme(myTheme);
```

样式优先级：主题 < 泳道 `nodeStyle` < 节点/连线自己的 `style`。

- 节点 `style`：`fill`、`stroke`、`lineWidth`、`lineDash`、`textColor`、`fontSize`、`fontWeight`、`radius`、`shadow*`、`opacity`
- 连线 `style`：`stroke`、`lineWidth`、`lineDash`、`routing`（`orthogonal` / `straight` / `curved`）、`cornerRadius`、
  `sourceArrow` / `targetArrow`（`triangle`、`triangle-open`、`vee`、`circle`、`circle-open`、`diamond`、`diamond-open`、`none`）、
  `arrowSize`、`label*`、`opacity`

## 编辑配置

```ts
const editor = new FlowEditor(chart, {
  graph,
  edit: {
    canDelete: false,
    maxZoom: 2,
    validateConnection: (sourceId, targetId) => targetId !== 'start',
    beforeDelete: (selection) => confirm(`删除 ${selection.nodeIds.length} 个节点？`),
  },
});

editor.setEditOptions({ isEnabled: false }); // 运行时修改，只改传入的几项
editor.getEditOptions();
```

| 配置 | 说明 |
| --- | --- |
| `isEnabled` | 总开关，关闭后只读（仍可选择、平移、缩放） |
| `canSelect` / `canMultiSelect` | 选择、多选 |
| `canMoveNodes` / `canConnect` / `canEditLabels` / `canDelete` / `canUndo` / `canChangeLane` | 各项编辑能力 |
| `canPan` / `canZoom` / `hasKeyboardShortcuts` | 平移、滚轮缩放、键盘快捷键 |
| `shouldSnapToGrid` / `gridSize` | 网格吸附 |
| `minZoom` / `maxZoom` / `wheelZoomSpeed` | 缩放范围和速度 |
| `validateConnection` / `beforeDelete` | 数据规则，对用户操作和 API 都生效，传 `null` 移除 |

开关只限制鼠标和键盘操作，`addNode()`、`connect()` 等 API 调用不受影响。节点或连线设置 `isLocked: true` 后不能被拖动、改名或删除。

## 连线路由

```ts
new FlowEditor(chart, { graph, routing: { isSmart: true, shouldSpreadPorts: true, maxSmartNodes: 150 } });
```

正交连线默认使用避障路由：绕开节点、走泳道边缘的通道、平行线错开、同一条边上的多条线分开接入。
节点数超过 `maxSmartNodes` 时回退为简单路由。

## 本地开发

```bash
npm install
npm run dev      # 打开 http://localhost:5173/ 是 demo，/test/cases/index.html 是全部用例
npm test
npm run check    # 类型检查 + 测试 + 构建
```

`test/cases/` 下有 15 个用例页面，覆盖只读展示、形状与状态、布局方向、编辑、运行监控、JSON 导入导出、大图性能、多实例、主题、泳道、样式配置、编辑配置和 aurora 主题展示。

## License

[Apache-2.0](./LICENSE)
