import { init, use } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { buildFlowOption, calcFitViewport, flowExtension, watchDevicePixelRatio, type FlowGraph, type FlowThemeName } from './src/index';
import { setupLayout } from './shared/layout';
import { initTheme, currentThemeChoice, onThemeChange, resolvedTheme } from './shared/theme';
import { onLocaleChange, type Locale, type Messages } from './shared/i18n';

use([CustomChart, CanvasRenderer, flowExtension]);
const messages: Messages = {
  zh: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: '基于 ECharts 6 自定义系列的可编辑流程图与泳道图扩展，原生 TypeScript，Canvas 与 SVG 双渲染。',
    ctaEditor: '打开在线编辑器',
    ctaDocs: '阅读文档',
    heroChartNote: '真实渲染：本图由 buildFlowOption 绘制，主题跟随页面明暗模式。',
  },
  en: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'An editable flowchart and swimlane extension for ECharts 6, built on custom series. Native TypeScript, Canvas and SVG.',
    ctaEditor: 'Open the live editor',
    ctaDocs: 'Read the docs',
    heroChartNote: 'Rendered live by buildFlowOption; the theme follows the page light/dark mode.',
  },
  es: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'Una extensión editable de diagramas de flujo y carriles para ECharts 6, basada en series personalizadas. TypeScript nativo, Canvas y SVG.',
    ctaEditor: 'Abrir el editor en vivo',
    ctaDocs: 'Leer la documentación',
    heroChartNote: 'Renderizado en vivo con buildFlowOption; el tema sigue el modo claro/oscuro de la página.',
  },
  fr: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'Une extension éditable d’organigrammes et de couloirs (swimlanes) pour ECharts 6, basée sur des séries personnalisées. TypeScript natif, Canvas et SVG.',
    ctaEditor: 'Ouvrir l’éditeur en direct',
    ctaDocs: 'Lire la documentation',
    heroChartNote: 'Rendu en direct par buildFlowOption ; le thème suit le mode clair/sombre de la page.',
  },
  de: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'Eine bearbeitbare Flussdiagramm- und Swimlane-Erweiterung für ECharts 6 auf Basis eigener Serien. Natives TypeScript, Canvas und SVG.',
    ctaEditor: 'Live-Editor öffnen',
    ctaDocs: 'Dokumentation lesen',
    heroChartNote: 'Live gerendert mit buildFlowOption; das Thema folgt dem Hell-/Dunkelmodus der Seite.',
  },
  pt: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'Uma extensão editável de fluxogramas e raias (swimlanes) para ECharts 6, baseada em séries personalizadas. TypeScript nativo, Canvas e SVG.',
    ctaEditor: 'Abrir o editor ao vivo',
    ctaDocs: 'Ler a documentação',
    heroChartNote: 'Renderizado ao vivo com buildFlowOption; o tema segue o modo claro/escuro da página.',
  },
  ja: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'ECharts 6 のカスタムシリーズに基づく、編集可能なフローチャート・スイムレーン拡張。ネイティブ TypeScript、Canvas と SVG に対応。',
    ctaEditor: 'ライブエディタを開く',
    ctaDocs: 'ドキュメントを読む',
    heroChartNote: 'buildFlowOption によるライブ描画。テーマはページの明暗モードに追従します。',
  },
  ar: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'إضافة قابلة للتحرير للمخططات الانسيابية والممرات لمكتبة ECharts 6، مبنية على سلاسل مخصصة. TypeScript أصلي مع Canvas و SVG.',
    ctaEditor: 'افتح المحرر المباشر',
    ctaDocs: 'اقرأ التوثيق',
    heroChartNote: 'رسم حي عبر buildFlowOption؛ تتبع السمة وضع الصفحة الفاتح/الداكن.',
  },
  it: {
    heroBadge: 'v0.1.0 · Apache-2.0',
    heroTagline: 'Un’estensione modificabile per diagrammi di flusso e corsie (swimlane) per ECharts 6, basata su serie personalizzate. TypeScript nativo, Canvas e SVG.',
    ctaEditor: 'Apri l’editor dal vivo',
    ctaDocs: 'Leggi la documentazione',
    heroChartNote: 'Rendering dal vivo con buildFlowOption; il tema segue la modalità chiaro/scuro della pagina.',
  },
};

interface Feature {
  key: string;
  href?: string;
  text: Record<Locale, { title: string; desc: string }>;
}

