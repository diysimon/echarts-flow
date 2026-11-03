/**
 * Shared site chrome: the top navigation and the footer, rendered into
 * `<header data-site-header>` and `<footer data-site-footer>` placeholders.
 * Both are filled from one 9-language dictionary ({@link LAYOUT_MESSAGES}),
 * merged with each page's own messages by {@link mergeMessages}.
 */

import { setupI18n, mergeMessages, type Locale, type Messages } from './i18n';

export type SiteSection = 'home' | 'docs' | 'examples' | 'editor' | 'cases';

interface Section {
  key: string;
  href: string;
}

/** `prefix` is the relative base from the page to the site root ('', '../', …). */
function buildSections(prefix: string): Section[] {
  return [
    { key: 'navHome', href: `${prefix}` },
    { key: 'navDocs', href: `${prefix}docs/` },
    { key: 'navExamples', href: `${prefix}examples/` },
    { key: 'navCases', href: `${prefix}test/cases/` },
    { key: 'navEditor', href: `${prefix}editor.html` },
  ];
}

/** Words shared by the nav and the footer, in every site language. */
export const LAYOUT_MESSAGES: Messages = {
  zh: {
    navHome: '首页',
    navDocs: '文档',
    navExamples: '示例',
    navCases: '用例',
    navEditor: '在线编辑器',
    footerTagline: '基于 ECharts 6 自定义系列的可编辑流程图与泳道图扩展。',
    footerProduct: '产品',
    footerResources: '资源',
    footerLicense: '许可证',
    footerChangelog: '更新日志',
    footerIssues: '问题反馈',
    footerNpm: 'npm 包',
    footerPublished: '本页由 GitHub Pages 托管，内容为 Apache-2.0 许可的开源项目文档。',
  },
  en: {
    navHome: 'Home',
    navDocs: 'Docs',
    navExamples: 'Examples',
    navCases: 'Cases',
    navEditor: 'Live editor',
    footerTagline: 'An editable flowchart and swimlane extension for ECharts 6, built on custom series.',
    footerProduct: 'Product',
    footerResources: 'Resources',
    footerLicense: 'License',
    footerChangelog: 'Changelog',
    footerIssues: 'Issue tracker',
    footerNpm: 'npm package',
    footerPublished: 'Hosted on GitHub Pages. Open-source documentation under the Apache-2.0 license.',
  },
  es: {
    navHome: 'Inicio',
    navDocs: 'Documentación',
    navExamples: 'Ejemplos',
    navCases: 'Casos',
    navEditor: 'Editor en vivo',
    footerTagline: 'Extensión editable de diagramas de flujo y carriles para ECharts 6, basada en series personalizadas.',
    footerProduct: 'Producto',
    footerResources: 'Recursos',
    footerLicense: 'Licencia',
    footerChangelog: 'Registro de cambios',
    footerIssues: 'Informar de problemas',
    footerNpm: 'Paquete npm',
    footerPublished: 'Alojado en GitHub Pages. Documentación de código abierto bajo la licencia Apache-2.0.',
  },
  fr: {
    navHome: 'Accueil',
    navDocs: 'Documentation',
    navExamples: 'Exemples',
    navCases: 'Cas d’utilisation',
    navEditor: 'Éditeur en direct',
    footerTagline: 'Extension éditable d’organigrammes et de couloirs (swimlanes) pour ECharts 6, basée sur des séries personnalisées.',
    footerProduct: 'Produit',
    footerResources: 'Ressources',
    footerLicense: 'Licence',
    footerChangelog: 'Journal des modifications',
    footerIssues: 'Signaler un problème',
    footerNpm: 'Paquet npm',
    footerPublished: 'Hébergé sur GitHub Pages. Documentation open source sous licence Apache-2.0.',
  },
  de: {
    navHome: 'Startseite',
    navDocs: 'Dokumentation',
    navExamples: 'Beispiele',
    navCases: 'Anwendungsfälle',
    navEditor: 'Live-Editor',
    footerTagline: 'Bearbeitbare Flussdiagramm- und Swimlane-Erweiterung für ECharts 6 auf Basis eigener Serien.',
    footerProduct: 'Produkt',
    footerResources: 'Ressourcen',
    footerLicense: 'Lizenz',
    footerChangelog: 'Änderungsprotokoll',
    footerIssues: 'Problem melden',
    footerNpm: 'npm-Paket',
    footerPublished: 'Gehostet auf GitHub Pages. Open-Source-Dokumentation unter der Apache-2.0-Lizenz.',
  },
  pt: {
    navHome: 'Início',
    navDocs: 'Documentação',
    navExamples: 'Exemplos',
    navCases: 'Casos',
    navEditor: 'Editor ao vivo',
    footerTagline: 'Extensão editável de fluxogramas e raias (swimlanes) para ECharts 6, baseada em séries personalizadas.',
    footerProduct: 'Produto',
    footerResources: 'Recursos',
    footerLicense: 'Licença',
    footerChangelog: 'Registro de alterações',
    footerIssues: 'Reportar problema',
    footerNpm: 'Pacote npm',
    footerPublished: 'Hospedado no GitHub Pages. Documentação de código aberto sob licença Apache-2.0.',
  },
  ja: {
    navHome: 'ホーム',
    navDocs: 'ドキュメント',
    navExamples: 'サンプル',
    navCases: 'ユースケース',
    navEditor: 'ライブエディタ',
    footerTagline: 'ECharts 6 のカスタムシリーズに基づく、編集可能なフローチャート・スイムレーン拡張。',
    footerProduct: '製品',
    footerResources: 'リソース',
    footerLicense: 'ライセンス',
    footerChangelog: '変更履歴',
    footerIssues: '問題を報告',
    footerNpm: 'npm パッケージ',
    footerPublished: 'GitHub Pages でホスト。Apache-2.0 ライセンスのオープンソースドキュメント。',
  },
  ar: {
    navHome: 'الرئيسية',
    navDocs: 'التوثيق',
    navExamples: 'أمثلة',
    navCases: 'الحالات',
    navEditor: 'المحرر المباشر',
    footerTagline: 'إضافة قابلة للتحرير للمخططات الانسيابية والممرات لمكتبة ECharts 6، مبنية على سلاسل مخصصة.',
    footerProduct: 'المنتج',
    footerResources: 'الموارد',
    footerLicense: 'الترخيص',
    footerChangelog: 'سجل التغييرات',
    footerIssues: 'الإبلاغ عن مشكلة',
    footerNpm: 'حزمة npm',
    footerPublished: 'مستضاف على GitHub Pages. توثيق مفتوح المصدر بموجب ترخيص Apache-2.0.',
  },
  it: {
    navHome: 'Home',
    navDocs: 'Documentazione',
    navExamples: 'Esempi',
    navCases: 'Casi d’uso',
    navEditor: 'Editor dal vivo',
    footerTagline: 'Estensione modificabile per diagrammi di flusso e corsie (swimlane) per ECharts 6, basata su serie personalizzate.',
    footerProduct: 'Prodotto',
    footerResources: 'Risorse',
    footerLicense: 'Licenza',
    footerChangelog: 'Registro modifiche',
    footerIssues: 'Segnala un problema',
    footerNpm: 'Pacchetto npm',
    footerPublished: 'Ospitato su GitHub Pages. Documentazione open source con licenza Apache-2.0.',
  },
};

