export type EditorCommand = 'delete' | 'undo' | 'redo' | 'cancel';

interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

/** Maps a key event to an editor command; Cmd on macOS and Ctrl elsewhere are equivalent. */
export function resolveShortcut(event: KeyEventLike): EditorCommand | null {
  const key = event.key.toLowerCase();
  const hasModifier = event.metaKey || event.ctrlKey;
  if (key === 'delete' || key === 'backspace') {
    return 'delete';
  }
  if (key === 'escape') {
    return 'cancel';
  }
  if (hasModifier && key === 'z') {
    return event.shiftKey ? 'redo' : 'undo';
  }
  if (hasModifier && key === 'y') {
    return 'redo';
  }
  return null;
}
