import { onLocaleChange, setupI18n, type Locale, type Messages } from '../shared/i18n';

const messages: Messages = {
  zh: {
    navHome: '首页',
    navDocs: '文档',
    navExamples: '示例',
    navEditor: '在线编辑器',
    title: '示例',
    intro: '每个示例覆盖一类使用场景，可在浏览器中直接交互。',
  },
  en: {
    navHome: 'Home',
    navDocs: 'Docs',
    navExamples: 'Examples',
    navEditor: 'Live editor',
    title: 'Examples',
    intro: 'Each example covers one kind of use case and is interactive in the browser.',
  },
};

interface Example {
  /** Page under the built site's `cases/` directory. */
  page: string;
  zh: { title: string; desc: string };
  en: { title: string; desc: string };
}

/** Curated, user-facing subset of the case pages. */
const examples: Example[] = [
  {
    page: '01-static-display',
    zh: { title: '只读展示', desc: '不用编辑器，buildFlowOption 直接渲染，自动布局并居中。' },
    en: { title: 'Read-only display', desc: 'Render with buildFlowOption, no editor; automatic layout, centered.' },
  },
  {
    page: '04-blank-editor',
    zh: { title: '从空白画布编辑', desc: '添加节点、拖线、框选、复制粘贴、对齐线、撤销重做。' },
    en: { title: 'Edit from a blank canvas', desc: 'Add nodes, draw edges, box-select, copy/paste, alignment guides, undo/redo.' },
  },
  {
    page: '05-status-monitor',
    zh: { title: '运行状态监控', desc: '只读模式下按脚本推进流水线状态，含并行、失败与重试。' },
    en: { title: 'Run-status monitor', desc: 'Drive a pipeline through states in read-only mode, with parallelism, failure and retry.' },
  },
  {
    page: '09-themes',
    zh: { title: '主题', desc: 'light / dark / macarons / tech-blue 四套内置主题对比。' },
    en: { title: 'Themes', desc: 'Compare the light, dark, macarons and tech-blue built-in themes.' },
  },
  {
    page: '12-style-gallery',
    zh: { title: '样式配置大全', desc: '11 种形状、8 种箭头、3 种连线方式与自定义主题。' },
    en: { title: 'Style gallery', desc: '11 shapes, 8 arrow types, 3 edge styles and custom themes.' },
  },
  {
    page: '13-swimlane-gallery',
    zh: { title: '泳道场景集', desc: '请假、订单、CI/CD 等 6 个泳道场景，可切换方向与主题。' },
    en: { title: 'Swimlane gallery', desc: 'Six swimlane scenarios (leave, orders, CI/CD, …) with direction and theme switches.' },
  },
  {
    page: '07-large-graph',
    zh: { title: '大图性能', desc: '50 到 1000 个节点，记录布局与渲染耗时，感受交互帧率。' },
    en: { title: 'Large graphs', desc: '50 to 1000 nodes; measures layout and render time and shows the interaction frame rate.' },
  },
  {
    page: '16-export-interop',
    zh: { title: '导出与互通', desc: '导出 PNG / SVG，与 Mermaid、draw.io 互相导入导出。' },
    en: { title: 'Export and interop', desc: 'Export PNG/SVG and import/export Mermaid and draw.io.' },
  },
];

function buildHref(page: string, locale: Locale): string {
  return `../test/cases/${page}.html?lang=${locale}`;
}

const grid = document.getElementById('examples');
if (grid) {
  examples.forEach((example) => {
    const card = document.createElement('a');
    card.className = 'card';
    const title = document.createElement('p');
    title.className = 'card__title';
    const desc = document.createElement('p');
    desc.className = 'card__desc';
    card.append(title, desc);
    grid.append(card);
    onLocaleChange((locale) => {
      card.href = buildHref(example.page, locale);
      title.textContent = example[locale].title;
      desc.textContent = example[locale].desc;
    });
  });
}

setupI18n(messages);
