import { setupLayout } from '../shared/layout';
import { onLocaleChange, type Locale, type Messages } from '../shared/i18n';

const messages: Messages = {
  zh: {
    title: '示例',
    intro: '每个示例覆盖一类使用场景，可在浏览器中直接交互。',
  },
  en: {
    title: 'Examples',
    intro: 'Each example covers one kind of use case and is interactive in the browser.',
  },
  es: {
    title: 'Ejemplos',
    intro: 'Cada ejemplo cubre un tipo de caso de uso y es interactivo en el navegador.',
  },
  fr: {
    title: 'Exemples',
    intro: 'Chaque exemple couvre un type de cas d’usage et est interactif dans le navigateur.',
  },
  de: {
    title: 'Beispiele',
    intro: 'Jedes Beispiel deckt eine Art von Anwendungsfall ab und ist im Browser interaktiv.',
  },
  pt: {
    title: 'Exemplos',
    intro: 'Cada exemplo cobre um tipo de caso de uso e é interativo no navegador.',
  },
  ja: {
    title: 'サンプル',
    intro: '各サンプルはある種の利用シーンをカバーし、ブラウザで直接操作できます。',
  },
  ar: {
    title: 'أمثلة',
    intro: 'يغطي كل مثال نوعاً من حالات الاستخدام ويمكن التفاعل معه في المتصفح.',
  },
  it: {
    title: 'Esempi',
    intro: 'Ogni esempio copre un tipo di caso d’uso ed è interattivo nel browser.',
  },
};

interface Example {
  /** Page under the built site's `cases/` directory. */
  page: string;
  text: Record<Locale, { title: string; desc: string }>;
}

