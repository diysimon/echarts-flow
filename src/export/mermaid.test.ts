import { fromMermaid, toMermaid } from './mermaid';
import type { FlowGraph } from '../types';

function createGraph(): FlowGraph {
  return {
    nodes: [
      { id: 'start', label: '开始', shape: 'start' },
      { id: 'check', label: '金额 > 1000?', shape: 'decision' },
      { id: 'doc', label: '报告', shape: 'document' },
      { id: 'end', label: '结束', shape: 'end' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'check' },
      { id: 'e2', source: 'check', target: 'doc', label: '是' },
      { id: 'e3', source: 'doc', target: 'end', style: { lineDash: [4, 4] } },
    ],
  };
}

describe('toMermaid', () => {
  it('should write LR as the flowchart direction', () => {
    // Act
    const text = toMermaid(createGraph(), { direction: 'LR' });

    // Assert
    expect(text.split('\n')[0]).toBe('flowchart LR');
  });

  it('should write a decision with curly brackets', () => {
    // Act
    const text = toMermaid(createGraph());

    // Assert
    expect(text).toContain('check{"金额 > 1000?"}');
  });

  it('should rename an id that Mermaid reserves', () => {
    // Act
    const text = toMermaid(createGraph());

    // Assert
    expect(text).toContain('end_(["结束"])');
  });

  it('should write a labeled edge with the label between pipes', () => {
    // Act
    const text = toMermaid(createGraph());

    // Assert
    expect(text).toContain('check -->|"是"| doc');
  });

  it('should write lanes as subgraphs', () => {
    // Arrange
    const graph: FlowGraph = { ...createGraph(), lanes: [{ id: 'ops', label: '运维' }] };

    // Act
    const text = toMermaid(graph);

    // Assert
    expect(text).toContain('subgraph lane_ops["运维"]');
  });
});

describe('fromMermaid', () => {
  it('should read the direction from the header', () => {
    // Act
    const { direction } = fromMermaid('graph RL\n  a --> b');

    // Assert
    expect(direction).toBe('LR');
  });

  it('should read every node of a chain', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a --> b --> c');

    // Assert
    expect(graph.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c']);
  });

  it.each([
    ['a{判断}', 'decision'],
    ['a((圆))', 'circle'],
    ['a[(库)]', 'database'],
    ['a[/输入/]', 'io'],
    ['a{{准备}}', 'hexagon'],
    ['a[[子流程]]', 'subprocess'],
    ['a@{ shape: doc, label: "文档" }', 'document'],
  ])('should read %s as a %s node', (definition, shape) => {
    // Act
    const { graph } = fromMermaid(`flowchart TD\n  ${definition}`);

    // Assert
    expect(graph.nodes[0].shape).toBe(shape);
  });

  it('should read a pipe label on an edge', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a -->|通过| b');

    // Assert
    expect(graph.edges[0].label).toBe('通过');
  });

  it('should read an inline label on an edge', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a -- 不通过 --> b');

    // Assert
    expect(graph.edges[0].label).toBe('不通过');
  });

  it('should drop the target arrow when the link is an open line', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a --- b');

    // Assert
    expect(graph.edges[0].style?.targetArrow).toBe('none');
  });

  it('should dash a dotted link', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a -.-> b');

    // Assert
    expect(graph.edges[0].style?.lineDash).toEqual([4, 4]);
  });

  it('should connect every pair when nodes are joined with &', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a & b --> c & d');

    // Assert
    expect(graph.edges).toHaveLength(4);
  });

  it('should put nodes declared inside a subgraph into that lane', () => {
    // Act
    const { graph } = fromMermaid('flowchart LR\n  subgraph ops["运维"]\n    a\n  end\n  b --> a');

    // Assert
    expect(graph.nodes.find((node) => node.id === 'a')?.laneId).toBe('ops');
  });

  it('should read a stadium node with only incoming edges as an end node', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a([开始]) --> b([结束])');

    // Assert
    expect(graph.nodes.map((node) => node.shape)).toEqual(['start', 'end']);
  });

  it('should skip style statements', () => {
    // Act
    const { graph } = fromMermaid('flowchart TD\n  a --> b\n  style a fill:#f00\n  classDef x fill:#0f0');

    // Assert
    expect(graph.nodes).toHaveLength(2);
  });

  it('should read the title from the frontmatter', () => {
    // Act
    const { graph } = fromMermaid('---\ntitle: 审批流程\n---\nflowchart TD\n  a --> b');

    // Assert
    expect(graph.title).toBe('审批流程');
  });

  it('should keep shapes, labels and edges when round tripping', () => {
    // Arrange
    const original = createGraph();

    // Act
    const { graph } = fromMermaid(toMermaid(original));

    // Assert
    const summary = (input: FlowGraph) => [input.nodes.map((node) => `${node.shape}:${node.label}`), input.edges.map((edge) => edge.label ?? '')];
    expect(summary(graph)).toEqual(summary(original));
  });
});
