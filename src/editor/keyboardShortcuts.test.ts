import { resolveShortcut } from './keyboardShortcuts';

function createKey(key: string, patch: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }> = {}) {
  return { key, metaKey: false, ctrlKey: false, shiftKey: false, ...patch };
}

describe('resolveShortcut', () => {
  it('should return delete when Backspace is pressed', () => {
    // Act
    const command = resolveShortcut(createKey('Backspace'));

    // Assert
    expect(command).toBe('delete');
  });

  it('should return undo when Cmd+Z is pressed', () => {
    // Act
    const command = resolveShortcut(createKey('z', { metaKey: true }));

    // Assert
    expect(command).toBe('undo');
  });

  it('should return redo when Ctrl+Shift+Z is pressed', () => {
    // Act
    const command = resolveShortcut(createKey('Z', { ctrlKey: true, shiftKey: true }));

    // Assert
    expect(command).toBe('redo');
  });

  it('should return redo when Ctrl+Y is pressed', () => {
    // Act
    const command = resolveShortcut(createKey('y', { ctrlKey: true }));

    // Assert
    expect(command).toBe('redo');
  });

  it('should return cancel when Escape is pressed', () => {
    // Act
    const command = resolveShortcut(createKey('Escape'));

    // Assert
    expect(command).toBe('cancel');
  });

  it('should return null when Z is pressed without modifier', () => {
    // Act
    const command = resolveShortcut(createKey('z'));

    // Assert
    expect(command).toBeNull();
  });

  it.each([
    ['a', 'select-all'],
    ['c', 'copy'],
    ['x', 'cut'],
    ['v', 'paste'],
    ['d', 'duplicate'],
  ])('should return the clipboard command when Cmd+%s is pressed', (key, expected) => {
    // Act
    const command = resolveShortcut(createKey(key, { metaKey: true }));

    // Assert
    expect(command).toBe(expected);
  });

  it('should return nudge-left when ArrowLeft is pressed', () => {
    // Act
    const command = resolveShortcut(createKey('ArrowLeft'));

    // Assert
    expect(command).toBe('nudge-left');
  });

  it('should return null when C is pressed without modifier', () => {
    // Act
    const command = resolveShortcut(createKey('c'));

    // Assert
    expect(command).toBeNull();
  });
});
