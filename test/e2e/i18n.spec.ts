import { expect, test, type Page } from '@playwright/test';

import { CASE_META } from '../cases/shared/caseCatalog';

/**
 * i18n regression tests for the language layer in shared/i18n.ts.
 *
 * These are DOM and behavior assertions only — the zh screenshot baselines in
 * cases.spec.ts already cover pixel-level rendering, so nothing here records
 * snapshots. Expected strings come from the dictionaries where possible
 * (caseCatalog is a pure data module, safe to import in a spec); the few
 * hardcoded maps below mirror shared/layout.ts, demo/main.ts and docs/docs.ts.
 *
 * shared/i18n.ts resolves the locale as: URL ?lang= > localStorage > browser
 * locale > 'zh'. Playwright contexts default to en-US, which the browser-locale
 * tests rely on.
 */

const LOCALES = ['zh', 'en', 'es', 'fr', 'de', 'pt', 'ja', 'ar', 'it'] as const;
type Locale = (typeof LOCALES)[number];

/** Keep in sync with HTML_LANG in shared/i18n.ts. */
const HTML_LANG: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  ja: 'ja',
  ar: 'ar',
  it: 'it',
};

const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar']);

/** First nav link label — keep in sync with navHome in shared/layout.ts. */
const NAV_HOME: Record<Locale, string> = {
  zh: '首页',
  en: 'Home',
  es: 'Inicio',
  fr: 'Accueil',
  de: 'Startseite',
  pt: 'Início',
  ja: 'ホーム',
  ar: 'الرئيسية',
  it: 'Home',
};

/** Keep in sync with EDITOR_MESSAGES in demo/main.ts. */
const EDITOR_UNDO: Record<'en' | 'ja', string> = { en: 'Undo', ja: '元に戻す' };
/** Keep in sync with the docs page title in docs/docs.ts. */
const DOCS_TITLE: Record<'en' | 'ja', string> = { en: 'Developer documentation', ja: '開発者向けドキュメント' };

const STORAGE_KEY = 'echarts-flow-locale';

function caseMeta(page: string) {
  const meta = CASE_META.find((entry) => entry.page === page);
  if (!meta) {
    throw new Error(`Page missing from the case catalog: ${page}`);
  }
  return meta;
}

function expectedDir(locale: Locale): string {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

/** Seeds localStorage before any page script runs. */
function storeLocaleOnLoad(page: Page, locale: string): void {
  page.addInitScript((keyAndValue) => localStorage.setItem(keyAndValue[0], keyAndValue[1]), [STORAGE_KEY, locale]);
}

test('home renders in all 9 locales', async ({ page }) => {
  for (const locale of LOCALES) {
    await page.goto(`/?lang=${locale}`);
    const html = page.locator('html');
    await expect(html, `home ${locale}`).toHaveAttribute('lang', HTML_LANG[locale]);
    await expect(html, `home ${locale}`).toHaveAttribute('dir', expectedDir(locale));
    await expect(page.locator('.lang-switch__select'), `home ${locale}`).toHaveValue(locale);
    await expect(page.locator('.site-nav__links a').first(), `home ${locale}`).toHaveText(NAV_HOME[locale]);
    // The feature cards are filled from home.ts's dictionary on locale change.
    await expect(page.locator('.card').first(), `home ${locale}`).toContainText(/\S/);
  }
});

test('case pages render in all 9 locales', async ({ page }) => {
  const meta = caseMeta('01-static-display');
  for (const locale of LOCALES) {
    await page.goto(`/test/cases/01-static-display.html?lang=${locale}`);
    const html = page.locator('html');
    await expect(html, `case 01 ${locale}`).toHaveAttribute('lang', HTML_LANG[locale]);
    await expect(html, `case 01 ${locale}`).toHaveAttribute('dir', expectedDir(locale));
    await expect(page.locator('.case__title'), `case 01 ${locale}`).toHaveText(meta.title[locale]);
    // data-i18n-html must render the description's inline <code> markup.
    await expect(page.locator('.case__desc code').first(), `case 01 ${locale}`).toBeVisible();
    await expect(page.locator('.lang-switch__select'), `case 01 ${locale}`).toHaveValue(locale);
    expect(await page.title(), `case 01 ${locale}`).toBe(`${meta.title[locale]} - echarts-flow`);
    await expect(page.locator('section canvas'), `case 01 ${locale}`).toBeVisible();
  }
});

test('switching language updates the page, the URL and localStorage', async ({ page }) => {
  await page.goto('/');
  // The default Playwright context is en-US, so the unpinned page starts in English.
  await expect(page.locator('.site-nav__links a').first()).toHaveText('Home');

  await page.selectOption('.lang-switch__select', 'ja');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('.site-nav__links a').first()).toHaveText('ホーム');
  await expect(page).toHaveURL(/[?&]lang=ja/);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('ja');

  // The choice survives a reload.
  await page.reload();
  await expect(page.locator('.site-nav__links a').first()).toHaveText('ホーム');
});