const features: Feature[] = [
  {
    key: 'editor',
    href: './editor.html',
    text: {
      zh: { title: '完整编辑器', desc: '拖拽、连线、多选框选、复制粘贴、对齐线、撤销重做，每项能力都可开关。' },
      en: { title: 'Full editor', desc: 'Drag, connect, multi- and box-select, copy/paste, alignment guides, undo/redo — every capability can be toggled.' },
      es: { title: 'Editor completo', desc: 'Arrastrar, conectar, selección múltiple y por caja, copiar/pegar, guías de alineación y deshacer/rehacer; cada función se puede activar.' },
      fr: { title: 'Éditeur complet', desc: 'Glisser, connecter, sélection multiple et par zone, copier/coller, guides d’alignement, annuler/rétablir — chaque capacité se règle.' },
      de: { title: 'Vollständiger Editor', desc: 'Ziehen, Verbinden, Mehrfach- und Rahmenauswahl, Kopieren/Einfügen, Ausrichtungslinien, Rückgängig/Wiederholen — alles zuschaltbar.' },
      pt: { title: 'Editor completo', desc: 'Arrastar, conectar, seleção múltipla e por caixa, copiar/colar, guias de alinhamento, desfazer/refazer — cada recurso pode ser ativado.' },
      ja: { title: 'フルエディタ', desc: 'ドラッグ、接続、複数・矩形選択、コピー&ペースト、整列ガイド、元に戻す/やり直し。すべての機能を個別に設定可能。' },
      ar: { title: 'محرر كامل', desc: 'سحب، توصيل، تحديد متعدد وصندوقي، نسخ/لصق، أدلة محاذاة، تراجع/إعادة — كل قدرة قابلة للتفعيل.' },
      it: { title: 'Editor completo', desc: 'Trascina, collega, selezione multipla e a riquadro, copia/incolla, guide di allineamento, annulla/ripeti — ogni capacità è attivabile.' },
    },
  },
  {
    key: 'shapes',
    href: './examples/',
    text: {
      zh: { title: '形状与主题', desc: '11 种节点形状、8 种箭头、避障正交路由，8 套内置主题与自定义主题。' },
      en: { title: 'Shapes and themes', desc: '11 node shapes, 8 arrow types, obstacle-avoiding routing, 8 built-in themes plus custom themes.' },
      es: { title: 'Formas y temas', desc: '11 formas de nodo, 8 tipos de flecha, enrutado ortogonal sin obstáculos, 8 temas integrados y temas personalizados.' },
      fr: { title: 'Formes et thèmes', desc: '11 formes de nœuds, 8 types de flèches, routage orthogonal sans obstacle, 8 thèmes intégrés et thèmes personnalisés.' },
      de: { title: 'Formen und Themes', desc: '11 Knotenformen, 8 Pfeiltypen, hindernisfreies orthogonales Routing, 8 eingebaute Themes plus eigene Themes.' },
      pt: { title: 'Formas e temas', desc: '11 formas de nós, 8 tipos de setas, roteamento ortogonal sem obstáculos, 8 temas integrados e temas personalizados.' },
      ja: { title: '形状とテーマ', desc: '11 種類のノード形状、8 種類の矢印、障害物回避の直交ルーティング、8 つの組み込みテーマとカスタムテーマ。' },
      ar: { title: 'الأشكال والسمات', desc: '11 شكلاً للعقد، 8 أنواع أسهم، توجيه متعامد يتجنب العوائق، و8 سمات مدمجة مع سمات مخصصة.' },
      it: { title: 'Forme e temi', desc: '11 forme di nodo, 8 tipi di freccia, routing ortogonale senza ostacoli, 8 temi integrati e temi personalizzati.' },
    },
  },
  {
    key: 'swimlane',
    href: './examples/',
    text: {
      zh: { title: '泳道图', desc: '行或列泳道、标题栏、每条泳道独立配色，支持自动布局与紧凑模式。' },
      en: { title: 'Swimlanes', desc: 'Lanes as rows or columns with a title bar, per-lane colors, automatic layout and a compact mode.' },
      es: { title: 'Carriles', desc: 'Carriles en filas o columnas con barra de título, colores por carril, diseño automático y modo compacto.' },
      fr: { title: 'Couloirs (swimlanes)', desc: 'Couloirs en lignes ou colonnes avec barre de titre, couleurs par couloir, disposition automatique et mode compact.' },
      de: { title: 'Swimlanes', desc: 'Lanes als Zeilen oder Spalten mit Titelleiste, Farben pro Lane, automatisches Layout und Kompaktmodus.' },
      pt: { title: 'Raias (swimlanes)', desc: 'Raias em linhas ou colunas com barra de título, cores por raia, layout automático e modo compacto.' },
      ja: { title: 'スイムレーン', desc: '行・列のレーン、タイトルバー、レーンごとの配色。自動レイアウトとコンパクトモードに対応。' },
      ar: { title: 'الممرات', desc: 'ممرات كصفوف أو أعمدة مع شريط عنوان، ألوان لكل ممر، تخطيط تلقائي ووضع مضغوط.' },
      it: { title: 'Corsie (swimlane)', desc: 'Corsie come righe o colonne con barra del titolo, colori per corsia, layout automatico e modalità compatta.' },
    },
  },
  {
    key: 'perf',
    href: './docs/',
    text: {
      zh: { title: '大图性能', desc: '平移缩放移动已画好的图形，超过阈值自动批量绘制，上千节点仍然流畅。' },
      en: { title: 'Large graphs', desc: 'Pan and zoom move the drawn frame; past a threshold the graph is batched, so thousands of nodes stay smooth.' },
      es: { title: 'Grafos grandes', desc: 'Desplazar y ampliar mueve el lienzo ya dibujado; pasado un umbral se agrupa el grafo y miles de nodos siguen fluidos.' },
      fr: { title: 'Grands graphes', desc: 'Le déplacement et le zoom déplacent le dessin déjà tracé; au-delà d’un seuil le graphe est regroupé, des milliers de nœuds restent fluides.' },
      de: { title: 'Große Graphen', desc: 'Verschieben und Zoomen bewegen das fertige Bild; über einer Schwelle wird der Graph gebündelt, Tausende Knoten bleiben flüssig.' },
      pt: { title: 'Grafos grandes', desc: 'Pan e zoom movem o desenho já feito; acima de um limite o grafo é agrupado e milhares de nós continuam suaves.' },
      ja: { title: '大規模グラフ', desc: 'パン・ズームは描画済みの図形を移動させるだけ。しきい値を超えると一括描画になり、数千ノードでも滑らか。' },
      ar: { title: 'رسوم كبيرة', desc: 'التحريك والتكبير ينقلان الرسم المنجز؛ وتجاوز الحد يجمع الرسم دفعة واحدة، فتبقى آلاف العقد سلسة.' },
      it: { title: 'Grafi grandi', desc: 'Pan e zoom spostano il disegno già tracciato; oltre una soglia il grafo viene raggruppato e migliaia di nodi restano fluidi.' },
    },
  },
  {
    key: 'interop',
    href: './docs/',
    text: {
      zh: { title: '导出与互通', desc: '导出整图 PNG / SVG，与 Mermaid、draw.io 互相导入导出。' },
      en: { title: 'Export and interop', desc: 'Export the whole graph as PNG or SVG, and import/export Mermaid and draw.io.' },
      es: { title: 'Exportación e interoperabilidad', desc: 'Exporta el grafo completo como PNG o SVG e importa/exporta Mermaid y draw.io.' },
      fr: { title: 'Export et interopérabilité', desc: 'Exportez le graphe complet en PNG ou SVG, et importez/exportez Mermaid et draw.io.' },
      de: { title: 'Export und Interop', desc: 'Exportiere den ganzen Graphen als PNG oder SVG; Mermaid und draw.io importieren/exportieren.' },
      pt: { title: 'Exportação e interoperabilidade', desc: 'Exporte o grafo inteiro como PNG ou SVG e importe/exporte Mermaid e draw.io.' },
      ja: { title: 'エクスポートと相互運用', desc: 'グラフ全体を PNG / SVG でエクスポート。Mermaid や draw.io と相互にインポート・エクスポート。' },
      ar: { title: 'التصدير والتبادل', desc: 'صدّر الرسم كاملاً بصيغة PNG أو SVG، واستورد/صدّر مع Mermaid و draw.io.' },
      it: { title: 'Esportazione e interoperabilità', desc: 'Esporta l’intero grafo come PNG o SVG e importa/esporta Mermaid e draw.io.' },
    },
  },
  {
    key: 'install',
    href: './docs/',
    text: {
      zh: { title: '即装即用', desc: 'echarts.use(flowExtension) 注册自定义系列，或用 FlowEditor 直接获得交互编辑。' },
      en: { title: 'Drop-in', desc: 'Register the custom series with echarts.use(flowExtension), or use FlowEditor for interactive editing.' },
      es: { title: 'Listo para usar', desc: 'Registra las series personalizadas con echarts.use(flowExtension) o usa FlowEditor para editar interactivamente.' },
      fr: { title: 'Intégration immédiate', desc: 'Enregistrez les séries personnalisées avec echarts.use(flowExtension), ou utilisez FlowEditor pour éditer en interactif.' },
      de: { title: 'Sofort einsatzbereit', desc: 'Eigene Serien mit echarts.use(flowExtension) registrieren oder FlowEditor für interaktives Bearbeiten nutzen.' },
      pt: { title: 'Pronto para usar', desc: 'Registre as séries personalizadas com echarts.use(flowExtension) ou use o FlowEditor para edição interativa.' },
      ja: { title: 'すぐに使える', desc: 'echarts.use(flowExtension) でカスタムシリーズを登録するか、FlowEditor でそのまま編集作業を開始。' },
      ar: { title: 'جاهز للاستخدام', desc: 'سجّل السلاسل المخصصة عبر echarts.use(flowExtension)، أو استخدم FlowEditor للتحرير التفاعلي مباشرة.' },
      it: { title: 'Pronto all’uso', desc: 'Registra le serie personalizzate con echarts.use(flowExtension) oppure usa FlowEditor per la modifica interattiva.' },
    },
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
      title.textContent = feature.text[locale].title;
      desc.textContent = feature.text[locale].desc;
    });
  });
}

