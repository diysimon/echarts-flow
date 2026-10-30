import type { ArrowType, FlowDirection, FlowEdge, FlowEdgeStyle, FlowGraph, FlowLane, FlowNode, FlowNodeShape } from '../types';

export interface ImportedFlow {
  graph: FlowGraph;
  direction: FlowDirection;
}

/** Bracket pairs around a Mermaid node label, longest openers first so `((` wins over `(`. */
const MERMAID_SHAPES: { open: string; close: string; shape: FlowNodeShape }[] = [
  { open: '(((', close: ')))', shape: 'circle' },
  { open: '((', close: '))', shape: 'circle' },
  { open: '([', close: '])', shape: 'start' },
  { open: '[[', close: ']]', shape: 'subprocess' },
  { open: '[(', close: ')]', shape: 'database' },
  { open: '[/', close: '/]', shape: 'io' },
  { open: '[\\', close: '\\]', shape: 'io' },
  { open: '[/', close: '\\]', shape: 'io' },
  { open: '[\\', close: '/]', shape: 'io' },
  { open: '{{', close: '}}', shape: 'hexagon' },
  { open: '[', close: ']', shape: 'process' },
  { open: '{', close: '}', shape: 'decision' },
  { open: '(', close: ')', shape: 'process' },
  { open: '>', close: ']', shape: 'process' },
];

const EXPORT_BRACKETS: Partial<Record<FlowNodeShape, [string, string]>> & { process: [string, string] } = {
  process: ['[', ']'],
  start: ['([', '])'],
  decision: ['{', '}'],
  io: ['[/', '/]'],
  circle: ['((', '))'],
  hexagon: ['{{', '}}'],
  database: ['[(', ')]'],
  subprocess: ['[[', ']]'],
};

/** Shapes written with Mermaid 11's `@{ shape }` syntax, which has no bracket form for them. */
const EXTENDED_SHAPES: Partial<Record<FlowNodeShape, string>> = { document: 'doc', text: 'text' };
const EXTENDED_SHAPE_NAMES: Record<string, FlowNodeShape> = {
  doc: 'document',
  document: 'document',
  text: 'text',
  cyl: 'database',
  database: 'database',
  diam: 'decision',
  diamond: 'decision',
  rect: 'process',
  rounded: 'process',
  stadium: 'start',
  terminal: 'start',
  circle: 'circle',
  hex: 'hexagon',
  hexagon: 'hexagon',
  lean_r: 'io',
  'lean-r': 'io',
  subproc: 'subprocess',
  subprocess: 'subprocess',
};

/** Words Mermaid cannot use as node ids. */
const RESERVED_IDS = new Set(['end', 'graph', 'flowchart', 'subgraph', 'style', 'class', 'classdef', 'click', 'linkstyle', 'direction']);
const IGNORED_STATEMENTS = /^(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/;
const DASHED_LINE = [4, 4];
const THICK_LINE_WIDTH = 2.5;

// ---------- export ----------

function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/\n/g, '<br>');
}

/** Mermaid ids allow letters, digits and underscores; others become `_`, and clashes get a suffix. */
function createIdMapper(): (id: string) => string {
  const ids = new Map<string, string>();
  const used = new Set<string>();
  return (id: string) => {
    const existing = ids.get(id);
    if (existing) {
      return existing;
    }
    let safe = id.replace(/[^\p{L}\p{N}_]/gu, '_') || 'node';
    if (RESERVED_IDS.has(safe.toLowerCase())) {
      safe = `${safe}_`;
    }
    let candidate = safe;
    for (let index = 2; used.has(candidate); index++) {
      candidate = `${safe}_${index}`;
    }
    used.add(candidate);
    ids.set(id, candidate);
    return candidate;
  };
}

function formatNode(node: FlowNode, mermaidId: string): string {
  const label = `"${escapeLabel(node.label)}"`;
  const extended = EXTENDED_SHAPES[node.shape];
  if (extended) {
    return `${mermaidId}@{ shape: ${extended}, label: ${label} }`;
  }
  const isTerminal = node.shape === 'start' || node.shape === 'end';
  const [open, close] = EXPORT_BRACKETS[isTerminal ? 'start' : node.shape] ?? EXPORT_BRACKETS.process;
  return `${mermaidId}${open}${label}${close}`;
}

