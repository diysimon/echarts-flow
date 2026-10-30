# echarts-flow

English | [简体中文](./README.zh-CN.md)

Flowchart and swimlane extension for [Apache ECharts 6](https://echarts.apache.org/), built on registerable custom series (`registerCustomSeries`). Use it as a read-only chart or as a full editor.

- 11 node shapes: start, end, process, decision, input/output, circle, hexagon, document, database, subprocess, plain text
- Swimlanes: horizontal (rows) or vertical (columns), title bar, per-lane colors, drag a node into another lane
- Auto layout (dagre), with an optional compact lane mode
- Obstacle-avoiding orthogonal routing: edges go around nodes, parallel edges stay apart, ports are spread; straight and curved edges are also available
- 6 built-in themes, deep overrides with `createFlowTheme`, and per-node, per-edge and per-lane styles
- Editor: drag, connect, double-click to rename, multi-select, delete, undo/redo, pan and zoom; every capability is configurable
- Run status: pending / running / done / error, with a flowing dash on edges into running nodes
- Works with the Canvas and SVG renderers; text is drawn on whole pixels and stays sharp when zoomed

## Install

```bash
npm install echarts echarts-flow
```

`echarts` is a peer dependency and must be 6.0 or later.

## Quick start

### Read-only chart

```ts
import { init, use } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { buildFlowOption, calcFitViewport, flowExtension, type FlowGraph } from 'echarts-flow';

use([CustomChart, CanvasRenderer, flowExtension]);

const graph: FlowGraph = {
  nodes: [
    { id: 'start', label: 'Submit request', shape: 'start' },
    { id: 'check', label: 'Amount > 5000?', shape: 'decision' },
    { id: 'approve', label: 'Manager approval', shape: 'process' },
    { id: 'end', label: 'Done', shape: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'check' },
    { id: 'e2', source: 'check', target: 'approve', label: 'Yes' },
    { id: 'e3', source: 'check', target: 'end', label: 'No' },
    { id: 'e4', source: 'approve', target: 'end' },
  ],
};

const chart = init(document.getElementById('chart')!);
const viewport = calcFitViewport(graph, chart.getWidth(), chart.getHeight());
chart.setOption(buildFlowOption(graph, { viewport, theme: 'light' }));
```

Nodes without coordinates are laid out automatically.

### Editor

```ts
import { FlowEditor } from 'echarts-flow';

const editor = new FlowEditor(chart, {
  graph,
  direction: 'TB',
  theme: 'light',
  onChange: (graph) => save(graph),
});

editor.addNode({ shape: 'process', label: 'New step' });
editor.connect('start', 'approve', 'Yes');
editor.autoLayout();
editor.undo();
```

## Data model

```ts
interface FlowGraph {
  nodes: FlowNode[];   // { id, label, shape, x?, y?, width?, height?, status?, laneId?, style?, isLocked? }
  edges: FlowEdge[];   // { id, source, target, label?, style?, isLocked? }
  lanes?: FlowLane[];  // { id, label, size?, style?, nodeStyle? }
  title?: string;
}
```

Coordinates are node centers. A `\n` in `label` is kept as a line break; long labels wrap and make the node taller.

## Swimlanes

```ts
const graph: FlowGraph = {
  title: 'Order flow',
  lanes: [
    { id: 'customer', label: 'Customer', nodeStyle: { fill: '#ffc9cf', stroke: '#ef4b5d' } },
    { id: 'sales', label: 'Sales' },
  ],
  nodes: [
    { id: 'order', label: 'Place order', shape: 'start', laneId: 'customer' },
    { id: 'confirm', label: 'Confirm order', shape: 'process', laneId: 'sales' },
  ],
  edges: [{ id: 'e1', source: 'order', target: 'confirm' }],
};

new FlowEditor(chart, { graph, direction: 'LR', theme: 'whiteboard', layout: { isLaneCompact: false } });
```

- `direction: 'TB'` makes lanes vertical columns with headers on top; `'LR'` makes them horizontal rows with headers on the left.
- `layout.isLaneCompact` starts every lane at the top, like hand-drawn column flowcharts.
- Editor API: `addLane`, `updateLane` (a size change shifts nodes in later lanes), `removeLane`, `setTitle`.

## Themes and styles

Built-in themes: `light`, `dark`, `macarons`, `tech-blue`, `whiteboard`, `classic`.

```ts
import { createFlowTheme, lightTheme } from 'echarts-flow';

const myTheme = createFlowTheme(lightTheme, {
  edge: { routing: 'curved', targetArrow: 'triangle-open', stroke: '#7b61ff', lineWidth: 2 },
  node: { radius: 12 },
  grid: { type: 'dot' },
});
editor.setTheme(myTheme);
```

Style precedence: theme < lane `nodeStyle` < the node's or edge's own `style`.

- Node `style`: `fill`, `stroke`, `lineWidth`, `lineDash`, `textColor`, `fontSize`, `fontWeight`, `radius`, `shadow*`, `opacity`
- Edge `style`: `stroke`, `lineWidth`, `lineDash`, `routing` (`orthogonal` / `straight` / `curved`), `cornerRadius`,
  `sourceArrow` / `targetArrow` (`triangle`, `triangle-open`, `vee`, `circle`, `circle-open`, `diamond`, `diamond-open`, `none`),
  `arrowSize`, `label*`, `opacity`

## Edit options

```ts
const editor = new FlowEditor(chart, {
  graph,
  edit: {
    canDelete: false,
    maxZoom: 2,
    validateConnection: (sourceId, targetId) => targetId !== 'start',
    beforeDelete: (selection) => confirm(`Delete ${selection.nodeIds.length} nodes?`),
  },
});

editor.setEditOptions({ isEnabled: false }); // change at runtime; only the given options change
editor.getEditOptions();
```

| Option | Description |
| --- | --- |
| `isEnabled` | Master switch; when off the canvas is read-only (selecting, panning and zooming still work) |
| `canSelect` / `canMultiSelect` | Select, multi-select |
| `canMoveNodes` / `canConnect` / `canEditLabels` / `canDelete` / `canUndo` / `canChangeLane` | Individual editing actions |
| `canPan` / `canZoom` / `hasKeyboardShortcuts` | Panning, wheel zoom, keyboard shortcuts |
| `shouldSnapToGrid` / `gridSize` | Grid snapping |
| `minZoom` / `maxZoom` / `wheelZoomSpeed` | Zoom range and speed |
| `validateConnection` / `beforeDelete` | Data rules that apply to both user actions and API calls; pass `null` to remove |

The switches only limit mouse and keyboard interaction; API calls such as `addNode()` and `connect()` always work. Nodes and edges with `isLocked: true` cannot be moved, renamed or deleted.

## Edge routing

```ts
new FlowEditor(chart, { graph, routing: { isSmart: true, shouldSpreadPorts: true, maxSmartNodes: 150 } });
```

Orthogonal edges use obstacle-avoiding routing by default: they go around nodes, use channels along lane borders, keep parallel edges apart and spread several edges on one node side.
Above `maxSmartNodes` nodes, routing falls back to the simple router.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/ is the demo, /test/cases/index.html lists all test cases
npm test
npm run check    # typecheck + tests + build
```

`test/cases/` holds 14 pages covering read-only charts, shapes and status, layout direction, editing, run monitoring, JSON import/export, large graphs, multiple instances, themes, swimlanes, style options and edit options.

## License

[Apache-2.0](./LICENSE)
