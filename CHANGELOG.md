# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-30

First release.

### Added

- Flowchart extension for ECharts 6 built on registerable custom series: grid,
  lane, edge, node and editor overlay series, installed with `echarts.use(flowExtension)`.
- 11 node shapes, 8 arrow types, orthogonal, straight and curved edges, edge labels
  and run status (pending, running, done, error) with a flowing dash on running edges.
- Swimlanes as rows or columns with a title bar, per-lane colors and node styles.
- Automatic layout with dagre, including a compact lane mode.
- Obstacle-avoiding orthogonal routing with port spreading and parallel edge separation.
- 8 built-in themes (`light`, `dark`, `macarons`, `tech-blue`, `whiteboard`,
  `classic`, `aurora`, `aurora-dark`), `createFlowTheme` for deep overrides and
  gradient colors through `linearGradient`.
- `FlowEditor`: drag, connect, rename, multi-select, box select, copy, cut, paste,
  duplicate, arrow-key nudging, alignment guides, reconnecting edge ends, delete,
  undo and redo, pan and zoom, lanes and title editing. Every capability can be
  switched through `edit` options and `setEditOptions()`.
- Data rules for both users and the API: `validateConnection`, `beforeDelete`, `isLocked`.
- Export of the whole graph as PNG (`exportFlowPng`) or SVG (`exportFlowSvg`).
- Mermaid flowchart import and export (`fromMermaid`, `toMermaid`) and draw.io
  import and export (`fromDrawio`, `toDrawio`).
- Sharp text: whole-pixel text and strokes, even line heights, and
  `watchDevicePixelRatio` for browser zoom and display changes.
- Large graph performance: transformed pan and zoom frames, view culling and
  skipping unreadably small labels.

[0.1.0]: https://github.com/diysimon/echarts-flow/releases/tag/v0.1.0
