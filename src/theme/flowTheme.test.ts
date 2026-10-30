import { createFlowTheme, type FlowTheme } from './flowTheme';
import { lightTheme } from './lightThemes';
import { FLOW_THEMES, resolveFlowTheme } from './themeRegistry';

describe('resolveFlowTheme', () => {
  it('should return the light theme when no theme is given', () => {
    // Act
    const theme = resolveFlowTheme();

    // Assert
    expect(theme).toBe(lightTheme);
  });

  it('should look up a built-in theme by name', () => {
    // Act
    const theme = resolveFlowTheme('macarons');

    // Assert
    expect(theme).toBe(FLOW_THEMES.macarons);
  });

  it('should return a custom theme object unchanged', () => {
    // Arrange
    const customTheme: FlowTheme = { ...lightTheme, selected: '#000000' };

    // Act
    const theme = resolveFlowTheme(customTheme);

    // Assert
    expect(theme).toBe(customTheme);
  });
});

describe('createFlowTheme', () => {
  it('should override a nested field and keep its siblings', () => {
    // Act
    const theme = createFlowTheme(lightTheme, { edge: { stroke: '#123456' } });

    // Assert
    expect([theme.edge.stroke, theme.edge.targetArrow]).toEqual(['#123456', lightTheme.edge.targetArrow]);
  });

  it('should replace arrays instead of merging them', () => {
    // Arrange
    const base = createFlowTheme(lightTheme, { edge: { lineDash: [8, 4, 2] } });

    // Act
    const theme = createFlowTheme(base, { edge: { lineDash: [1, 1] } });

    // Assert
    expect(theme.edge.lineDash).toEqual([1, 1]);
  });

  it('should not mutate the base theme', () => {
    // Act
    createFlowTheme(lightTheme, { node: { radius: 99 } });

    // Assert
    expect(lightTheme.node.radius).not.toBe(99);
  });

  it('should give every built-in theme a style for every shape', () => {
    // Act
    const shapeCounts = Object.values(FLOW_THEMES).map((theme) => Object.keys(theme.shapes).length);

    // Assert
    expect(new Set(shapeCounts)).toEqual(new Set([11]));
  });
});
