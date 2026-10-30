import { calcTextWidth, isWideText, wrapText } from './textLayout';

const FONT_SIZE = 10;

describe('isWideText', () => {
  it('should be true for Chinese text', () => {
    // Act
    const isWide = isWideText('需求 评审');

    // Assert
    expect(isWide).toBe(true);
  });

  it('should be false when text mixes in latin characters', () => {
    // Act
    const isWide = isWideText('CI 构建');

    // Assert
    expect(isWide).toBe(false);
  });
});

describe('calcTextWidth', () => {
  it('should count CJK characters as full width', () => {
    // Act
    const width = calcTextWidth('审批', FONT_SIZE);

    // Assert
    expect(width).toBe(20);
  });

  it('should count latin characters as narrower than CJK', () => {
    // Act
    const width = calcTextWidth('ab', FONT_SIZE);

    // Assert
    expect(width).toBe(12);
  });
});

describe('wrapText', () => {
  it('should break latin text between words', () => {
    // Arrange: each line fits 10 latin characters
    const maxWidth = 60;

    // Act
    const lines = wrapText('Check the inventory', maxWidth, FONT_SIZE);

    // Assert
    expect(lines).toEqual(['Check the', 'inventory']);
  });

  it('should break CJK text between characters', () => {
    // Act
    const lines = wrapText('需求收集整理', 30, FONT_SIZE);

    // Assert
    expect(lines).toEqual(['需求收', '集整理']);
  });

  it('should keep explicit newlines', () => {
    // Act
    const lines = wrapText('第一行\n第二行', 1000, FONT_SIZE);

    // Assert
    expect(lines).toEqual(['第一行', '第二行']);
  });

  it('should split a single word longer than the line', () => {
    // Act
    const lines = wrapText('abcdefghij', 30, FONT_SIZE);

    // Assert
    expect(lines).toEqual(['abcde', 'fghij']);
  });

  it('should return one empty line for empty text', () => {
    // Act
    const lines = wrapText('', 100, FONT_SIZE);

    // Assert
    expect(lines).toEqual(['']);
  });
});
