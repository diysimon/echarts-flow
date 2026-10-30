export type EditorCommand =
  | 'delete'
  | 'undo'
  | 'redo'
  | 'cancel'
  | 'select-all'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'duplicate'
  | 'nudge-left'
  | 'nudge-right'
  | 'nudge-up'
  | 'nudge-down';

interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_COMMANDS: Record<string, EditorCommand> = {
  a: 'select-all',
  c: 'copy',
  x: 'cut',
  v: 'paste',
  d: 'duplicate',
  y: 'redo',
};

const ARROW_COMMANDS: Record<string, EditorCommand> = {
  arrowleft: 'nudge-left',
  arrowright: 'nudge-right',
  arrowup: 'nudge-up',
  arrowdown: 'nudge-down',
};

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
  if (hasModifier) {
    return MODIFIER_COMMANDS[key] ?? null;
  }
  return ARROW_COMMANDS[key] ?? null;
}

export function isNudgeCommand(command: EditorCommand): command is 'nudge-left' | 'nudge-right' | 'nudge-up' | 'nudge-down' {
  return command.startsWith('nudge-');
}