function formatLink(edge: FlowEdge): string {
  const style = edge.style ?? {};
  const hasTarget = (style.targetArrow ?? 'triangle') !== 'none';
  const hasSource = (style.sourceArrow ?? 'none') !== 'none';
  const isDashed = Boolean(style.lineDash && style.lineDash.length > 0);
  const body = isDashed ? '-.-' : '--';
  const link = `${hasSource ? '<' : ''}${body}${hasTarget ? '>' : isDashed ? '' : '-'}`;
  return edge.label ? `${link}|"${escapeLabel(edge.label)}"|` : link;
}

/** Nodes grouped by lane; nodes with a missing or unknown lane go to the first lane, as when drawn. */
function groupByLane(graph: FlowGraph): Map<string, FlowNode[]> {
  const lanes = graph.lanes ?? [];
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const groups = new Map<string, FlowNode[]>(lanes.map((lane) => [lane.id, []]));
  graph.nodes.forEach((node) => {
    const laneId = node.laneId && laneIds.has(node.laneId) ? node.laneId : lanes[0]?.id;
    if (laneId) {
      groups.get(laneId)?.push(node);
    }
  });
  return groups;
}

/**
 * Writes the graph as a Mermaid flowchart. Lanes become subgraphs. Positions
 * and styles other than dashed lines and arrows are not kept.
 */
export function toMermaid(graph: FlowGraph, options: { direction?: FlowDirection } = {}): string {
  const toId = createIdMapper();
  const lines: string[] = [];
  if (graph.title) {
    lines.push('---', `title: ${graph.title}`, '---');
  }
  lines.push(`flowchart ${options.direction === 'LR' ? 'LR' : 'TD'}`);
  const lanes = graph.lanes ?? [];
  if (lanes.length > 0) {
    const groups = groupByLane(graph);
    lanes.forEach((lane) => {
      lines.push(`  subgraph ${toId(`lane_${lane.id}`)}["${escapeLabel(lane.label)}"]`);
      groups.get(lane.id)?.forEach((node) => lines.push(`    ${formatNode(node, toId(node.id))}`));
      lines.push('  end');
    });
  } else {
    graph.nodes.forEach((node) => lines.push(`  ${formatNode(node, toId(node.id))}`));
  }
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .forEach((edge) => lines.push(`  ${toId(edge.source)} ${formatLink(edge)} ${toId(edge.target)}`));
  return `${lines.join('\n')}\n`;
}

// ---------- import ----------

interface Cursor {
  text: string;
  pos: number;
}

interface NodeRef {
  id: string;
  shape?: FlowNodeShape;
  label?: string;
}

interface LinkInfo {
  label?: string;
  hasSource: boolean;
  hasTarget: boolean;
  isDashed: boolean;
  isThick: boolean;
  isInvisible: boolean;
}

interface ParseState {
  nodes: Map<string, FlowNode>;
  edges: FlowEdge[];
  lanes: FlowLane[];
  laneStack: string[];
}

const ID_PATTERN = /[\p{L}\p{N}_]+(?:-(?![-.>=])[\p{L}\p{N}_]+)*/uy;
/** `-- text -->`, `-. text .->` and `== text ==>`; the opener must not run on into a plain arrow. */
const INLINE_LINK_PATTERN = /(<?)(--|==|-\.)(?![->.=])\s*(.+?)\s*(-{2,}>|-{2,}|={2,}>|={2,}|\.->|\.-)/uy;
const PLAIN_LINK_PATTERN = /(<?)(-{2,}>|-{3,}|={2,}>|={3,}|-\.+->|-\.+-|--[ox]|==[ox]|~~~)/y;
const PIPE_LABEL_PATTERN = /\s*\|([^|]*)\|/y;
const ARROW_ENDINGS = new Set(['>', 'o', 'x']);

function skipSpaces(cursor: Cursor): void {
  while (cursor.pos < cursor.text.length && /\s/.test(cursor.text[cursor.pos])) {
    cursor.pos++;
  }
}

function matchAt(pattern: RegExp, cursor: Cursor): RegExpExecArray | null {
  pattern.lastIndex = cursor.pos;
  const match = pattern.exec(cursor.text);
  if (match) {
    cursor.pos += match[0].length;
  }
  return match;
}

