/**
 * Dark mode for the site: a three-way switch (light / dark / system) rendered
 * next to the language picker, persisted in localStorage and resolved against
 * `prefers-color-scheme`. The active choice lands on `<html data-theme>`, so
 * every page (and the hero chart's theme choice) can react to it.
 */

const STORAGE_KEY = 'echarts-flow-theme';

export type ThemeChoice = 'light' | 'dark' | 'system';

function isChoice(value: string | null): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** The OS preference, regardless of what the user picked in the switch. */
function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The theme that should currently be on screen. */
export function resolvedTheme(choice: ThemeChoice): 'light' | 'dark' {
  return choice === 'system' ? systemTheme() : choice;
}

/** The user's stored choice (or 'system'), re-read on each call. */
export const currentThemeChoice = readStoredChoice;

function applyChoice(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolvedTheme(choice);
  listeners.forEach((listener) => listener(resolvedTheme(choice)));
}

/** Listeners notified whenever the resolved theme flips (switch click or OS change). */
type ThemeListener = (theme: 'light' | 'dark') => void;
const listeners = new Set<ThemeListener>();

/** Runs `listener` for the resolved theme now and on every change. */
export function onThemeChange(listener: ThemeListener): void {
  listeners.add(listener);
  listener(resolvedTheme(readStoredChoice()));
}

/**
 * Applies the stored choice immediately (call once at page startup, before
 * first paint if possible) and keeps following the OS while in `system` mode.
 * Safe to call from several entry points: only the first call wires the OS
 * listener.
 */
export function initTheme(): ThemeChoice {
  if (booted) {
    return readStoredChoice();
  }
  booted = true;
  const choice = readStoredChoice();
  applyChoice(choice);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readStoredChoice() === 'system') {
      applyChoice('system');
    }
  });
  return choice;
}

let booted = false;

/** Sets the choice, persists it and updates the page. */
export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private mode: the page stays on the resolved theme until reload.
  }
  applyChoice(choice);
}

/**
 * Mounts the toggle into each container matching `selector` (the layout puts a
 * `[data-theme-switch]` span in the nav). Three-state cycle with a title that
 * names the next mode; re-rendered on locale change so the title translates.
 */
export function mountThemeSwitch(titles: Record<ThemeChoice, string>, selector = '[data-theme-switch]'): void {
  const render = (container: HTMLElement): void => {
    container.textContent = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-switch';
    const current = readStoredChoice();
    button.dataset.choice = current;
    button.title = titles[current];
    button.setAttribute('aria-label', titles[current]);
    // A single glyph per mode keeps the button tiny in every locale.
    button.textContent = current === 'dark' ? '☾' : current === 'light' ? '☀' : '◐';
    button.addEventListener('click', () => {
      const next: ThemeChoice = readStoredChoice() === 'light' ? 'dark' : readStoredChoice() === 'dark' ? 'system' : 'light';
      setThemeChoice(next);
      render(container);
    });
    container.append(button);
  };
  document.querySelectorAll<HTMLElement>(selector).forEach(render);
}
