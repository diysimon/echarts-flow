import { init, use } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { FlowEditor, flowExtension, type FlowGraph, type FlowNodeShape, type FlowStatus, type FlowThemeName } from '../src/index';
import { APPROVAL_GRAPH } from './sampleGraph';
import { setupLayout } from '../shared/layout';
import { currentThemeChoice, resolvedTheme } from '../shared/theme';
import { onLocaleChange, type Messages } from '../shared/i18n';

use([CustomChart, CanvasRenderer, SVGRenderer, flowExtension]);

const SIMULATION_STEP_DELAY = 1200;
const RENDERER_PARAM = 'renderer';

type DemoRenderer = 'canvas' | 'svg';

/** Renderer chosen with `?renderer=svg`; Canvas by default. */
function getDemoRenderer(): DemoRenderer {
  return new URLSearchParams(window.location.search).get(RENDERER_PARAM) === 'svg' ? 'svg' : 'canvas';
}

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Demo element not found: ${selector}`);
  }
  return element;
}

const chartContainer = getElement<HTMLElement>('#flow-chart');
const jsonOutput = getElement<HTMLElement>('#graph-json');
const undoButton = getElement<HTMLButtonElement>('#undo-button');
const redoButton = getElement<HTMLButtonElement>('#redo-button');
const editableToggle = getElement<HTMLInputElement>('#editable-toggle');

const chart = init(chartContainer, null, { renderer: getDemoRenderer() });
const initialDemoTheme: FlowThemeName = resolvedTheme(currentThemeChoice()) === 'dark' ? 'aurora-dark' : 'aurora';
const editor = new FlowEditor(chart, { graph: APPROVAL_GRAPH, theme: initialDemoTheme, onChange: updatePanel });

function updatePanel(graph: FlowGraph = editor.getGraph()): void {
  jsonOutput.textContent = JSON.stringify(graph, null, 2);
  undoButton.disabled = !editor.canUndo;
  redoButton.disabled = !editor.canRedo;
}

let simulationTimer: number | null = null;

/** Walks the nodes in order, marking each one running and then done. */
function toggleSimulation(): void {
  if (simulationTimer !== null) {
    window.clearInterval(simulationTimer);
    simulationTimer = null;
    setAllStatuses(undefined);
    return;
  }
  const nodeIds = editor.getGraph().nodes.map((node) => node.id);
  setAllStatuses('pending');
  let step = 0;
  simulationTimer = window.setInterval(() => {
    if (step > 0) {
      editor.setNodeStatus(nodeIds[step - 1], 'done');
    }
    if (step < nodeIds.length) {
      editor.setNodeStatus(nodeIds[step], 'running');
    }
    step = (step + 1) % (nodeIds.length + 1);
    if (step === 0) {
      setAllStatuses('pending');
    }
  }, SIMULATION_STEP_DELAY);
}

function setAllStatuses(status: FlowStatus | undefined): void {
  editor.getGraph().nodes.forEach((node) => editor.setNodeStatus(node.id, status));
}

const ACTIONS: Record<string, () => void> = {
  undo: () => editor.undo(),
  redo: () => editor.redo(),
  delete: () => editor.deleteSelection(),
  layout: () => editor.autoLayout(),
  fit: () => editor.fitView(),
  'zoom-in': () => editor.zoomIn(),
  'zoom-out': () => editor.zoomOut(),
  simulate: toggleSimulation,
};

function handleToolbarClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) {
    return;
  }
  const shape = button.dataset.shape as FlowNodeShape | undefined;
  if (shape) {
    editor.addNode({ shape });
  }
  const action = button.dataset.action;
  if (action) {
    ACTIONS[action]?.();
  }
  updatePanel();
}

getElement<HTMLElement>('.flow-demo__toolbar').addEventListener('click', handleToolbarClick);
editableToggle.addEventListener('change', () => editor.setEditable(editableToggle.checked));
const themeSelect = getElement<HTMLSelectElement>('#theme-select');
themeSelect.addEventListener('change', () => editor.setTheme(themeSelect.value as FlowThemeName));
// The select shows the chart's initial theme (it only reacts to reloads or the select).
themeSelect.value = initialDemoTheme;
const rendererSelect = getElement<HTMLSelectElement>('#renderer-select');
rendererSelect.value = getDemoRenderer();
// ECharts fixes the renderer at init, so switching reloads the page with the new choice.
rendererSelect.addEventListener('change', () => {
  const url = new URL(window.location.href);
  url.searchParams.set(RENDERER_PARAM, rendererSelect.value);
  window.location.assign(url.toString());
});
window.addEventListener('resize', () => chart.resize());
updatePanel();

const EDITOR_MESSAGES: Messages = {
  zh: {
    pageTitle: 'echarts-flow 流程图编辑器',
    groupAdd: '添加节点',
    groupEdit: '编辑',
    groupView: '视图',
    groupMode: '模式',
    btnStart: '开始',
    btnProcess: '处理',
    btnDecision: '判断',
    btnIo: '输入/输出',
    btnEnd: '结束',
    btnUndo: '撤销',
    btnRedo: '重做',
    btnDelete: '删除',
    btnLayout: '自动布局',
    btnFit: '适应画布',
    btnZoomIn: '放大',
    btnZoomOut: '缩小',
    btnSimulate: '模拟运行',
    labelEditable: ' 可编辑',
    labelTheme: ' 主题 ',
    labelRenderer: ' 渲染器 ',
    panelTitle: '操作说明',
    tip1: '拖动节点移动，Shift 点击多选，Shift 拖空白处框选',
    tip2: '悬停节点后从圆点拖出连线；选中连线后拖两端圆点改接',
    tip3: '双击节点或连线编辑文字',
    tip4: 'Delete 删除，Ctrl/Cmd+Z 撤销，Ctrl/Cmd+C / V / D 复制粘贴，方向键微调',
    tip5: '拖动空白处平移，滚轮缩放',
    casesLink: '查看全部 17 个用例 →',
    panelData: '数据',
  },
  en: {
    pageTitle: 'echarts-flow flowchart editor',
    groupAdd: 'Add node',
    groupEdit: 'Edit',
    groupView: 'View',
    groupMode: 'Mode',
    btnStart: 'Start',
    btnProcess: 'Process',
    btnDecision: 'Decision',
    btnIo: 'Input/Output',
    btnEnd: 'End',
    btnUndo: 'Undo',
    btnRedo: 'Redo',
    btnDelete: 'Delete',
    btnLayout: 'Auto layout',
    btnFit: 'Fit to view',
    btnZoomIn: 'Zoom in',
    btnZoomOut: 'Zoom out',
    btnSimulate: 'Simulate',
    labelEditable: ' Editable',
    labelTheme: ' Theme ',
    labelRenderer: ' Renderer ',
    panelTitle: 'How to use',
    tip1: 'Drag nodes to move, Shift-click to multi-select, Shift-drag empty space to box-select',
    tip2: 'Hover a node, then drag from its dot to draw an edge; drag an edge end-point to reconnect',
    tip3: 'Double-click a node or an edge to edit its text',
    tip4: 'Delete removes, Ctrl/Cmd+Z undoes, Ctrl/Cmd+C / V / D copy / paste / duplicate, arrow keys nudge',
    tip5: 'Drag empty space to pan, scroll to zoom',
    casesLink: 'View all 17 cases →',
    panelData: 'Data',
  },
  es: {
    pageTitle: 'Editor de diagramas de flujo echarts-flow',
    groupAdd: 'Añadir nodo',
    groupEdit: 'Editar',
    groupView: 'Vista',
    groupMode: 'Modo',
    btnStart: 'Inicio',
    btnProcess: 'Proceso',
    btnDecision: 'Decisión',
    btnIo: 'Entrada/Salida',
    btnEnd: 'Fin',
    btnUndo: 'Deshacer',
    btnRedo: 'Rehacer',
    btnDelete: 'Eliminar',
    btnLayout: 'Diseño automático',
    btnFit: 'Ajustar a la vista',
    btnZoomIn: 'Acercar',
    btnZoomOut: 'Alejar',
    btnSimulate: 'Simular ejecución',
    labelEditable: ' Editable',
    labelTheme: ' Tema ',
    labelRenderer: ' Renderizador ',
    panelTitle: 'Instrucciones',
    tip1: 'Arrastra nodos para moverlos, Shift+clic para multiselección, Shift+arrastre en el espacio vacío para selección por caja',
    tip2: 'Pasa el cursor sobre un nodo y arrastra desde su punto para dibujar una arista; arrastra los extremos de una arista para reconectarla',
    tip3: 'Doble clic en un nodo o arista para editar su texto',
    tip4: 'Suprimir elimina, Ctrl/Cmd+Z deshace, Ctrl/Cmd+C / V / D copia / pega / duplica, las flechas mueven',
    tip5: 'Arrastra el espacio vacío para desplazar y usa la rueda para hacer zoom',
    casesLink: 'Ver los 17 casos →',
    panelData: 'Datos',
  },
  fr: {
    pageTitle: 'Éditeur de diagrammes echarts-flow',
    groupAdd: 'Ajouter un nœud',
    groupEdit: 'Éditer',
    groupView: 'Vue',
    groupMode: 'Mode',
    btnStart: 'Début',
    btnProcess: 'Traitement',
    btnDecision: 'Décision',
    btnIo: 'Entrée/Sortie',
    btnEnd: 'Fin',
    btnUndo: 'Annuler',
    btnRedo: 'Rétablir',
    btnDelete: 'Supprimer',
    btnLayout: 'Disposition auto',
    btnFit: 'Ajuster à la vue',
    btnZoomIn: 'Zoom avant',
    btnZoomOut: 'Zoom arrière',
    btnSimulate: 'Simuler l’exécution',
    labelEditable: ' Modifiable',
    labelTheme: ' Thème ',
    labelRenderer: ' Rendu ',
    panelTitle: 'Mode d’emploi',
    tip1: 'Glissez les nœuds pour les déplacer, Maj+clic pour la multisélection, Maj+glisser sur le vide pour la sélection par zone',
    tip2: 'Survolez un nœud puis tirez depuis son point pour tracer une arête ; tirez les extrémités d’une arête pour la reconnecter',
    tip3: 'Double-cliquez sur un nœud ou une arête pour modifier son texte',
    tip4: 'Suppr efface, Ctrl/Cmd+Z annule, Ctrl/Cmd+C / V / D copie / colle / duplique, les flèches déplacent',
    tip5: 'Glissez le vide pour déplacer la vue, molette pour zoomer',
    casesLink: 'Voir les 17 cas →',
    panelData: 'Données',
  },
  de: {
    pageTitle: 'Flussdiagramm-Editor echarts-flow',
    groupAdd: 'Knoten hinzufügen',
    groupEdit: 'Bearbeiten',
    groupView: 'Ansicht',
    groupMode: 'Modus',
    btnStart: 'Start',
    btnProcess: 'Verarbeitung',
    btnDecision: 'Entscheidung',
    btnIo: 'Eingabe/Ausgabe',
    btnEnd: 'Ende',
    btnUndo: 'Rückgängig',
    btnRedo: 'Wiederholen',
    btnDelete: 'Löschen',
    btnLayout: 'Automatisches Layout',
    btnFit: 'Ansicht einpassen',
    btnZoomIn: 'Vergrößern',
    btnZoomOut: 'Verkleinern',
    btnSimulate: 'Simulation',
    labelEditable: ' Bearbeitbar',
    labelTheme: ' Thema ',
    labelRenderer: ' Renderer ',
    panelTitle: 'Anleitung',
    tip1: 'Knoten ziehen zum Verschieben, Umschalt+Klick für Mehrfachauswahl, Umschalt+Ziehen auf der Leerfläche für Rahmenauswahl',
    tip2: 'Über einen Knoten fahren und vom Punkt aus ziehen, um eine Kante zu zeichnen; Endpunkte einer Kante ziehen zum Umhängen',
    tip3: 'Doppelklick auf einen Knoten oder eine Kante zum Textbearbeiten',
    tip4: 'Entf löscht, Strg/Cmd+Z macht rückgängig, Strg/Cmd+C / V / D kopiert / fügt ein / dupliziert, Pfeiltasten verschieben',
    tip5: 'Leerfläche ziehen zum Verschieben, Mausrad zum Zoomen',
    casesLink: 'Alle 17 Fälle ansehen →',
    panelData: 'Daten',
  },
  pt: {
    pageTitle: 'Editor de fluxograma echarts-flow',
    groupAdd: 'Adicionar nó',
    groupEdit: 'Editar',
    groupView: 'Visualizar',
    groupMode: 'Modo',
    btnStart: 'Início',
    btnProcess: 'Processo',
    btnDecision: 'Decisão',
    btnIo: 'Entrada/Saída',
    btnEnd: 'Fim',
    btnUndo: 'Desfazer',
    btnRedo: 'Refazer',
    btnDelete: 'Excluir',
    btnLayout: 'Layout automático',
    btnFit: 'Ajustar à visualização',
    btnZoomIn: 'Aproximar',
    btnZoomOut: 'Afastar',
    btnSimulate: 'Simular execução',
    labelEditable: ' Editável',
    labelTheme: ' Tema ',
    labelRenderer: ' Renderizador ',
    panelTitle: 'Instruções',
    tip1: 'Arraste nós para mover, Shift+clique para multisseleção, Shift+arraste no espaço vazio para seleção por caixa',
    tip2: 'Passe o mouse sobre um nó e arraste a partir do ponto para desenhar uma aresta; arraste as pontas de uma aresta para reconectar',
    tip3: 'Duplo clique em um nó ou aresta para editar o texto',
    tip4: 'Delete exclui, Ctrl/Cmd+Z desfaz, Ctrl/Cmd+C / V / D copia / cola / duplica, setas movem',
    tip5: 'Arraste o espaço vazio para mover e use a roda para dar zoom',
    casesLink: 'Ver os 17 casos →',
    panelData: 'Dados',
  },
  ja: {
    pageTitle: 'echarts-flow フローチャートエディタ',
    groupAdd: 'ノード追加',
    groupEdit: '編集',
    groupView: '表示',
    groupMode: 'モード',
    btnStart: '開始',
    btnProcess: '処理',
    btnDecision: '判断',
    btnIo: '入力/出力',
    btnEnd: '終了',
    btnUndo: '元に戻す',
    btnRedo: 'やり直す',
    btnDelete: '削除',
    btnLayout: '自動レイアウト',
    btnFit: '画面に合わせる',
    btnZoomIn: '拡大',
    btnZoomOut: '縮小',
    btnSimulate: 'シミュレーション',
    labelEditable: ' 編集可能',
    labelTheme: ' テーマ ',
    labelRenderer: ' レンダラー ',
    panelTitle: '操作説明',
    tip1: 'ノードをドラッグして移動、Shift クリックで複数選択、Shift ドラッグで空き領域を矩形選択',
    tip2: 'ノードにマウスを合わせてドットからドラッグしエッジを描画。エッジの端点をドラッグして接続先を変更',
    tip3: 'ノードまたはエッジをダブルクリックして文字を編集',
    tip4: 'Delete で削除、Ctrl/Cmd+Z で取り消し、Ctrl/Cmd+C / V / D でコピー / 貼り付け / 複製、矢印キーで微調整',
    tip5: '空き領域をドラッグして移動、ホイールでズーム',
    casesLink: '17 件のユースケースを見る →',
    panelData: 'データ',
  },
  ar: {
    pageTitle: 'محرر مخططات التدفق echarts-flow',
    groupAdd: 'إضافة عقدة',
    groupEdit: 'تحرير',
    groupView: 'عرض',
    groupMode: 'وضع',
    btnStart: 'بداية',
    btnProcess: 'معالجة',
    btnDecision: 'قرار',
    btnIo: 'إدخال/إخراج',
    btnEnd: 'نهاية',
    btnUndo: 'تراجع',
    btnRedo: 'إعادة',
    btnDelete: 'حذف',
    btnLayout: 'تخطيط تلقائي',
    btnFit: 'ملاءمة العرض',
    btnZoomIn: 'تكبير',
    btnZoomOut: 'تصغير',
    btnSimulate: 'محاكاة التشغيل',
    labelEditable: ' قابل للتحرير',
    labelTheme: ' السمة ',
    labelRenderer: ' العارض ',
    panelTitle: 'طريقة الاستخدام',
    tip1: 'اسحب العقد لتحريكها، Shift+نقر للتحديد المتعدد، Shift+سحب على المساحة الفارغة للتحديد الصندوقي',
    tip2: 'مرّر فوق عقدة واسحب من النقطة لرسم حافة؛ اسحب طرفي الحافة لإعادة التوصيل',
    tip3: 'انقر نقراً مزدوجاً على عقدة أو حافة لتحرير النص',
    tip4: 'Delete يحذف، Ctrl/Cmd+Z يتراجع، Ctrl/Cmd+C / V / D نسخ / لصق / تكرار، والأسهم تحرك',
    tip5: 'اسحب المساحة الفارغة للتحريك، والعجلة للتكبير',
    casesLink: 'عرض جميع الحالات الـ 17 ←',
    panelData: 'البيانات',
  },
  it: {
    pageTitle: 'Editor di diagrammi di flusso echarts-flow',
    groupAdd: 'Aggiungi nodo',
    groupEdit: 'Modifica',
    groupView: 'Vista',
    groupMode: 'Modalità',
    btnStart: 'Inizio',
    btnProcess: 'Elaborazione',
    btnDecision: 'Decisione',
    btnIo: 'Ingresso/Uscita',
    btnEnd: 'Fine',
    btnUndo: 'Annulla',
    btnRedo: 'Ripeti',
    btnDelete: 'Elimina',
    btnLayout: 'Layout automatico',
    btnFit: 'Adatta alla vista',
    btnZoomIn: 'Ingrandisci',
    btnZoomOut: 'Riduci',
    btnSimulate: 'Simula esecuzione',
    labelEditable: ' Modificabile',
    labelTheme: ' Tema ',
    labelRenderer: ' Renderer ',
    panelTitle: 'Istruzioni',
    tip1: 'Trascina i nodi per spostarli, Maiusc+clic per la selezione multipla, Maiusc+trascina sul vuoto per la selezione a riquadro',
    tip2: 'Passa il mouse su un nodo e trascina dal suo punto per tracciare uno spigolo; trascina gli estremi di uno spigolo per riconnetterlo',
    tip3: 'Doppio clic su un nodo o uno spigolo per modificarne il testo',
    tip4: 'Canc elimina, Ctrl/Cmd+Z annulla, Ctrl/Cmd+C / V / D copia / incolla / duplica, le frecce spostano',
    tip5: 'Trascina il vuoto per spostare la vista, rotella per lo zoom',
    casesLink: 'Vedi tutti i 17 casi →',
    panelData: 'Dati',
  },
};

setupLayout('editor', './', EDITOR_MESSAGES);
onLocaleChange((locale) => {
  document.title = `${EDITOR_MESSAGES[locale].pageTitle} - echarts-flow`;
});