/** A small approval flow for the hero; node labels follow the page locale. */
const HERO_LABELS: Record<Locale, Record<'start' | 'review' | 'ok' | 'fix' | 'pay' | 'end' | 'no' | 'yes', string>> = {
  zh: { start: '开始', review: '审核材料', ok: '是否通过?', fix: '补充材料', pay: '发放奖励', end: '结束', no: '否', yes: '是' },
  en: { start: 'Start', review: 'Review documents', ok: 'Approved?', fix: 'Provide more info', pay: 'Grant reward', end: 'End', no: 'No', yes: 'Yes' },
  es: { start: 'Inicio', review: 'Revisar documentos', ok: '¿Aprobado?', fix: 'Aportar más datos', pay: 'Entregar premio', end: 'Fin', no: 'No', yes: 'Sí' },
  fr: { start: 'Début', review: 'Examiner les pièces', ok: 'Approuvé ?', fix: 'Compléter le dossier', pay: 'Verser la prime', end: 'Fin', no: 'Non', yes: 'Oui' },
  de: { start: 'Start', review: 'Unterlagen prüfen', ok: 'Freigegeben?', fix: 'Unterlagen ergänzen', pay: 'Prämie auszahlen', end: 'Ende', no: 'Nein', yes: 'Ja' },
  pt: { start: 'Início', review: 'Analisar documentos', ok: 'Aprovado?', fix: 'Completar dados', pay: 'Conceder prêmio', end: 'Fim', no: 'Não', yes: 'Sim' },
  ja: { start: '開始', review: '書類を審査', ok: '承認済み？', fix: '書類を補足', pay: '報酬を交付', end: '終了', no: 'いいえ', yes: 'はい' },
  ar: { start: 'البداية', review: 'مراجعة المستندات', ok: 'هل تمت الموافقة؟', fix: 'استكمال المستندات', pay: 'صرف المكافأة', end: 'النهاية', no: 'لا', yes: 'نعم' },
  it: { start: 'Inizio', review: 'Esamina documenti', ok: 'Approvato?', fix: 'Integra documenti', pay: 'Eroga premio', end: 'Fine', no: 'No', yes: 'Sì' },
};

