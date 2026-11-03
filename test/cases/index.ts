import { setupLayout } from '../../shared/layout';
import { onLocaleChange, type Locale, type Messages } from '../../shared/i18n';
import { CASE_META } from './shared/caseCatalog';

const messages: Messages = {
  zh: {
    casesTitle: 'echarts-flow 用例',
    casesIntro: '每个页面覆盖一类使用场景，用于手动验证和回归检查。运行 <code>npm run dev</code> 后访问本页。',
  },
  en: {
    casesTitle: 'echarts-flow cases',
    casesIntro: 'Each page covers one kind of use case for manual verification and regression checks. Run <code>npm run dev</code> and open this page.',
  },
  es: {
    casesTitle: 'Casos de echarts-flow',
    casesIntro: 'Cada página cubre un tipo de caso de uso para la verificación manual y las comprobaciones de regresión. Ejecuta <code>npm run dev</code> y abre esta página.',
  },
  fr: {
    casesTitle: 'Cas d’utilisation d’echarts-flow',
    casesIntro: 'Chaque page couvre un type de cas d’usage pour la vérification manuelle et les contrôles de régression. Lancez <code>npm run dev</code> puis ouvrez cette page.',
  },
  de: {
    casesTitle: 'Anwendungsfälle von echarts-flow',
    casesIntro: 'Jede Seite deckt eine Art von Anwendungsfall zur manuellen Prüfung und für Regressionstests ab. Führen Sie <code>npm run dev</code> aus und öffnen Sie diese Seite.',
  },
  pt: {
    casesTitle: 'Casos de echarts-flow',
    casesIntro: 'Cada página cobre um tipo de caso de uso para verificação manual e verificações de regressão. Execute <code>npm run dev</code> e abra esta página.',
  },
  ja: {
    casesTitle: 'echarts-flow ユースケース',
    casesIntro: '各ページはある種の利用シーンをカバーし、手動検証とリグレッションチェックに使用します。<code>npm run dev</code> を実行してこのページを開いてください。',
  },
  ar: {
    casesTitle: 'حالات echarts-flow',
    casesIntro: 'تغطي كل صفحة نوعاً من حالات الاستخدام للتحقق اليدوي وفحوص الانحدار. شغّل <code>npm run dev</code> وافتح هذه الصفحة.',
  },
  it: {
    casesTitle: 'Casi d’uso di echarts-flow',
    casesIntro: 'Ogni pagina copre un tipo di caso d’uso per la verifica manuale e i controlli di regressione. Esegui <code>npm run dev</code> e apri questa pagina.',
  },
};

function buildHref(page: string, locale: Locale): string {
  return `${page}.html?lang=${locale}`;
}

const list = document.getElementById('case-list');
if (list) {
  CASE_META.forEach((meta) => {
    const card = document.createElement('a');
    card.className = 'card';
    const title = document.createElement('p');
    title.className = 'card__title';
    const desc = document.createElement('p');
    desc.className = 'card__desc';
    card.append(title, desc);
    list.append(card);
    onLocaleChange((locale) => {
      card.href = buildHref(meta.page, locale);
      title.textContent = meta.title[locale];
      desc.innerHTML = meta.desc[locale];
    });
  });
}

setupLayout('cases', '../../', messages);
onLocaleChange((locale) => {
  document.title = `${messages[locale].casesTitle} - echarts-flow`;
});