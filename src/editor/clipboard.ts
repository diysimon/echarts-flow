import type { FlowEdge, FlowGraph, FlowNode, FlowSelection, Point } from '../types';
import { collectElementIds, createUniqueId } from './graphOps';

/** Copied nodes plus the edges that run between them. */
export interface FlowClipboard {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface PasteResult {
  graph: FlowGraph;
  /** The pasted copies, so the editor can select them. */
  selection: FlowSelection;
}

/**
 * Copies the selected nodes and every edge whose two ends are both copied.
 * Edges alone cannot be pasted without their nodes, so a selection with no
 * nodes copies nothing.
 */
export function copyElements(graph: FlowGraph, selection: FlowSelection): FlowClipboard | null {
  const nodeIds = new Set(selection.nodeIds);
  const nodes = graph.nodes.filter((node) => nodeIds.has(node.id));
  if (nodes.length === 0) {
    return null;
  }
  const edges = graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return { nodes, edges };
}

/** A pasted copy is a fresh, editable node: no lock and no runtime status. */
function toPastedNode(node: FlowNode, id: string, offset: Point, laneIds: Set<string>): FlowNode {
  const { isLocked: _isLocked, status: _status, ...rest } = node;
  const laneId = node.laneId && laneIds.has(node.laneId) ? node.laneId : undefined;
  return { ...rest, id, x: (node.x ?? 0) + offset.x, y: (node.y ?? 0) + offset.y, laneId };
}

/** Adds copies of the clipboard with new ids, shifted by `offset`. */
export function pasteElements(graph: FlowGraph, clipboard: FlowClipboard, offset: Point): PasteResult {
  const usedIds = new Set(collectElementIds(graph));
  const claimId = (prefix: string): string => {
    const id = createUniqueId(prefix, usedIds);
    usedIds.add(id);
    return id;
  };
  const laneIds = new Set((graph.lanes ?? []).map((lane) => lane.id));
  const idMap = new Map<string, string>();
  const nodes = clipboard.nodes.map((node) => {
    const id = claimId('node');
    idMap.set(node.id, id);
    return toPastedNode(node, id, offset, laneIds);
  });
  const edges = clipboard.edges.map((edge) => {
    const { isLocked: _isLocked, ...rest } = edge;
    return { ...rest, id: claimId('edge'), source: idMap.get(edge.source) ?? edge.source, target: idMap.get(edge.target) ?? edge.target };
  });
  return {
    graph: { ...graph, nodes: [...graph.nodes, ...nodes], edges: [...graph.edges, ...edges] },
    selection: { nodeIds: nodes.map((node) => node.id), edgeIds: edges.map((edge) => edge.id) },
  };
}