test('a valid ?lang param wins over the stored locale', async ({ page }) => {
  storeLocaleOnLoad(page, 'ja');
  await page.goto('/?lang=fr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.site-nav__links a').first()).toHaveText('Accueil');
});

test('the stored locale wins over the browser locale', async ({ page }) => {
  storeLocaleOnLoad(page, 'ja');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});

test('an invalid ?lang param falls back like a missing one', async ({ page }) => {
  storeLocaleOnLoad(page, 'de');
  await page.goto('/?lang=xx');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});

test('the browser locale is used when neither URL nor storage says anything', async ({ browser, page }) => {
  for (const locale of ['es', 'de', 'pt', 'it', 'ja']) {
    const context = await browser.newContext({ locale });
    const localePage = await context.newPage();
    await localePage.goto('/');
    await expect(localePage.locator('html'), `browser locale ${locale}`).toHaveAttribute('lang', locale);
    await context.close();
  }
  // Unsupported preferences fall back to the default locale, not to the first entry.
  const context = await browser.newContext({ locale: 'ko' });
  const fallbackPage = await context.newPage();
  await fallbackPage.goto('/');
  await expect(fallbackPage.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await context.close();

  // The default context is en-US, so an unpinned page resolves to English.
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the chosen language follows links to other pages', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('.lang-switch__select', 'ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  // Nav links carry no ?lang; the stored choice must pick it up.
  await page.click('.site-nav__links a[href="./docs/"]');
  await expect(page.locator('.docs__content h1')).toHaveText(DOCS_TITLE.ja);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  await page.goto('/editor.html');
  await expect(page.locator('#undo-button')).toHaveText(EDITOR_UNDO.ja);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});

test('Arabic case pages render right-to-left', async ({ page }) => {
  await page.goto('/test/cases/01-static-display.html?lang=ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.case__title')).toHaveText(caseMeta('01-static-display').title.ar);
  await expect(page.locator('.case__nav a').first()).toHaveText('→ قائمة الحالات');
  const direction = await page.locator('.case__desc').evaluate((element) => getComputedStyle(element).direction);
  expect(direction).toBe('rtl');
});

test('switching to Arabic mid-session flips the document without a reload', async ({ page }) => {
  await page.goto('/test/cases/14-edit-options.html?lang=zh');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  await page.selectOption('.lang-switch__select', 'ar');

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page).toHaveURL(/[?&]lang=ar/);
  await expect(page.locator('.case__title')).toHaveText(caseMeta('14-edit-options').title.ar);
});

test('the live editor keeps its language across a renderer switch', async ({ page }) => {
  // Unpinned, the editor follows the browser locale (en-US here).
  await page.goto('/editor.html');
  await expect(page.locator('#undo-button')).toHaveText(EDITOR_UNDO.en);

  await page.goto('/editor.html?lang=ja');
  await expect(page.locator('#undo-button')).toHaveText(EDITOR_UNDO.ja);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  // Switching the renderer reloads the page; the language must survive.
  await page.selectOption('#renderer-select', 'svg');
  await page.waitForURL(/renderer=svg/);
  expect(new URL(page.url()).searchParams.get('lang')).toBe('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('#undo-button')).toHaveText(EDITOR_UNDO.ja);
});

test('a case page keeps ?lang across its renderer switch', async ({ page }) => {
  await page.goto('/test/cases/01-static-display.html?lang=ar');

  // Switch the language in place, then reload through the renderer switch.
  await page.selectOption('.lang-switch__select', 'ja');
  await expect(page).toHaveURL(/[?&]lang=ja/);
  await page.locator('.case__renderer-option', { hasText: 'SVG' }).click();
  await page.waitForURL(/renderer=svg/);

  expect(new URL(page.url()).searchParams.get('lang')).toBe('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('.case__title')).toHaveText(caseMeta('01-static-display').title.ja);
});
