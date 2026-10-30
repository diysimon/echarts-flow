import type { FlowGraph, FlowSelection } from '../types';

/**
 * What users may do on the canvas. The flags gate pointer and keyboard
 * interaction only; API calls such as `addNode()` or `connect()` always work,
 * except for the data rules: `validateConnection`, `beforeDelete` and
 * locked elements apply to both.
 */
export interface FlowEditOptions {
  /** Master switch. When false the canvas is read-only: no moving, connecting, label editing or deleting. */
  isEnabled: boolean;
  canSelect: boolean;
  /** Shift / Cmd / Ctrl click adds to the selection. */
  canMultiSelect: boolean;
  canMoveNodes: boolean;
  /** Drag from a node port to another node to create an edge. */
  canConnect: boolean;
  /** Double-click nodes, edges, lane headers and the title to rename them. */
  canEditLabels: boolean;
  /** Delete / Backspace removes the selection. */
  canDelete: boolean;
  /** Ctrl/Cmd+Z and redo shortcuts. */
  canUndo: boolean;
  /** Dropping a node into another lane moves it into that lane. */
  canChangeLane: boolean;
  /** Dragging empty canvas pans the view. */
  canPan: boolean;
  /** The mouse wheel zooms; when false the wheel scrolls the page as usual. */
  canZoom: boolean;
  /** Drag a box on empty canvas to select the nodes it touches. */
  canBoxSelect: boolean;
  /** What dragging empty canvas does; holding Shift does the other one. */
  blankDragAction: 'pan' | 'boxSelect';
  /** Cmd/Ctrl + C, X, V and D copy, cut, paste and duplicate the selected nodes. */
  canCopyPaste: boolean;
  /** Drag the handle on either end of a selected edge onto another node. */
  canReconnect: boolean;
  /** While dragging, snap to and show lines where nodes' edges or centers line up. */
  shouldShowAlignGuides: boolean;
  /** Screen pixels within which a dragged node snaps to an alignment line. */
  alignThreshold: number;
  hasKeyboardShortcuts: boolean;
  shouldSnapToGrid: boolean;
  gridSize: number;
  minZoom: number;
  maxZoom: number;
  /** Zoom change per wheel pixel; larger zooms faster. */
  wheelZoomSpeed: number;
  /** Return false to reject a new edge, whether drawn by the user or added with `connect()`. Pass null to remove. */
  validateConnection?: ((sourceId: string, targetId: string, graph: FlowGraph) => boolean) | null;
  /** Return false to cancel a deletion, whether from the keyboard or `deleteSelection()`. Pass null to remove. */
  beforeDelete?: ((selection: FlowSelection, graph: FlowGraph) => boolean) | null;
}

export const DEFAULT_EDIT_OPTIONS: FlowEditOptions = {
  isEnabled: true,
  canSelect: true,
  canMultiSelect: true,
  canMoveNodes: true,
  canConnect: true,
  canEditLabels: true,
  canDelete: true,
  canUndo: true,
  canChangeLane: true,
  canPan: true,
  canZoom: true,
  canBoxSelect: true,
  blankDragAction: 'pan',
  canCopyPaste: true,
  canReconnect: true,
  shouldShowAlignGuides: true,
  alignThreshold: 6,
  hasKeyboardShortcuts: true,
  shouldSnapToGrid: true,
  gridSize: 10,
  minZoom: 0.2,
  maxZoom: 3,
  wheelZoomSpeed: 0.0015,
};

/** Keeps zoom limits ordered and positive so a bad patch can't lock the view. */
function sanitize(options: FlowEditOptions): FlowEditOptions {
  const MIN_ZOOM_FLOOR = 0.01;
  const minZoom = Math.max(options.minZoom, MIN_ZOOM_FLOOR);
  return {
    ...options,
    minZoom,
    maxZoom: Math.max(options.maxZoom, minZoom),
    gridSize: Math.max(options.gridSize, 1),
    alignThreshold: Math.max(options.alignThreshold, 0),
  };
}

export function mergeEditOptions(base: FlowEditOptions, patch: Partial<FlowEditOptions> = {}): FlowEditOptions {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  return sanitize({ ...base, ...defined });
}

/** Flags that only matter while editing is enabled. */
type EditAction = 'canMoveNodes' | 'canConnect' | 'canEditLabels' | 'canDelete' | 'canUndo' | 'canChangeLane' | 'canCopyPaste' | 'canReconnect';

/** An editing action is allowed only when the master switch and its own flag are both on. */
export function isEditAllowed(options: FlowEditOptions, action: EditAction): boolean {
  return options.isEnabled && options[action];
}
