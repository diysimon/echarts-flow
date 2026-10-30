import { fromDrawio, toDrawio } from './drawio';
import { linearGradient } from '../render/flowColor';
import type { FlowGraph } from '../types';

function createGraph(): FlowGraph {
  return {
    nodes: [
      { id: 'start', label: '开始', shape: 'start', x: 0, y: 0, laneId: 'dev' },
      { id: 'check', label: 'A < B & C', shape: 'decision', x: 0, y: 120, laneId: 'dev' },
      { id: 'ship', label: '发布\n上线', shape: 'process', x: 0, y: 240, laneId: 'ops', style: { fill: '#ffeecc' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'check' },
      { id: 'e2', source: 'check', target: 'ship', label: '是', style: { lineDash: [4, 4], targetArrow: 'vee' } },
    ],
    lanes: [
      { id: 'dev', label: '研发' },
      { id: 'ops', label: '运维' },
    ],
    title: '发布流程',
  };
}

function findCell(xml: string, id: string): Element | undefined {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.getElementsByTagName('mxCell')).find((cell) => cell.getAttribute('id') === id);
}

describe('toDrawio', () => {
  it('should write a well-formed XML document', () => {
    // Act
    const xml = toDrawio(createGraph());

    // Assert
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('should escape label markup so it reads back as text', () => {
    // Act
    const xml = toDrawio(createGraph());

    // Assert
    expect(findCell(xml, 'check')?.getAttribute('value')).toBe('A &lt; B &amp; C');
  });

  it('should place nodes inside their lane container', () => {
    // Act
    const xml = toDrawio(createGraph());

    // Assert
    expect(findCell(xml, 'ship')?.getAttribute('parent')).toBe('lane:ops');
  });

  it('should prefix ids that clash with the draw.io root cells', () => {
    // Arrange
    const graph: FlowGraph = { nodes: [{ id: '1', label: 'One', shape: 'process', x: 0, y: 0 }], edges: [] };

    // Act
    const xml = toDrawio(graph);

    // Assert
    expect(findCell(xml, 'flow:1')).toBeDefined();
  });
});

describe('fromDrawio', () => {
  it('should keep shapes and labels when round tripping', () => {
    // Act
    const { graph } = fromDrawio(toDrawio(createGraph()));

    // Assert
    expect(graph.nodes.map((node) => `${node.shape}:${node.label}`)).toEqual(['start:开始', 'decision:A < B & C', 'process:发布\n上线']);
  });

  it('should keep lanes in order when round tripping', () => {
    // Act
    const { graph } = fromDrawio(toDrawio(createGraph()));

    // Assert
    expect(graph.lanes?.map((lane) => lane.id)).toEqual(['dev', 'ops']);
  });

  it('should keep each node in its lane when round tripping', () => {
    // Act
    const { graph } = fromDrawio(toDrawio(createGraph()));

    // Assert
    expect(graph.nodes.map((node) => node.laneId)).toEqual(['dev', 'dev', 'ops']);
  });

  it('should keep the edge label, dash and arrow when round tripping', () => {
    // Act
    const { graph } = fromDrawio(toDrawio(createGraph()));

    // Assert
    const edge = graph.edges.find((item) => item.id === 'e2');
    expect([edge?.label, edge?.style?.lineDash, edge?.style?.targetArrow]).toEqual(['是', [4, 3], 'vee']);
  });

  it('should keep the node fill when round tripping', () => {
    // Act
    const { graph } = fromDrawio(toDrawio(createGraph()));

    // Assert
    expect(graph.nodes[2].style?.fill).toBe('#ffeecc');
  });

  it('should keep a vertical gradient fill when round tripping', () => {
    // Arrange
    const graph: FlowGraph = {
      nodes: [{ id: 'g', label: 'G', shape: 'process', x: 0, y: 0, style: { fill: linearGradient(90, '#111111', '#eeeeee') } }],
      edges: [],
    };

    // Act
    const { graph: imported } = fromDrawio(toDrawio(graph));

    // Assert
    expect(imported.nodes[0].style?.fill).toEqual(linearGradient(90, '#111111', '#eeeeee'));
  });

  it('should keep the title when round tripping', () => {
    // Act
    const { graph } = fromDrawio(toDrawio(createGraph()));

    // Assert
    expect(graph.title).toBe('发布流程');
  });

  it('should read stencil shapes from a file made in draw.io', () => {
    // Arrange
    const xml = `<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="a" value="&lt;div&gt;Is it&lt;br&gt;ready?&lt;/div&gt;" style="strokeWidth=2;html=1;shape=mxgraph.flowchart.decision;whiteSpace=wrap;" vertex="1" parent="1">
        <mxGeometry x="100" y="40" width="100" height="60" as="geometry"/>
      </mxCell></root></mxGraphModel></diagram></mxfile>`;

    // Act
    const { graph } = fromDrawio(xml);

    // Assert
    expect([graph.nodes[0].shape, graph.nodes[0].label, graph.nodes[0].x]).toEqual(['decision', 'Is it\nready?', 150]);
  });

  it('should explain how to save again when the diagram is compressed', () => {
    // Arrange
    const xml = '<mxfile><diagram id="x">7VhNj9owEP01OUYiDqRwBBa2h1aqxKFqb17HJNY6MTJmA/v1HSc2</diagram></mxfile>';

    // Act & Assert
    expect(() => fromDrawio(xml)).toThrow(/Compressed/);
  });
});
