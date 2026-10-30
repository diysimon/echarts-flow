import { DEFAULT_EDIT_OPTIONS, isEditAllowed, mergeEditOptions } from './editOptions';

describe('mergeEditOptions', () => {
  it('should override only the given options', () => {
    // Act
    const options = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { canDelete: false });

    // Assert
    expect([options.canDelete, options.canConnect]).toEqual([false, true]);
  });

  it('should ignore undefined values so shorthands can be passed through', () => {
    // Act
    const options = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { isEnabled: undefined });

    // Assert
    expect(options.isEnabled).toBe(true);
  });

  it('should raise maxZoom to minZoom when the limits are reversed', () => {
    // Act
    const options = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { minZoom: 2, maxZoom: 1 });

    // Assert
    expect(options.maxZoom).toBe(2);
  });

  it('should keep the grid size positive', () => {
    // Act
    const options = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { gridSize: 0 });

    // Assert
    expect(options.gridSize).toBe(1);
  });

  it('should remove a hook when it is set to null', () => {
    // Arrange
    const withHook = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { beforeDelete: () => false });

    // Act
    const options = mergeEditOptions(withHook, { beforeDelete: null });

    // Assert
    expect(options.beforeDelete).toBeNull();
  });

  it('should not mutate the base options', () => {
    // Act
    mergeEditOptions(DEFAULT_EDIT_OPTIONS, { canPan: false });

    // Assert
    expect(DEFAULT_EDIT_OPTIONS.canPan).toBe(true);
  });
});

describe('isEditAllowed', () => {
  it('should block every editing action when the master switch is off', () => {
    // Arrange
    const options = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { isEnabled: false });

    // Act
    const isAllowed = isEditAllowed(options, 'canMoveNodes');

    // Assert
    expect(isAllowed).toBe(false);
  });

  it('should block an action whose own flag is off', () => {
    // Arrange
    const options = mergeEditOptions(DEFAULT_EDIT_OPTIONS, { canConnect: false });

    // Act
    const isAllowed = isEditAllowed(options, 'canConnect');

    // Assert
    expect(isAllowed).toBe(false);
  });
});
