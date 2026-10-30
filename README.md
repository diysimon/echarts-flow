# echarts-flow

English | [简体中文](./README.zh-CN.md)

Flowchart and swimlane extension for [Apache ECharts 6](https://echarts.apache.org/), built on registerable custom series (`registerCustomSeries`). Use it as a read-only chart or as a full editor.

**Live demo:** <https://diysimon.github.io/echarts-flow/> · [all 16 example pages](https://diysimon.github.io/echarts-flow/test/cases/index.html)

![aurora theme, swimlane release flow](./docs/images/aurora.jpg)

| Whiteboard swimlanes | Classic column swimlanes |
| --- | --- |
| ![whiteboard swimlanes](./docs/images/swimlane-whiteboard.png) | ![classic swimlanes](./docs/images/swimlane-classic.png) |

- 11 node shapes: start, end, process, decision, input/output, circle, hexagon, document, database, subprocess, plain text
- Swimlanes: horizontal (rows) or vertical (columns), title bar, per-lane colors, drag a node into another lane
- Auto layout (dagre), with an optional compact lane mode
- Obstacle-avoiding orthogonal routing: edges go around nodes, parallel edges stay apart, ports are spread; straight and curved edges are also available
- 8 built-in themes, deep overrides with `createFlowTheme`, gradient colors, and per-node, per-edge and per-lane styles
- Editor: drag, connect, double-click to rename, box select, copy and paste, arrow-key nudging, alignment guides, reconnecting edge ends, delete, undo/redo, pan and zoom; every capability is configurable
- Export the whole graph as PNG or SVG; import and export Mermaid flowcharts and draw.io files
- Run status: pending / running / done / error, with a flowing dash on edges into running nodes
- Works with the Canvas and SVG renderers; text is drawn on whole pixels and stays sharp when zoomed
- Large graphs stay smooth: panning and zooming move the drawn picture instead of rebuilding it, off-screen elements are skipped

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

ECharts reads `devicePixelRatio` only at init, so after browser zoom or moving the window to another display the canvas gets stretched and text looks soft. `FlowEditor` handles this itself; for a read-only chart call `watchDevicePixelRatio(chart)` (it returns a function that stops watching).

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

Mouse and keyboard, with the container focused:

| Action | How |
| --- | --- |
| Select, multi-select | Click; Shift / Cmd / Ctrl click |
| Box select | Shift + drag on empty canvas (or plain drag with `blankDragAction: 'boxSelect'`) |
| Select all, copy, cut, paste, duplicate | Cmd/Ctrl + A, C, X, V, D |
| Nudge | Arrow keys move one grid step; Shift moves ten |
| Connect | Drag from a port that appears on hover |
| Reconnect | Select an edge, then drag the handle on either end onto another node |
| Rename | Double-click a node, edge, lane header or the title |
| Delete, undo, redo | Delete / Backspace, Cmd/Ctrl + Z, Cmd/Ctrl + Shift + Z |

While nodes are dragged, guides appear where their edges or centers line up with other nodes, and the drag snaps to them.
The same actions are available as API calls: `selectAll()`, `copySelection()`, `cutSelection()`, `paste()`, `duplicateSelection()`, `moveSelection(dx, dy)`, `reconnectEdge(edgeId, 'source' | 'target', nodeId)`.

## Export and interop

```ts
import { fromDrawio, fromMermaid, toMermaid } from 'echarts-flow';

const png = editor.exportPng({ pixelRatio: 2 });       // data URL of the whole graph, not just the visible part
const svg = editor.exportSvg({ backgroundColor: 'transparent' });
const mermaid = editor.exportMermaid();                // lanes become subgraphs
const drawio = editor.exportDrawio();                  // keeps positions, sizes, lanes, colors and arrows

const { graph, direction } = fromMermaid('flowchart LR\n  a([Start]) --> b{OK?} -->|yes| c[Ship]');
new FlowEditor(chart, { graph, direction });
```

- Without an editor, use `exportFlowPng(graph, options)` / `exportFlowSvg(graph, options)`. SVG export uses server-side rendering, so it also works in Node; it needs `SVGRenderer` registered.
- `fromMermaid` reads node shapes (including Mermaid 11 `@{ shape: doc }`), `-->`, `---`, `-.->`, `==>`, labels in `|...|` or `-- ... -->`, `&` groups, subgraphs as lanes and the frontmatter title. Style statements are skipped and nodes come without positions, so they are laid out automatically.
- `fromDrawio` reads uncompressed draw.io files (in draw.io: File > Properties > uncheck Compressed). Swimlanes become lanes; a pool's label becomes the title.

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

Built-in themes: `light`, `dark`, `macarons`, `tech-blue`, `whiteboard`, `classic`, plus the modern `aurora` and `aurora-dark` (a calm product-UI look: near-white or near-black canvas, cards with hairline borders and a soft shadow, a solid indigo start pill and an ink end pill, pale tints for decisions and data, ring selection, cards that lift on hover). See `test/cases/15-aurora.html`.

![all built-in themes](./docs/images/themes.jpg)

![aurora-dark theme, agent flow](./docs/images/aurora-dark.jpg)

Any `fill`, `stroke`, `accent`, lane fill or theme `background` accepts a gradient as well as a color string:

```ts
import { linearGradient } from 'echarts-flow';

const node = { id: 'a', label: 'Deploy', style: { fill: linearGradient(135, '#6366f1', '#a855f7'), textColor: '#fff' } };
// Radial: { type: 'radial', stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#eef2ff' }] }
```

Modern-look theme options: `backdrop.blobs` (screen-fixed radial glows), `node.accentWidth`, `node.selectionStyle` (`'stroke'` or `'ring'`), `node.hoverLift` (shadow multiplier on hover), `edge.labelShadowColor`.

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
| `canBoxSelect` / `blankDragAction` | Box select; whether dragging empty canvas pans (`'pan'`, default) or box-selects (`'boxSelect'`), Shift does the other |
| `canCopyPaste` / `canReconnect` | Clipboard shortcuts; dragging edge ends onto other nodes |
| `shouldShowAlignGuides` / `alignThreshold` | Alignment guides and their snap distance in screen pixels |
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

## Large graphs

- While panning and wheel zooming, the editor moves the picture it already drew and redraws sharply once the pointer or wheel stops. On 1000 nodes a pan frame takes about 7 ms instead of about 38 ms (Chromium, Canvas renderer).
- Wheel zoom eases toward its target instead of jumping once per notch, and trackpad pinches (ctrl + wheel) are sped up. Hover is ignored while the view moves, so nodes sliding under the pointer don't force full redraws.
- Above 250 nodes, pan and zoom frames move the finished canvas with a CSS transform, so those frames draw nothing. The editor redraws when less than 80% of the view is covered by the old picture; zooming out draws ahead so it redraws less often. The container gets `overflow: hidden` if it had none.
- When a full redraw takes longer than 12 ms, hover waits until the pointer rests for 90 ms, so sweeping the pointer across a big graph redraws once.
- On the Canvas renderer the background grid is one rectangle filled with a repeating tile, not a path with a shape per dot.
- Only nodes and edges within one view size of the visible area are drawn. Pass `viewSize: { width, height }` to `buildFlowOption` to get the same culling without the editor.
- Labels are always drawn. Set `minLabelPixels` (editor option or `buildFlowOption` config) to skip labels smaller than that many pixels on screen.

## Development

```bash
npm install
npm run dev               # http://localhost:5173/ is the demo, /test/cases/index.html lists all test cases
npm test                  # unit tests (Vitest)
npm run test:e2e          # every case page in Chromium: no errors, chart drawn, screenshot matches baseline
npm run test:e2e:update   # record screenshot baselines
npm run check             # typecheck + unit tests + build
npm run build:site        # static demo site in site/, deployed to GitHub Pages from main
```

Screenshot baselines carry the platform in their file name, because fonts render differently on each system. CI records missing Linux baselines and uploads them as the `playwright-snapshots` artifact; commit them to start comparing.

To release, update `version` in `package.json` and `CHANGELOG.md`, then push a tag such as `v0.1.0`. The Release workflow runs the checks, publishes to npm with provenance (needs the `NPM_TOKEN` repository secret) and creates a GitHub release.

`test/cases/` holds 16 pages covering read-only charts, shapes and status, layout direction, editing, run monitoring, JSON import/export, large graphs, multiple instances, themes, swimlanes, style options, edit options, the aurora showcase and export/interop. Every page has a Canvas / SVG switch.

## License

[Apache-2.0](./LICENSE)