function unquote(label: string): string {
  const trimmed = label.trim();
  const inner = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
  return inner.replace(/#quot;/g, '"').replace(/<br\s*\/?>/gi, '\n');
}

/** End of a bracketed label; a quoted label may contain the closing bracket. */
function findLabelEnd(text: string, start: number, close: string): number {
  let from = start;
  const quoteStart = text.slice(start).search(/\S/);
  if (quoteStart >= 0 && text[start + quoteStart] === '"') {
    const quoteEnd = text.indexOf('"', start + quoteStart + 1);
    from = quoteEnd >= 0 ? quoteEnd + 1 : start;
  }
  return text.indexOf(close, from);
}

/** Mermaid 11 `@{ shape: doc, label: "..." }` node syntax. */
function readExtendedShape(cursor: Cursor, ref: NodeRef): NodeRef {
  const end = cursor.text.indexOf('}', cursor.pos);
  if (end < 0) {
    return ref;
  }
  const body = cursor.text.slice(cursor.pos + 2, end);
  cursor.pos = end + 1;
  const shapeName = /shape:\s*([\w-]+)/.exec(body)?.[1]?.toLowerCase();
  const label = /label:\s*("[^"]*"|[^,}]+)/.exec(body)?.[1];
  return {
    ...ref,
    shape: (shapeName && EXTENDED_SHAPE_NAMES[shapeName]) || 'process',
    label: label === undefined ? undefined : unquote(label),
  };
}

function readNodeRef(cursor: Cursor): NodeRef | null {
  skipSpaces(cursor);
  const match = matchAt(ID_PATTERN, cursor);
  if (!match) {
    return null;
  }
  const ref: NodeRef = { id: match[0] };
  if (cursor.text.startsWith('@{', cursor.pos)) {
    return readExtendedShape(cursor, ref);
  }
  for (const { open, close, shape } of MERMAID_SHAPES) {
    if (!cursor.text.startsWith(open, cursor.pos)) {
      continue;
    }
    const end = findLabelEnd(cursor.text, cursor.pos + open.length, close);
    if (end >= 0) {
      const label = cursor.text.slice(cursor.pos + open.length, end);
      cursor.pos = end + close.length;
      return { ...ref, shape, label: unquote(label) };
    }
  }
  return ref;
}

/** One node, or several joined with `&`. */
function readNodeGroup(cursor: Cursor): NodeRef[] {
  const refs: NodeRef[] = [];
  let ref = readNodeRef(cursor);
  while (ref) {
    refs.push(ref);
    skipSpaces(cursor);
    if (cursor.text[cursor.pos] !== '&') {
      break;
    }
    cursor.pos++;
    ref = readNodeRef(cursor);
  }
  return refs;
}

function toLinkInfo(source: string, arrow: string, label: string | undefined): LinkInfo {
  return {
    label: label === undefined || label.trim() === '' ? undefined : unquote(label),
    hasSource: source === '<',
    hasTarget: ARROW_ENDINGS.has(arrow[arrow.length - 1]),
    isDashed: arrow.includes('.'),
    isThick: arrow.includes('='),
    isInvisible: arrow === '~~~',
  };
}

function readLink(cursor: Cursor): LinkInfo | null {
  skipSpaces(cursor);
  const inline = matchAt(INLINE_LINK_PATTERN, cursor);
  if (inline) {
    return toLinkInfo(inline[1], `${inline[2]}${inline[4]}`, inline[3]);
  }
  const plain = matchAt(PLAIN_LINK_PATTERN, cursor);
  if (!plain) {
    return null;
  }
  const pipe = matchAt(PIPE_LABEL_PATTERN, cursor);
  return toLinkInfo(plain[1], plain[2], pipe?.[1]);
}

function registerNode(state: ParseState, ref: NodeRef): void {
  const laneId = state.laneStack[state.laneStack.length - 1];
  const existing = state.nodes.get(ref.id);
  const node: FlowNode = existing ?? { id: ref.id, label: ref.label ?? ref.id, shape: ref.shape ?? 'process' };
  if (existing && ref.shape) {
    node.shape = ref.shape;
    node.label = ref.label ?? node.label;
  }
  if (laneId && !node.laneId) {
    node.laneId = laneId;
  }
  state.nodes.set(ref.id, node);
}

function buildEdgeStyle(link: LinkInfo): FlowEdgeStyle | undefined {
  const style: FlowEdgeStyle = {};
  const NO_ARROW: ArrowType = 'none';
  if (!link.hasTarget) {
    style.targetArrow = NO_ARROW;
  }
  if (link.hasSource) {
    style.sourceArrow = 'triangle';
  }
  if (link.isDashed) {
    style.lineDash = DASHED_LINE;
  }
  if (link.isThick) {
    style.lineWidth = THICK_LINE_WIDTH;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function addLinks(state: ParseState, sources: NodeRef[], targets: NodeRef[], link: LinkInfo): void {
  if (link.isInvisible) {
    return;
  }
  const style = buildEdgeStyle(link);
  sources.forEach((source) => {
    targets.forEach((target) => {
      const edge: FlowEdge = { id: `e${state.edges.length + 1}`, source: source.id, target: target.id };
      if (link.label) {
        edge.label = link.label;
      }
      if (style) {
        edge.style = style;
      }
      state.edges.push(edge);
    });
  });
}

/** A chain such as `a & b --> c -->|yes| d`, or a lone node definition. */
function parseChain(state: ParseState, statement: string): void {
  const cursor: Cursor = { text: statement, pos: 0 };
  let sources = readNodeGroup(cursor);
  sources.forEach((ref) => registerNode(state, ref));
  while (sources.length > 0) {
    const link = readLink(cursor);
    const targets = link ? readNodeGroup(cursor) : [];
    if (!link || targets.length === 0) {
      return;
    }
    targets.forEach((ref) => registerNode(state, ref));
    addLinks(state, sources, targets, link);
    sources = targets;
  }
}

/** `subgraph id["Label"]`, `subgraph id`, or `subgraph Some title`. Exported lane ids carry a `lane_` prefix. */
function parseSubgraph(state: ParseState, rest: string): void {
  const LANE_PREFIX = 'lane_';
  const withLabel = /^([\p{L}\p{N}_-]+)\s*\[(.*)\]\s*$/u.exec(rest);
  const isBareId = /^[\p{L}\p{N}_-]+$/u.test(rest);
  const rawId = withLabel?.[1] ?? (isBareId ? rest : `subgraph_${state.lanes.length + 1}`);
  const id = rawId.startsWith(LANE_PREFIX) ? rawId.slice(LANE_PREFIX.length) : rawId;
  const label = withLabel ? unquote(withLabel[2]) : unquote(rest);
  state.lanes.push({ id, label });
  state.laneStack.push(id);
}

/** Splits on newlines and on semicolons outside quotes. */
function splitStatements(text: string): string[] {
  const statements: string[] = [];
  let current = '';
  let isQuoted = false;
  for (const char of text) {
    if (char === '"') {
      isQuoted = !isQuoted;
    }
    if (char === '\n' || (char === ';' && !isQuoted)) {
      statements.push(current.trim());
      current = '';
      isQuoted = false;
      continue;
    }
    current += char;
  }
  statements.push(current.trim());
  return statements.filter((statement) => statement !== '' && !statement.startsWith('%%'));
}

function readFrontmatter(text: string): { body: string; title?: string } {
  const match = /^\s*---\n([\s\S]*?)\n---\s*\n/.exec(text);
  if (!match) {
    return { body: text };
  }
  const title = /^title:\s*(.+)$/m.exec(match[1])?.[1]?.trim();
  return { body: text.slice(match[0].length), title };
}

/** Stadium nodes read as start; those with incoming but no outgoing edges are ends. */
function markEndNodes(nodes: FlowNode[], edges: FlowEdge[]): void {
  const sources = new Set(edges.map((edge) => edge.source));
  const targets = new Set(edges.map((edge) => edge.target));
  nodes.forEach((node) => {
    if (node.shape === 'start' && targets.has(node.id) && !sources.has(node.id)) {
      node.shape = 'end';
    }
  });
}

/**
 * Reads a Mermaid flowchart: nodes with their shapes, edges with labels,
 * arrows and dashes, subgraphs as lanes, and the frontmatter title. Styling
 * statements are skipped. Nodes come without positions, so the editor or
 * `fillMissingPositions` lays them out.
 */
export function fromMermaid(text: string): ImportedFlow {
  const { body, title } = readFrontmatter(text.replace(/\r\n?/g, '\n'));
  const state: ParseState = { nodes: new Map(), edges: [], lanes: [], laneStack: [] };
  let direction: FlowDirection = 'TB';
  splitStatements(body).forEach((statement) => {
    const header = /^(?:flowchart|graph)(?:\s+(TB|TD|BT|RL|LR))?\b/i.exec(statement);
    if (header) {
      direction = /^(LR|RL)$/i.test(header[1] ?? '') ? 'LR' : 'TB';
      return;
    }
    const subgraph = /^subgraph\s+(.+)$/.exec(statement);
    if (subgraph) {
      parseSubgraph(state, subgraph[1].trim());
      return;
    }
    if (statement === 'end') {
      state.laneStack.pop();
      return;
    }
    if (!IGNORED_STATEMENTS.test(statement)) {
      parseChain(state, statement);
    }
  });
  const nodes = Array.from(state.nodes.values());
  markEndNodes(nodes, state.edges);
  const graph: FlowGraph = { nodes, edges: state.edges };
  if (state.lanes.length > 0) {
    graph.lanes = state.lanes;
  }
  if (title) {
    graph.title = title;
  }
  return { graph, direction };
}
