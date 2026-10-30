import type { ArrowType, FlowColor, FlowDirection, FlowEdge, FlowGraph, FlowLane, FlowNode, FlowNodeShape, FlowNodeStyle } from '../types';
import { buildFlowScene, type FlowOptionConfig } from '../option/buildFlowOption';
import type { LaneBox } from '../layout/laneLayout';
import { linearGradient } from '../render/flowColor';
import type { ImportedFlow } from './mermaid';

/** Vertex style per shape. `flowShape` is our own key; draw.io keeps unknown keys, so it survives a round trip. */
const SHAPE_STYLES: Record<FlowNodeShape, string> = {
  start: 'rounded=1;arcSize=50;',
  end: 'rounded=1;arcSize=50;',
  process: 'rounded=1;',
  decision: 'rhombus;',
  io: 'shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;',
  circle: 'ellipse;',
  hexagon: 'shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1;',
  document: 'shape=document;boundedLbl=1;',
  database: 'shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=12;',
  subprocess: 'shape=process;backgroundOutline=1;',
  text: 'text;strokeColor=none;fillColor=none;',
};

const ARROW_STYLES: Record<ArrowType, { name: string; isFilled: boolean }> = {
  triangle: { name: 'block', isFilled: true },
  'triangle-open': { name: 'block', isFilled: false },
  vee: { name: 'open', isFilled: false },
  circle: { name: 'oval', isFilled: true },
  'circle-open': { name: 'oval', isFilled: false },
  diamond: { name: 'diamond', isFilled: true },
  'diamond-open': { name: 'diamond', isFilled: false },
  none: { name: 'none', isFilled: false },
};

const LANE_ID_PREFIX = 'lane:';
/** draw.io gradient directions, in our angle order: 0° runs left to right, 90° top to bottom. */
const GRADIENT_DIRECTIONS = ['east', 'south', 'west', 'north'];
const RIGHT_ANGLE = 90;
/** draw.io draws a gradient top to bottom unless told otherwise. */
const DEFAULT_GRADIENT_DIRECTION = 'south';
/** Prefix for graph ids that would clash with draw.io's root cells or our title cell. */
const ESCAPED_ID_PREFIX = 'flow:';
const ROOT_ID = '0';
const LAYER_ID = '1';
const TITLE_ID = 'title';
const RESERVED_IDS = new Set([ROOT_ID, LAYER_ID, TITLE_ID]);

// ---------- export ----------

