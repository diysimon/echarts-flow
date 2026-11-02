/**
 * Framework-free bilingual (and future multi-language) layer for the static
 * site. One source of truth per page: a dictionary keyed by locale. Markup
 * carries `data-i18n` keys; this module fills them for the active locale and
 * renders a language switch. Adding a language means adding a column to the
 * dictionaries and an entry to {@link LOCALES}; no page markup changes.
 */

/** Add a locale here and in each page's dictionary to support it. */
export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Shown in the language switch; the key is the locale, the value its own name. */
export const LOCALE_NAMES: Record<Locale, string> = { zh: '中文', en: 'English' };

const DEFAULT_LOCALE: Locale = 'zh';
const STORAGE_KEY = 'echarts-flow-locale';
const QUERY_PARAM = 'lang';

/** Translations for one page: `messages[locale][key] = text`. */
export type Messages = Record<Locale, Record<string, string>>;

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** First supported locale that the browser prefers, if any. */
function detectBrowserLocale(): Locale | null {
  for (const language of navigator.languages ?? [navigator.language]) {
    const base = language.toLowerCase().split('-')[0];
    const match = LOCALES.find((locale) => locale === base);
    if (match) {
      return match;
    }
  }
  return null;
}

/** URL `?lang=` wins, then the stored choice, then the browser, then the default. */
export function resolveLocale(): Locale {
  const fromQuery = new URLSearchParams(window.location.search).get(QUERY_PARAM);
  if (isLocale(fromQuery)) {
    return fromQuery;
  }
  return readStoredLocale() ?? detectBrowserLocale() ?? DEFAULT_LOCALE;
}

/** Persists the choice and reflects it in the URL so the page can be shared in that language. */
export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Private mode or storage disabled: the URL param still carries the choice.
  }
  const url = new URL(window.location.href);
  url.searchParams.set(QUERY_PARAM, locale);
  window.history.replaceState(null, '', url);
}

/**
 * Fills the page for `locale`. Each element may carry:
 * - `data-i18n="key"`         sets textContent
 * - `data-i18n-html="key"`    sets innerHTML (for text with inline markup)
 * - `data-i18n-attr="attr:key, attr:key"` sets attributes, e.g. `title:tipSave`
 * Missing keys leave the existing markup untouched, so the default-language
 * text written in the HTML stays as a fallback.
 */
export function applyMessages(messages: Messages, locale: Locale): void {
  const dict = messages[locale] ?? {};
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const text = dict[element.dataset.i18n ?? ''];
    if (text !== undefined) {
      element.textContent = text;
    }
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
    const html = dict[element.dataset.i18nHtml ?? ''];
    if (html !== undefined) {
      element.innerHTML = html;
    }
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((element) => {
    (element.dataset.i18nAttr ?? '').split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      const value = dict[key];
      if (attr && value !== undefined) {
        element.setAttribute(attr, value);
      }
    });
  });
}

/** Runs `listener` for the current locale now and whenever the user switches. */
const listeners = new Set<(locale: Locale) => void>();
/**
 * Resolved at module load, before any listener registers, so a listener added
 * before setupI18n still gets the right locale immediately.
 */
let currentLocale: Locale = resolveLocale();

export function onLocaleChange(listener: (locale: Locale) => void): void {
  listeners.add(listener);
  listener(currentLocale);
}

/** Switches the active locale: persists it and notifies every listener. */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  storeLocale(locale);
  listeners.forEach((listener) => listener(locale));
}

/**
 * Starts i18n for a page: resolves the locale, translates on every change, and
 * mounts a language switch into each element matching `switchSelector`.
 * Returns the resolved locale.
 */
export function setupI18n(messages: Messages, switchSelector = '[data-lang-switch]'): Locale {
  currentLocale = resolveLocale();
  onLocaleChange((locale) => applyMessages(messages, locale));
  document.querySelectorAll<HTMLElement>(switchSelector).forEach(mountLangSwitch);
  return currentLocale;
}

/** Renders one button per locale; the active one is marked and disabled. */
export function mountLangSwitch(container: HTMLElement): void {
  container.textContent = '';
  container.classList.add('lang-switch');
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Language');
  LOCALES.forEach((locale) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lang-switch__option';
    button.textContent = LOCALE_NAMES[locale];
    button.dataset.locale = locale;
    button.addEventListener('click', () => setLocale(locale));
    container.append(button);
  });
  onLocaleChange((locale) => {
    container.querySelectorAll<HTMLButtonElement>('.lang-switch__option').forEach((button) => {
      const isActive = button.dataset.locale === locale;
      button.classList.toggle('lang-switch__option--active', isActive);
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  });
}
