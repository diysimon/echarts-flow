import { FlowEditor, fromDrawio, fromMermaid, type FlowDirection, type FlowGraph, type ImportedFlow } from '../../src/index';
import { bindButton, getElement, initCaseChart } from './shared/caseUtils';

type TextFormat = 'mermaid' | 'drawio';

const SAMPLE_MERMAID = `---
title: 报销审批
---
flowchart LR
  subgraph lane_staff["员工"]
    submit(["提交报销"])
    fix["补充材料"]
  end
  subgraph lane_manager["主管"]
    review{"金额超过 5000?"}
    approve["主管审批"]
  end
  subgraph lane_finance["财务"]
    pay[("财务打款")]
    done(["结束"])
  end
  submit --> review
  review -->|"是"| approve
  review -->|"否"| pay
  approve -.->|"退回"| fix
  fix --> review
  approve --> pay
  pay --> done
`;

const FILE_EXTENSIONS: Record<TextFormat, string> = { mermaid: 'mmd', drawio: 'drawio' };
const MIME_TYPES: Record<TextFormat, string> = { mermaid: 'text/plain', drawio: 'application/xml' };

const container = getElement<HTMLElement>('#chart');
const textarea = getElement<HTMLTextAreaElement>('#text');
const statusLabel = getElement<HTMLElement>('#status');
const formatSelect = getElement<HTMLSelectElement>('#format-select');
const transparentToggle = getElement<HTMLInputElement>('#transparent-toggle');
const preview = getElement<HTMLImageElement>('#preview');
const chart = initCaseChart(container);

let editor = createEditor(fromMermaid(SAMPLE_MERMAID));

/** The direction is fixed per editor, so an import with another direction gets a new editor. */
function createEditor({ graph, direction }: ImportedFlow): FlowEditor {
  return new FlowEditor(chart, { graph, direction, theme: 'aurora' });
}

function getFormat(): TextFormat {
  return formatSelect.value === 'drawio' ? 'drawio' : 'mermaid';
}

function downloadUrl(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
}

function downloadText(text: string, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  downloadUrl(url, fileName);
  URL.revokeObjectURL(url);
}

function getImageOptions() {
  return transparentToggle.checked ? { backgroundColor: 'transparent' } : {};
}

function exportText(): string {
  return getFormat() === 'drawio' ? editor.exportDrawio() : editor.exportMermaid();
}

/** Picks the parser from the content, so a draw.io file opened with Mermaid selected still works. */
function parseText(text: string): ImportedFlow {
  const isXml = text.trimStart().startsWith('<');
  formatSelect.value = isXml ? 'drawio' : 'mermaid';
  return isXml ? fromDrawio(text) : fromMermaid(text);
}

function importText(text: string): void {
  try {
    const imported = parseText(text);
    if (imported.graph.nodes.length === 0) {
      throw new Error('没有读到节点');
    }
    replaceGraph(imported.graph, imported.direction);
    statusLabel.textContent = `导入成功：${imported.graph.nodes.length} 个节点，${imported.graph.edges.length} 条连线，方向 ${imported.direction}`;
  } catch (error) {
    console.error('Failed to import flow:', error);
    statusLabel.textContent = `导入失败：${(error as Error).message}`;
  }
}

function replaceGraph(graph: FlowGraph, direction: FlowDirection): void {
  editor.dispose();
  chart.clear();
  editor = createEditor({ graph, direction });
}

bindButton('#png-button', () => {
  const url = editor.exportPng(getImageOptions());
  preview.src = url;
  downloadUrl(url, 'flow.png');
});
bindButton('#svg-button', () => {
  downloadText(editor.exportSvg(getImageOptions()), 'flow.svg', 'image/svg+xml');
});
bindButton('#export-button', () => {
  textarea.value = exportText();
  statusLabel.textContent = '';
});
bindButton('#import-button', () => importText(textarea.value));
bindButton('#download-button', () => {
  const format = getFormat();
  downloadText(exportText(), `flow.${FILE_EXTENSIONS[format]}`, MIME_TYPES[format]);
});
getElement<HTMLInputElement>('#file-input').addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    textarea.value = await file.text();
    importText(textarea.value);
  }
  input.value = '';
});
formatSelect.addEventListener('change', () => {
  textarea.value = exportText();
});
window.addEventListener('resize', () => chart.resize());
textarea.value = SAMPLE_MERMAID;