/** Curated, user-facing subset of the case pages. */
const examples: Example[] = [
  {
    page: '01-static-display',
    text: {
      zh: { title: '只读展示', desc: '不用编辑器，buildFlowOption 直接渲染，自动布局并居中。' },
      en: { title: 'Read-only display', desc: 'Render with buildFlowOption, no editor; automatic layout, centered.' },
      es: { title: 'Visualización de solo lectura', desc: 'Renderiza con buildFlowOption, sin editor; diseño automático y centrado.' },
      fr: { title: 'Affichage en lecture seule', desc: 'Rendu avec buildFlowOption, sans éditeur ; disposition automatique, centré.' },
      de: { title: 'Nur-Lese-Anzeige', desc: 'Mit buildFlowOption rendern, ohne Editor; automatisches Layout, zentriert.' },
      pt: { title: 'Exibição somente leitura', desc: 'Renderize com buildFlowOption, sem editor; layout automático, centralizado.' },
      ja: { title: '読み取り専用表示', desc: 'エディタなしで buildFlowOption により描画。自動レイアウトで中央配置。' },
      ar: { title: 'عرض للقراءة فقط', desc: 'اعرض عبر buildFlowOption دون محرر؛ تخطيط تلقائي وتوسيط.' },
      it: { title: 'Visualizzazione in sola lettura', desc: 'Rendering con buildFlowOption, senza editor; layout automatico, centrato.' },
    },
  },
  {
    page: '04-blank-editor',
    text: {
      zh: { title: '从空白画布编辑', desc: '添加节点、拖线、框选、复制粘贴、对齐线、撤销重做。' },
      en: { title: 'Edit from a blank canvas', desc: 'Add nodes, draw edges, box-select, copy/paste, alignment guides, undo/redo.' },
      es: { title: 'Editar desde un lienzo en blanco', desc: 'Añade nodos, dibuja aristas, selección por caja, copiar/pegar, guías de alineación, deshacer/rehacer.' },
      fr: { title: 'Éditer depuis un canevas vierge', desc: 'Ajouter des nœuds, tracer des arêtes, sélection par zone, copier/coller, guides d’alignement, annuler/rétablir.' },
      de: { title: 'Auf leerer Fläche bearbeiten', desc: 'Knoten hinzufügen, Kanten ziehen, Rahmenauswahl, Kopieren/Einfügen, Ausrichtungslinien, Rückgängig/Wiederholen.' },
      pt: { title: 'Editar a partir de uma tela em branco', desc: 'Adicione nós, desenhe arestas, seleção por caixa, copiar/colar, guias de alinhamento, desfazer/refazer.' },
      ja: { title: '空白キャンバスから編集', desc: 'ノード追加、線の接続、矩形選択、コピー&ペースト、整列ガイド、元に戻す/やり直し。' },
      ar: { title: 'التحرير من لوحة فارغة', desc: 'أضف العقد، ارسم الحواف، تحديد صندوقي، نسخ/لصق، أدلة محاذاة، تراجع/إعادة.' },
      it: { title: 'Modifica da una tela vuota', desc: 'Aggiungi nodi, disegna spigoli, selezione a riquadro, copia/incolla, guide di allineamento, annulla/ripeti.' },
    },
  },
  {
    page: '05-status-monitor',
    text: {
      zh: { title: '运行状态监控', desc: '只读模式下按脚本推进流水线状态，含并行、失败与重试。' },
      en: { title: 'Run-status monitor', desc: 'Drive a pipeline through states in read-only mode, with parallelism, failure and retry.' },
      es: { title: 'Monitor de estado de ejecución', desc: 'Avanza un pipeline por estados en modo de solo lectura, con paralelismo, fallo y reintento.' },
      fr: { title: 'Suivi d’état d’exécution', desc: 'Fait évoluer un pipeline entre états en lecture seule, avec parallélisme, échec et relance.' },
      de: { title: 'Laufzeit-Statusmonitor', desc: 'Pipeline-Zustände im Nur-Lese-Modus durchlaufen, mit Parallelität, Fehler und Wiederholung.' },
      pt: { title: 'Monitor de status de execução', desc: 'Avance um pipeline por estados em modo somente leitura, com paralelismo, falha e repetição.' },
      ja: { title: '実行ステータスの監視', desc: '読み取り専用でパイプラインを状態遷移させる。並列・失敗・リトライに対応。' },
      ar: { title: 'مراقبة حالة التشغيل', desc: 'قدّم خط الأنابيب عبر الحالات في وضع القراءة فقط، مع التوازي والفشل وإعادة المحاولة.' },
      it: { title: 'Monitor di stato di esecuzione', desc: 'Fai avanzare una pipeline tra gli stati in modalità sola lettura, con parallelismo, errore e retry.' },
    },
  },
  {
    page: '09-themes',
    text: {
      zh: { title: '主题', desc: 'light / dark / macarons / tech-blue 四套内置主题对比。' },
      en: { title: 'Themes', desc: 'Compare the light, dark, macarons and tech-blue built-in themes.' },
      es: { title: 'Temas', desc: 'Compara los temas integrados light, dark, macarons y tech-blue.' },
      fr: { title: 'Thèmes', desc: 'Comparez les thèmes intégrés light, dark, macarons et tech-blue.' },
      de: { title: 'Themes', desc: 'Vergleiche die eingebauten Themes light, dark, macarons und tech-blue.' },
      pt: { title: 'Temas', desc: 'Compare os temas integrados light, dark, macarons e tech-blue.' },
      ja: { title: 'テーマ', desc: '組み込みテーマ light / dark / macarons / tech-blue の比較。' },
      ar: { title: 'السمات', desc: 'قارن السمات المدمجة light و dark و macarons و tech-blue.' },
      it: { title: 'Temi', desc: 'Confronta i temi integrati light, dark, macarons e tech-blue.' },
    },
  },
  {
    page: '12-style-gallery',
    text: {
      zh: { title: '样式配置大全', desc: '11 种形状、8 种箭头、3 种连线方式与自定义主题。' },
      en: { title: 'Style gallery', desc: '11 shapes, 8 arrow types, 3 edge styles and custom themes.' },
      es: { title: 'Galería de estilos', desc: '11 formas, 8 tipos de flecha, 3 estilos de arista y temas personalizados.' },
      fr: { title: 'Galerie de styles', desc: '11 formes, 8 types de flèches, 3 styles d’arêtes et thèmes personnalisés.' },
      de: { title: 'Stilgalerie', desc: '11 Formen, 8 Pfeiltypen, 3 Kantenstile und eigene Themes.' },
      pt: { title: 'Galeria de estilos', desc: '11 formas, 8 tipos de setas, 3 estilos de aresta e temas personalizados.' },
      ja: { title: 'スタイルギャラリー', desc: '11 形状、8 矢印、3 種類のエッジスタイルとカスタムテーマ。' },
      ar: { title: 'معرض الأنماط', desc: '11 شكلاً و8 أنواع أسهم و3 أنماط حواف وسمات مخصصة.' },
      it: { title: 'Galleria di stili', desc: '11 forme, 8 tipi di freccia, 3 stili di spigolo e temi personalizzati.' },
    },
  },
  {
    page: '13-swimlane-gallery',
    text: {
      zh: { title: '泳道场景集', desc: '请假、订单、CI/CD 等 6 个泳道场景，可切换方向与主题。' },
      en: { title: 'Swimlane gallery', desc: 'Six swimlane scenarios (leave, orders, CI/CD, …) with direction and theme switches.' },
      es: { title: 'Galería de carriles', desc: 'Seis escenarios de carriles (permisos, pedidos, CI/CD, …) con cambio de dirección y tema.' },
      fr: { title: 'Galerie de couloirs', desc: 'Six scénarios de couloirs (congés, commandes, CI/CD, …) avec bascule de direction et de thème.' },
      de: { title: 'Swimlane-Galerie', desc: 'Sechs Swimlane-Szenarien (Urlaub, Bestellungen, CI/CD, …) mit Richtungs- und Theme-Umschaltern.' },
      pt: { title: 'Galeria de raias', desc: 'Seis cenários de raias (licenças, pedidos, CI/CD, …) com alternância de direção e tema.' },
      ja: { title: 'スイムレーンギャラリー', desc: '休暇・注文・CI/CD など 6 つのスイムレーンシナリオ。方向とテーマを切り替え可能。' },
      ar: { title: 'معرض الممرات', desc: 'ستة سيناريوهات ممرات (الإجازات، الطلبات، CI/CD، …) مع تبديل الاتجاه والسمة.' },
      it: { title: 'Galleria di corsie', desc: 'Sei scenari di corsie (permessi, ordini, CI/CD, …) con selettori di direzione e tema.' },
    },
  },
  {
    page: '07-large-graph',
    text: {
      zh: { title: '大图性能', desc: '50 到 1000 个节点，记录布局与渲染耗时，感受交互帧率。' },
      en: { title: 'Large graphs', desc: '50 to 1000 nodes; measures layout and render time and shows the interaction frame rate.' },
      es: { title: 'Grafos grandes', desc: 'De 50 a 1000 nodos; mide el tiempo de diseño y renderizado y muestra la tasa de fotogramas.' },
      fr: { title: 'Grands graphes', desc: 'De 50 à 1000 nœuds ; mesure la disposition et le temps de rendu et affiche le framerate.' },
      de: { title: 'Große Graphen', desc: '50 bis 1000 Knoten; misst Layout- und Renderzeit und zeigt die Interaktions-Framerate.' },
      pt: { title: 'Grafos grandes', desc: 'De 50 a 1000 nós; mede o tempo de layout e renderização e mostra a taxa de quadros.' },
      ja: { title: '大規模グラフ', desc: '50〜1000 ノード。レイアウト・描画時間を計測し、操作時のフレームレートを表示。' },
      ar: { title: 'رسوم كبيرة', desc: 'من 50 إلى 1000 عقدة؛ يقيس زمن التخطيط والرسم ويعرض معدل الإطارات التفاعلي.' },
      it: { title: 'Grafi grandi', desc: 'Da 50 a 1000 nodi; misura tempi di layout e rendering e mostra i frame al secondo.' },
    },
  },
  {
    page: '16-export-interop',
    text: {
      zh: { title: '导出与互通', desc: '导出 PNG / SVG，与 Mermaid、draw.io 互相导入导出。' },
      en: { title: 'Export and interop', desc: 'Export PNG/SVG and import/export Mermaid and draw.io.' },
      es: { title: 'Exportación e interoperabilidad', desc: 'Exporta PNG/SVG e importa/exporta Mermaid y draw.io.' },
      fr: { title: 'Export et interopérabilité', desc: 'Exportez en PNG/SVG et importez/exportez Mermaid et draw.io.' },
      de: { title: 'Export und Interop', desc: 'PNG/SVG exportieren und Mermaid und draw.io importieren/exportieren.' },
      pt: { title: 'Exportação e interoperabilidade', desc: 'Exporte PNG/SVG e importe/exporte Mermaid e draw.io.' },
      ja: { title: 'エクスポートと相互運用', desc: 'PNG / SVG エクスポート。Mermaid や draw.io と相互にインポート・エクスポート。' },
      ar: { title: 'التصدير والتبادل', desc: 'صدّر PNG/SVG واستورد/صدّر مع Mermaid و draw.io.' },
      it: { title: 'Esportazione e interoperabilità', desc: 'Esporta PNG/SVG e importa/esporta Mermaid e draw.io.' },
    },
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
      title.textContent = example.text[locale].title;
      desc.textContent = example.text[locale].desc;
    });
  });
}

setupLayout('examples', '../', messages);