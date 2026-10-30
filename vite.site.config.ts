import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Builds the demo and every case page as a static site for GitHub Pages.
 * `SITE_BASE` is the path the site is served under, e.g. /echarts-flow/.
 */
const root = import.meta.dirname;
const casePages = readdirSync(resolve(root, 'test/cases')).filter((file) => file.endsWith('.html'));

export default defineConfig({
  root,
  base: process.env.SITE_BASE ?? '/',
  build: {
    outDir: 'site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        demo: resolve(root, 'index.html'),
        ...Object.fromEntries(casePages.map((file) => [`cases/${file.replace('.html', '')}`, resolve(root, 'test/cases', file)])),
      },
    },
  },
});