function buildHeroGraph(locale: Locale): FlowGraph {
  const label = HERO_LABELS[locale];
  return {
    nodes: [
      { id: 'start', label: label.start, shape: 'start' },
      { id: 'review', label: label.review, shape: 'process' },
      { id: 'ok', label: label.ok, shape: 'decision' },
      { id: 'fix', label: label.fix, shape: 'io' },
      { id: 'pay', label: label.pay, shape: 'process' },
      { id: 'end', label: label.end, shape: 'end' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'review' },
      { id: 'e2', source: 'review', target: 'ok' },
      { id: 'e3', source: 'ok', target: 'fix', label: label.no },
      { id: 'e4', source: 'fix', target: 'review' },
      { id: 'e5', source: 'ok', target: 'pay', label: label.yes },
      { id: 'e6', source: 'pay', target: 'end' },
    ],
  };
}

const heroContainer = document.getElementById('hero-chart');
if (heroContainer) {
  initTheme();
  const heroChart = init(heroContainer);
  // The locale is final after setupLayout below, so start empty and render on
  // the first locale callback (it also fires for theme changes via onThemeChange).
  let heroLocale: Locale = 'zh';

  /** The canvas theme and node labels follow the page's locale and light/dark mode. */
  function renderHeroChart(): void {
    const heroTheme: FlowThemeName = resolvedTheme(currentThemeChoice()) === 'dark' ? 'aurora-dark' : 'aurora';
    const graph = buildHeroGraph(heroLocale);
    const viewport = calcFitViewport(graph, heroChart.getWidth(), heroChart.getHeight());
    heroChart.setOption(buildFlowOption(graph, { viewport, theme: heroTheme, pixelRatio: heroChart.getDevicePixelRatio() }));
  }

  onLocaleChange((locale) => {
    heroLocale = locale;
    renderHeroChart();
  });
  watchDevicePixelRatio(heroChart, renderHeroChart);
  onThemeChange(renderHeroChart);
  window.addEventListener('resize', () => {
    heroChart.resize();
    renderHeroChart();
  });
}

setupLayout('home', './', messages);