import type { BatchText } from './elementBatch';
import { getLabelLayers, paintLabels } from './labelLayer';

interface FakeContext {
  fillTextCalls: { text: string; x: number; y: number }[];
  setTransform: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
}

function mockCanvasContext(): FakeContext {
  const ctx: FakeContext & Record<string, unknown> = {
    fillTextCalls: [],
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 7 }),
    fillText: (text: string, x: number, y: number) => ctx.fillTextCalls.push({ text, x, y }),
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
  };
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = original(tag);
    if (tag === 'canvas') {
      (element as HTMLCanvasElement).getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext'];
    }
    return element;
  });
  return ctx;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getLabelLayers', () => {
  it('should return the same pair for the same owner', () => {
    // Arrange
    const owner = {};

    // Act
    const first = getLabelLayers(owner);
    const second = getLabelLayers(owner);

    // Assert
    expect(first).toBe(second);
  });

  it('should give separate canvases to the edge and node layers', () => {
    // Act
    const layers = getLabelLayers({});

    // Assert
    expect(layers.edge).not.toBe(layers.node);
  });
});

describe('paintLabels', () => {
  function label(patch: Partial<BatchText['style']>): BatchText {
    return { x: 100, y: 50, style: { text: 'hello', fontSize: 12, fill: '#000', ...patch } };
  }

  it('should size the canvas in device pixels', () => {
    // Arrange
    mockCanvasContext();
    const canvas = document.createElement('canvas');

    // Act
    paintLabels(canvas, [], 300, 200, 2);

    // Assert
    expect([canvas.width, canvas.height]).toEqual([600, 400]);
  });

  it('should draw one line of text per label', () => {
    // Arrange
    const ctx = mockCanvasContext();
    const canvas = document.createElement('canvas');

    // Act
    paintLabels(canvas, [label({ text: 'a\nb' })], 300, 200, 1);

    // Assert
    expect(ctx.fillTextCalls.map((call) => call.text)).toEqual(['a', 'b']);
  });

  it('should truncate a line that is wider than the label width', () => {
    // Arrange
    const ctx = mockCanvasContext();
    const canvas = document.createElement('canvas');

    // Act: width 21px fits 3 chars at 7px each, so a long word gets an ellipsis
    paintLabels(canvas, [label({ text: 'abcdefgh', width: 21, overflow: 'truncate' })], 300, 200, 1);

    // Assert
    expect(ctx.fillTextCalls[0].text.endsWith('…')).toBe(true);
  });
});
