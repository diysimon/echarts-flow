import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const CASE_PAGES = [
  '01-static-display',
  '02-shapes-and-status',
  '03-layout-direction',
  '04-blank-editor',
  '05-status-monitor',
  '06-json-import-export',
  '07-large-graph',
  '08-multi-instance',
  '09-themes',
  '10-swimlane-horizontal',
  '11-swimlane-vertical',
  '12-style-gallery',
  '13-swimlane-gallery',
  '14-edit-options',
  '15-aurora',
  '16-export-interop',
  '17-text-clarity',
];
const RENDERERS = ['canvas', 'svg'] as const;
/**
 * Pages without a chart: the light theme has no grid, so an empty editor paints
 * nothing, and the text clarity page draws its samples without ECharts.
 */
const PAGES_WITHOUT_CHART = new Set(['04-blank-editor', '17-text-clarity']);
/** Fixed start time and settle time for the fake clock, so animations end in the same frame every run. */
const CLOCK_START = new Date('2026-01-01T00:00:00Z');
const SETTLE_TIME = 3000;

/** Loads a case page under a paused fake clock and lets layout and animations finish. */
async function openCase(page: Page, name: string, renderer: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) {
      errors.push(message.text());
    }
  });
  await page.clock.install({ time: CLOCK_START });
  await page.goto(`/test/cases/${name}.html?renderer=${renderer}`);
  await page.clock.runFor(SETTLE_TIME);
  return errors;
}

for (const name of CASE_PAGES) {
  for (const renderer of RENDERERS) {
    test(`${name} renders without errors in ${renderer}`, async ({ page }) => {
      // Act
      const errors = await openCase(page, name, renderer);

      // Assert
      expect(errors).toEqual([]);
    });

    test(`${name} draws a chart in ${renderer}`, async ({ page }) => {
      test.skip(PAGES_WITHOUT_CHART.has(name), 'This page has no chart to draw');

      // Act
      await openCase(page, name, renderer);

      // Assert
      await expect(page.locator(renderer === 'svg' ? 'section svg' : 'section canvas').first()).toBeVisible();
    });
  }

  /**
   * Baselines carry the platform in their file name because font rendering
   * differs between systems. Run `npm run test:e2e:update` to record them.
   * A missing baseline is recorded and the test passes with a note; Playwright's
   * own `--update-snapshots=missing` writes it too but still fails the test.
   */
  test(`${name} looks the same as the baseline`, async ({ page }, testInfo) => {
    // Act
    await openCase(page, name, 'canvas');

    // Assert
    const fileName = `${name}.png`;
    const baselinePath = testInfo.snapshotPath(fileName, { kind: 'screenshot' });
    if (!existsSync(baselinePath)) {
      // Same capture settings as toHaveScreenshot, so the recorded file compares cleanly later.
      await page.screenshot({ path: baselinePath, fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });
      testInfo.annotations.push({ type: 'baseline', description: `Recorded ${baselinePath}; commit it to start comparing` });
      return;
    }
    await expect(page).toHaveScreenshot(fileName, { fullPage: true });
  });
}
