import { setupI18n, onLocaleChange, type Messages } from './shared/i18n';

const messages: Messages = {
  zh: {
    navHome: '首页',
    navDocs: '文档',
    navExamples: '示例',
    navEditor: '在线编辑器',
    heroTagline: '基于 ECharts 6 自定义系列的可编辑流程图与泳道图扩展，原生 TypeScript，Canvas 与 SVG 双渲染。',
    ctaEditor: '打开在线编辑器',
    ctaDocs: '阅读文档',
  },
  en: {
    navHome: 'Home',
    navDocs: 'Docs',
    navExamples: 'Examples',
    navEditor: 'Live editor',
    heroTagline: 'An editable flowchart and swimlane extension for ECharts 6, built on custom series. Native TypeScript, Canvas and SVG.',
    ctaEditor: 'Open the live editor',
    ctaDocs: 'Read the docs',
  },
};

interface Feature {
  key: string;
  href?: string;
  zh: { title: string; desc: string };
  en: { title: string; desc: string };
}

const features: Feature[] = [
  {
    key: 'editor',
    href: './editor.html',
    zh: { title: '完整编辑器', desc: '拖拽、连线、多选框选、复制粘贴、对齐线、撤销重做，每项能力都可开关。' },
    en: { title: 'Full editor', desc: 'Drag, connect, multi- and box-select, copy/paste, alignment guides, undo/redo — every capability can be toggled.' },
  },
  {
    key: 'shapes',
    href: './examples/',
    zh: { title: '形状与主题', desc: '11 种节点形状、8 种箭头、避障正交路由，8 套内置主题与自定义主题。' },
    en: { title: 'Shapes and themes', desc: '11 node shapes, 8 arrow types, obstacle-avoiding routing, 8 built-in themes plus custom themes.' },
  },
  {
    key: 'swimlane',
    href: './examples/',
    zh: { title: '泳道图', desc: '行或列泳道、标题栏、每条泳道独立配色，支持自动布局与紧凑模式。' },
    en: { title: 'Swimlanes', desc: 'Lanes as rows or columns with a title bar, per-lane colors, automatic layout and a compact mode.' },
  },
  {
    key: 'perf',
    href: './docs/',
    zh: { title: '大图性能', desc: '平移缩放移动已画好的图形，超过阈值自动批量绘制，上千节点仍然流畅。' },
    en: { title: 'Large graphs', desc: 'Pan and zoom move the drawn frame; past a threshold the graph is batched, so thousands of nodes stay smooth.' },
  },
  {
    key: 'interop',
    href: './docs/',
    zh: { title: '导出与互通', desc: '导出整图 PNG / SVG，与 Mermaid、draw.io 互相导入导出。' },
    en: { title: 'Export and interop', desc: 'Export the whole graph as PNG or SVG, and import/export Mermaid and draw.io.' },
  },
  {
    key: 'install',
    href: './docs/',
    zh: { title: '即装即用', desc: 'echarts.use(flowExtension) 注册自定义系列，或用 FlowEditor 直接获得交互编辑。' },
    en: { title: 'Drop-in', desc: 'Register the custom series with echarts.use(flowExtension), or use FlowEditor for interactive editing.' },
  },
];

const grid = document.getElementById('features');
if (grid) {
  features.forEach((feature) => {
    const card = document.createElement(feature.href ? 'a' : 'div');
    card.className = 'card';
    if (feature.href && card instanceof HTMLAnchorElement) {
      card.href = feature.href;
    }
    const title = document.createElement('p');
    title.className = 'card__title';
    const desc = document.createElement('p');
    desc.className = 'card__desc';
    card.append(title, desc);
    grid.append(card);
    onLocaleChange((locale) => {
      title.textContent = feature[locale].title;
      desc.textContent = feature[locale].desc;
    });
  });
}

setupI18n(messages);
