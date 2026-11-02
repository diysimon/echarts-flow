import type { ElementOption } from './renderFlowNode';
import { BATCH_SHAPE, ElementBatcher } from './elementBatch';

function asElement(raw: Record<string, unknown>): ElementOption {
  return raw as unknown as ElementOption;
}

const FILLED = { fill: '#fff', stroke: '#000', lineWidth: 1 };

describe('ElementBatcher', () => {
  it('should merge elements that share a style into one batch element', () => {
    // Arrange
    const batcher = new ElementBatcher();
    batcher.add(asElement({ type: 'rect', shape: { x: 0, y: 0, width: 10, height: 10 }, style: FILLED }));
    batcher.add(asElement({ type: 'rect', shape: { x: 20, y: 0, width: 10, height: 10 }, style: FILLED }));

    // Act
    const elements = batcher.toElements() as unknown as { type: string; shape: { items: unknown[] } }[];

    // Assert
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe(BATCH_SHAPE);
    expect(elements[0].shape.items).toHaveLength(2);
  });

  it('should keep elements with different styles in separate batches', () => {
    // Arrange
    const batcher = new ElementBatcher();
    batcher.add(asElement({ type: 'rect', shape: {}, style: FILLED }));
    batcher.add(asElement({ type: 'rect', shape: {}, style: { ...FILLED, fill: '#f00' } }));

    // Act
    const elements = batcher.toElements();

    // Assert
    expect(elements).toHaveLength(2);
  });

  it('should flatten a group and add its offset to each child', () => {
    // Arrange
    const batcher = new ElementBatcher();
    batcher.add(asElement({
      type: 'group',
      x: 100,
      y: 50,
      children: [{ type: 'rect', shape: { x: 1, y: 2 }, style: FILLED }],
    }));

    // Act
    const items = (batcher.toElements()[0] as unknown as { shape: { items: { dx: number; dy: number }[] } }).shape.items;

    // Assert
    expect(items[0]).toMatchObject({ dx: 100, dy: 50 });
  });

  it('should collect text into the label list instead of a batch', () => {
    // Arrange
    const batcher = new ElementBatcher();
    batcher.add(asElement({ type: 'group', x: 5, y: 7, children: [{ type: 'text', style: { text: 'hi' } }] }));

    // Act & Assert
    expect(batcher.texts).toEqual([{ x: 5, y: 7, style: { text: 'hi' } }]);
    expect(batcher.toElements()).toHaveLength(0);
  });

  it('should skip elements that paint nothing', () => {
    // Arrange
    const batcher = new ElementBatcher();
    batcher.add(asElement({ type: 'rect', shape: {}, style: { fill: 'none', stroke: 'transparent' } }));

    // Act & Assert
    expect(batcher.toElements()).toHaveLength(0);
  });

  it('should order batches by rank, lowest first', () => {
    // Arrange: lines rank 0, arrows rank 1, but the arrow is added first
    const batcher = new ElementBatcher({ line: 0, arrow: 1 });
    batcher.add(asElement({ type: 'rect', name: 'arrow', shape: {}, style: { ...FILLED, fill: '#f00' } }));
    batcher.add(asElement({ type: 'rect', name: 'line', shape: {}, style: FILLED }));

    // Act
    const items = batcher.toElements().map((element) => (element as unknown as { style: { fill: string } }).style.fill);

    // Assert: the line batch (rank 0) comes first
    expect(items).toEqual(['#fff', '#f00']);
  });

  it('should draw a clipped accent rect as the clip rectangle', () => {
    // Arrange
    const batcher = new ElementBatcher();
    batcher.add(asElement({
      type: 'rect',
      shape: { x: 0, y: 0, width: 100, height: 40, r: 6 },
      style: FILLED,
      clipPath: { type: 'rect', shape: { x: 0, y: 0, width: 4, height: 40 } },
    }));

    // Act
    const item = (batcher.toElements()[0] as unknown as { shape: { items: { shape: { width: number; r: number } }[] } }).shape.items[0];

    // Assert
    expect(item.shape).toMatchObject({ width: 4, r: 0 });
  });
});