/**
 * Renders the nav into `[data-site-header]` and the footer into
 * `[data-site-footer]`, then starts i18n with the merged dictionaries.
 * Returns the resolved locale.
 */
export function setupLayout(active: SiteSection, prefix: string, pageMessages: Messages, switchSelector = '[data-lang-switch]'): Locale {
  const messages = mergeMessages(LAYOUT_MESSAGES, pageMessages);
  const header = document.querySelector('[data-site-header]');
  if (header) {
    const sections = buildSections(prefix);
    const links = sections
      .map((section) => {
        const isActive = section.key.replace('nav', '').toLowerCase() === active;
        const cls = isActive ? 'site-nav__link site-nav__link--active' : 'site-nav__link';
        return `<a class="${cls}" href="${section.href}" data-i18n="${section.key}">${section.key}</a>`;
      })
      .join('');
    header.innerHTML = `<nav class="site-nav">
  <a class="site-nav__brand" href="${prefix}">echarts-flow</a>
  <div class="site-nav__links">${links}<a class="site-nav__link" href="https://github.com/diysimon/echarts-flow">GitHub</a></div>
  <span data-lang-switch></span>
</nav>`;
  }
  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.innerHTML = `<footer class="site-footer">
  <div class="site-footer__inner">
    <div class="site-footer__brand">
      <span class="site-footer__logo">echarts-flow</span>
      <p class="site-footer__tagline" data-i18n="footerTagline">footerTagline</p>
      <p class="site-footer__published" data-i18n="footerPublished">footerPublished</p>
    </div>
    <div class="site-footer__columns">
      <div class="site-footer__column">
        <h3 data-i18n="footerProduct">footerProduct</h3>
        <a href="${prefix}docs/" data-i18n="navDocs">navDocs</a>
        <a href="${prefix}examples/" data-i18n="navExamples">navExamples</a>
        <a href="${prefix}editor.html" data-i18n="navEditor">navEditor</a>
      </div>
      <div class="site-footer__column">
        <h3 data-i18n="footerResources">footerResources</h3>
        <a href="https://github.com/diysimon/echarts-flow">GitHub</a>
        <a href="https://www.npmjs.com/package/echarts-flow" data-i18n="footerNpm">footerNpm</a>
        <a href="https://github.com/diysimon/echarts-flow/blob/main/CHANGELOG.md" data-i18n="footerChangelog">footerChangelog</a>
        <a href="https://github.com/diysimon/echarts-flow/issues" data-i18n="footerIssues">footerIssues</a>
      </div>
      <div class="site-footer__column">
        <h3 data-i18n="footerLicense">footerLicense</h3>
        <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache-2.0</a>
        <span>© 2026 diysimon</span>
      </div>
    </div>
  </div>
</footer>`;
  }
  return setupI18n(messages, switchSelector);
}