function toCellId(id: string): string {
  const isClashing = RESERVED_IDS.has(id) || id.startsWith(LANE_ID_PREFIX) || id.startsWith(ESCAPED_ID_PREFIX);
  return isClashing ? ESCAPED_ID_PREFIX + id : id;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Labels are HTML in draw.io (`html=1`), so escape for HTML first and turn newlines into breaks. */
function toHtmlLabel(text: string): string {
  return escapeXml(text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'));
}

/** draw.io fills take one color plus an optional gradient end color in one of four directions. */
function formatFill(color: FlowColor, key: 'fillColor' | 'strokeColor'): string {
  if (typeof color === 'string') {
    return color === 'transparent' ? `${key}=none;` : `${key}=${color};`;
  }
  const first = color.stops[0]?.color;
  const last = color.stops[color.stops.length - 1]?.color;
  if (!first) {
    return '';
  }
  if (key !== 'fillColor' || !last || color.type !== 'linear') {
    return `${key}=${first};`;
  }
  const direction = GRADIENT_DIRECTIONS[Math.round((((color.angle ?? 0) % 360) + 360) % 360 / RIGHT_ANGLE) % GRADIENT_DIRECTIONS.length];
  return `${key}=${first};gradientColor=${last};gradientDirection=${direction};`;
}

function formatNodeStyle(node: ReturnType<typeof buildFlowScene>['nodes'][number]): string {
  const { appearance } = node;
  return [
    SHAPE_STYLES[node.shape],
    'whiteSpace=wrap;html=1;',
    `flowShape=${node.shape};`,
    node.shape === 'text' ? '' : formatFill(appearance.fill, 'fillColor') + formatFill(appearance.stroke, 'strokeColor'),
    `fontColor=${appearance.textColor};fontSize=${appearance.fontSize};`,
    appearance.lineDash ? 'dashed=1;' : '',
  ].join('');
}

function formatArrow(arrow: ArrowType, end: 'start' | 'end'): string {
  const { name, isFilled } = ARROW_STYLES[arrow];
  return `${end}Arrow=${name};${end}Fill=${isFilled ? 1 : 0};`;
}

function formatEdgeStyle(edge: ReturnType<typeof buildFlowScene>['edges'][number]): string {
  const { appearance } = edge;
  const routing = appearance.routing === 'straight'
    ? 'rounded=0;'
    : appearance.routing === 'curved' ? 'edgeStyle=orthogonalEdgeStyle;curved=1;' : 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
  return [
    routing,
    'html=1;',
    formatArrow(appearance.sourceArrow, 'start'),
    formatArrow(appearance.targetArrow, 'end'),
    `strokeColor=${appearance.stroke};strokeWidth=${appearance.lineWidth};`,
    appearance.lineDash ? 'dashed=1;' : '',
  ].join('');
}

function formatGeometry(x: number, y: number, width: number, height: number): string {
  const round = (value: number) => Math.round(value * 100) / 100;
  return `<mxGeometry x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" as="geometry"/>`;
}

/** Row lanes (LR) put the header on the left with vertical text; column lanes put it on top. */
function formatLaneCell(lane: LaneBox): string {
  const startSize = lane.isColumn ? lane.header.height : lane.header.width;
  const style = `swimlane;html=1;horizontal=${lane.isColumn ? 1 : 0};startSize=${Math.round(startSize)};`;
  return `<mxCell id="${escapeXml(LANE_ID_PREFIX + lane.id)}" value="${toHtmlLabel(lane.label)}" style="${style}" vertex="1" parent="${LAYER_ID}">`
    + `${formatGeometry(lane.x, lane.y, lane.width, lane.height)}</mxCell>`;
}

/**
 * Writes an uncompressed draw.io (diagrams.net) file. Nodes keep their laid
 * out positions and sizes, lanes become swimlane containers, and colors,
 * dashes and arrows carry over.
 */
export function toDrawio(graph: FlowGraph, options: Pick<FlowOptionConfig, 'direction' | 'theme' | 'layout'> = {}): string {
  const scene = buildFlowScene(graph, { ...options, routing: { isSmart: false } });
  const lanes = new Map(scene.lanes.lanes.map((lane) => [lane.id, lane]));
  const firstLane = scene.lanes.lanes[0];
  const cells: string[] = [`<mxCell id="${ROOT_ID}"/>`, `<mxCell id="${LAYER_ID}" parent="${ROOT_ID}"/>`];
  const { title } = scene.lanes;
  if (title) {
    cells.push(`<mxCell id="${TITLE_ID}" value="${toHtmlLabel(title.text)}" style="text;html=1;fontStyle=1;align=left;" vertex="1" parent="${LAYER_ID}">`
      + `${formatGeometry(title.x, title.y, title.width, title.height)}</mxCell>`);
  }
  scene.lanes.lanes.forEach((lane) => cells.push(formatLaneCell(lane)));
  scene.nodes.forEach((node) => {
    const lane = (node.laneId ? lanes.get(node.laneId) : undefined) ?? firstLane;
    // Children of a container are positioned relative to it.
    const originX = lane?.x ?? 0;
    const originY = lane?.y ?? 0;
    const parent = lane ? LANE_ID_PREFIX + lane.id : LAYER_ID;
    cells.push(`<mxCell id="${escapeXml(toCellId(node.id))}" value="${toHtmlLabel(node.label)}" style="${formatNodeStyle(node)}" vertex="1" parent="${escapeXml(parent)}">`
      + `${formatGeometry(node.x - node.width / 2 - originX, node.y - node.height / 2 - originY, node.width, node.height)}</mxCell>`);
  });
  scene.edges.filter((edge) => !edge.isDraft).forEach((edge) => {
    cells.push(`<mxCell id="${escapeXml(toCellId(edge.id))}" value="${toHtmlLabel(edge.label ?? '')}" style="${formatEdgeStyle(edge)}" edge="1" parent="${LAYER_ID}" `
      + `source="${escapeXml(toCellId(edge.source))}" target="${escapeXml(toCellId(edge.target))}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  return [
    '<mxfile host="echarts-flow">',
    '  <diagram id="echarts-flow" name="Page-1">',
    '    <mxGraphModel grid="1" gridSize="10" guides="1" connect="1" arrows="1" page="0">',
    '      <root>',
    ...cells.map((cell) => `        ${cell}`),
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
    '',
  ].join('\n');
}

// ---------- import ----------

interface DrawioCell {
  id: string;
  value: string;
  style: Map<string, string>;
  isVertex: boolean;
  isEdge: boolean;
  parent: string | null;
  source: string | null;
  target: string | null;
  geometry: { x: number; y: number; width: number; height: number } | null;
}

/** draw.io shape names, including the flowchart stencil set, mapped to ours. */
const DRAWIO_SHAPES: Record<string, FlowNodeShape> = {
  'mxgraph.flowchart.terminator': 'start',
  'mxgraph.flowchart.decision': 'decision',
  'mxgraph.flowchart.data': 'io',
  'mxgraph.flowchart.document': 'document',
  'mxgraph.flowchart.database': 'database',
  'mxgraph.flowchart.predefined_process': 'subprocess',
  'mxgraph.flowchart.preparation': 'hexagon',
  'mxgraph.flowchart.on-page_reference': 'circle',
  'mxgraph.flowchart.process': 'process',
  parallelogram: 'io',
  hexagon: 'hexagon',
  document: 'document',
  cylinder: 'database',
  cylinder3: 'database',
  datastore: 'database',
  process: 'subprocess',
  ellipse: 'circle',
  rhombus: 'decision',
};
const STYLE_KEY_SHAPES: [string, FlowNodeShape][] = [['rhombus', 'decision'], ['ellipse', 'circle'], ['text', 'text']];
const FLOW_SHAPES = new Set<FlowNodeShape>(Object.keys(SHAPE_STYLES) as FlowNodeShape[]);
const DRAWIO_ARROWS: Record<string, [ArrowType, ArrowType]> = {
  // [filled, open]
  block: ['triangle', 'triangle-open'],
  classic: ['triangle', 'triangle-open'],
  blockThin: ['triangle', 'triangle-open'],
  open: ['vee', 'vee'],
  oval: ['circle', 'circle-open'],
  diamond: ['diamond', 'diamond-open'],
  diamondThin: ['diamond', 'diamond-open'],
};
const PILL_ARC_SIZE = 50;
const DRAWIO_DASH = [4, 3];
const HTML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function parseStyle(style: string): Map<string, string> {
  const entries = style.split(';').filter(Boolean).map((part): [string, string] => {
    const index = part.indexOf('=');
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  });
  return new Map(entries);
}

function fromCellId(id: string): string {
  if (id.startsWith(ESCAPED_ID_PREFIX)) {
    return id.slice(ESCAPED_ID_PREFIX.length);
  }
  return id.startsWith(LANE_ID_PREFIX) ? id.slice(LANE_ID_PREFIX.length) : id;
}

/** Labels may be HTML; keep line breaks and drop the markup. */
function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (name.startsWith('#')) {
        return String.fromCharCode(Number(name.slice(1)));
      }
      return HTML_ENTITIES[name.toLowerCase()] ?? entity;
    })
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function readGeometry(element: Element): DrawioCell['geometry'] {
  const geometry = Array.from(element.children).find((child) => child.tagName === 'mxGeometry');
  if (!geometry) {
    return null;
  }
  const read = (name: string) => Number(geometry.getAttribute(name) ?? 0) || 0;
  return { x: read('x'), y: read('y'), width: read('width'), height: read('height') };
}

/** `<UserObject>` and `<object>` wrap a cell and carry its id and label. */
function readCell(element: Element): DrawioCell {
  const wrapper = element.parentElement && /^(UserObject|object)$/.test(element.parentElement.tagName) ? element.parentElement : null;
  const read = (name: string) => element.getAttribute(name);
  return {
    id: wrapper?.getAttribute('id') ?? read('id') ?? '',
    value: stripHtml(wrapper?.getAttribute('label') ?? read('value') ?? ''),
    style: parseStyle(read('style') ?? ''),
    isVertex: read('vertex') === '1',
    isEdge: read('edge') === '1',
    parent: read('parent'),
    source: read('source'),
    target: read('target'),
    geometry: readGeometry(element),
  };
}

function readCells(xml: string): DrawioCell[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid draw.io file: the XML could not be parsed.');
  }
  const model = doc.getElementsByTagName('mxGraphModel')[0];
  if (!model) {
    const isCompressed = Boolean(doc.getElementsByTagName('diagram')[0]?.textContent?.trim());
    throw new Error(isCompressed
      ? 'Compressed draw.io diagrams are not supported. In draw.io, turn off File > Properties > Compressed and save again.'
      : 'Invalid draw.io file: no mxGraphModel found.');
  }
  return Array.from(model.getElementsByTagName('mxCell')).map(readCell);
}

function inferShape(style: Map<string, string>): FlowNodeShape {
  const flowShape = style.get('flowShape') as FlowNodeShape | undefined;
  if (flowShape && FLOW_SHAPES.has(flowShape)) {
    return flowShape;
  }
  const named = DRAWIO_SHAPES[style.get('shape') ?? ''];
  if (named) {
    return named;
  }
  const keyed = STYLE_KEY_SHAPES.find(([key]) => style.has(key));
  if (keyed) {
    return keyed[1];
  }
  const isPill = style.get('rounded') === '1' && Number(style.get('arcSize')) >= PILL_ARC_SIZE;
  return isPill ? 'start' : 'process';
}

function readColor(style: Map<string, string>, key: string): string | undefined {
  const color = style.get(key);
  return color && color !== 'none' && color !== 'default' ? color : undefined;
}

function readFill(style: Map<string, string>): FlowColor | undefined {
  const fill = readColor(style, 'fillColor');
  const gradientEnd = readColor(style, 'gradientColor');
  if (!fill || !gradientEnd) {
    return fill;
  }
  const directionIndex = GRADIENT_DIRECTIONS.indexOf(style.get('gradientDirection') ?? DEFAULT_GRADIENT_DIRECTION);
  return linearGradient(Math.max(directionIndex, 0) * RIGHT_ANGLE, fill, gradientEnd);
}

function readNodeStyle(style: Map<string, string>): FlowNodeStyle | undefined {
  const nodeStyle: FlowNodeStyle = {};
  const fill = readFill(style);
  const stroke = readColor(style, 'strokeColor');
  const textColor = readColor(style, 'fontColor');
  if (fill) {
    nodeStyle.fill = fill;
  }
  if (stroke) {
    nodeStyle.stroke = stroke;
  }
  if (textColor) {
    nodeStyle.textColor = textColor;
  }
  if (style.get('dashed') === '1') {
    nodeStyle.lineDash = DRAWIO_DASH;
  }
  return Object.keys(nodeStyle).length > 0 ? nodeStyle : undefined;
}

function readArrow(style: Map<string, string>, end: 'start' | 'end', fallback: ArrowType): ArrowType {
  const name = style.get(`${end}Arrow`);
  if (name === undefined) {
    return fallback;
  }
  const arrows = DRAWIO_ARROWS[name];
  if (!arrows) {
    return 'none';
  }
  return style.get(`${end}Fill`) === '0' ? arrows[1] : arrows[0];
}

function readEdge(cell: DrawioCell, label: string): FlowEdge {
  const { style } = cell;
  const edge: FlowEdge = { id: fromCellId(cell.id), source: fromCellId(cell.source ?? ''), target: fromCellId(cell.target ?? '') };
  if (label) {
    edge.label = label;
  }
  const targetArrow = readArrow(style, 'end', 'triangle');
  const sourceArrow = readArrow(style, 'start', 'none');
  const stroke = readColor(style, 'strokeColor');
  const edgeStyle: FlowEdge['style'] = {};
  if (targetArrow !== 'triangle') {
    edgeStyle.targetArrow = targetArrow;
  }
  if (sourceArrow !== 'none') {
    edgeStyle.sourceArrow = sourceArrow;
  }
  if (stroke) {
    edgeStyle.stroke = stroke;
  }
  if (style.get('dashed') === '1') {
    edgeStyle.lineDash = DRAWIO_DASH;
  }
  if (style.get('curved') === '1') {
    edgeStyle.routing = 'curved';
  }
  if (Object.keys(edgeStyle).length > 0) {
    edge.style = edgeStyle;
  }
  return edge;
}

/**
 * Reads an uncompressed draw.io (diagrams.net) file: vertices become nodes
 * with their positions and sizes, swimlanes become lanes (a pool's label
 * becomes the title), and edges keep labels, arrows and dashes. Needs
 * `DOMParser`, so it runs in browsers and jsdom.
 */
export function fromDrawio(xml: string): ImportedFlow {
  const cells = readCells(xml);
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const isSwimlane = (cell: DrawioCell) => cell.isVertex && (cell.style.has('swimlane') || cell.style.get('shape') === 'swimlane');
  const swimlanes = cells.filter(isSwimlane);
  const pools = new Set(swimlanes.filter((pool) => swimlanes.some((lane) => lane.parent === pool.id)).map((pool) => pool.id));
  const laneCells = swimlanes.filter((cell) => !pools.has(cell.id));

  const absolute = new Map<string, { x: number; y: number }>();
  const getOrigin = (cell: DrawioCell | undefined): { x: number; y: number } => {
    if (!cell || !cell.isVertex || !cell.geometry) {
      return { x: 0, y: 0 };
    }
    const cached = absolute.get(cell.id);
    if (cached) {
      return cached;
    }
    const parentOrigin = getOrigin(cell.parent ? byId.get(cell.parent) : undefined);
    const origin = { x: parentOrigin.x + cell.geometry.x, y: parentOrigin.y + cell.geometry.y };
    absolute.set(cell.id, origin);
    return origin;
  };
  const findLane = (cell: DrawioCell): DrawioCell | undefined => {
    let parent = cell.parent ? byId.get(cell.parent) : undefined;
    while (parent && !laneCells.includes(parent)) {
      parent = parent.parent ? byId.get(parent.parent) : undefined;
    }
    return parent;
  };

  const isRows = laneCells.length > 0 && laneCells[0].style.get('horizontal') === '0';
  const direction: FlowDirection = isRows ? 'LR' : 'TB';
  const lanes: FlowLane[] = laneCells
    .map((cell) => ({ cell, origin: getOrigin(cell) }))
    .sort((a, b) => (isRows ? a.origin.y - b.origin.y : a.origin.x - b.origin.x))
    .map(({ cell }) => ({ id: fromCellId(cell.id), label: cell.value, size: (isRows ? cell.geometry?.height : cell.geometry?.width) ?? undefined }));

  const edgeIds = new Set(cells.filter((cell) => cell.isEdge).map((cell) => cell.id));
  const titleCell = cells.find((cell) => cell.id === TITLE_ID && cell.isVertex);
  const isEdgeLabel = (cell: DrawioCell) => cell.style.has('edgeLabel') || (cell.parent !== null && edgeIds.has(cell.parent));
  const nodes: FlowNode[] = cells
    .filter((cell) => cell.isVertex && cell.geometry && !isSwimlane(cell) && !isEdgeLabel(cell) && cell !== titleCell)
    .map((cell) => {
      const geometry = cell.geometry as NonNullable<DrawioCell['geometry']>;
      const origin = getOrigin(cell);
      const lane = findLane(cell);
      const node: FlowNode = {
        id: fromCellId(cell.id),
        label: cell.value,
        shape: inferShape(cell.style),
        x: origin.x + geometry.width / 2,
        y: origin.y + geometry.height / 2,
        width: geometry.width,
        height: geometry.height,
      };
      const style = readNodeStyle(cell.style);
      if (lane) {
        node.laneId = fromCellId(lane.id);
      }
      if (style) {
        node.style = style;
      }
      return node;
    });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const labelsByEdge = new Map<string, string>();
  cells.filter(isEdgeLabel).forEach((cell) => {
    if (cell.parent && cell.value) {
      labelsByEdge.set(cell.parent, cell.value);
    }
  });
  const edges = cells
    .filter((cell) => cell.isEdge && cell.source && cell.target)
    .map((cell) => readEdge(cell, cell.value || labelsByEdge.get(cell.id) || ''))
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  const graph: FlowGraph = { nodes, edges };
  if (lanes.length > 0) {
    graph.lanes = lanes;
  }
  const poolTitle = swimlanes.find((cell) => pools.has(cell.id))?.value;
  const title = titleCell?.value || poolTitle;
  if (title) {
    graph.title = title;
  }
  return { graph, direction };
}
