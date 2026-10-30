import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Builds the demo and every case page as a static site for GitHub Pages.
 * `SITE_BASE` is the path the site is served under, e.g. /echarts-flow/.
 */
const root = import.meta.dirname;
const casePages = readdirSync(resolve(root, 'test/cases')).filter((file) => file.endsWith('.html'));

const LICENSE_FILE_PATTERN = /^(licen[cs]e|notice|copyright)/i;
/** Extra license folders some packages ship for code they include, such as ECharts' d3 parts. */
const EXTRA_LICENSE_DIRS = ['licenses'];
const THIRD_PARTY_FILE = 'third-party-licenses.txt';

/** Directory of the package that a bundled module file belongs to. */
function findPackageDir(moduleId: string): string | null {
  const marker = 'node_modules/';
  const index = moduleId.lastIndexOf(marker);
  if (index < 0) {
    return null;
  }
  const rest = moduleId.slice(index + marker.length).split('/');
  const nameParts = rest[0].startsWith('@') ? rest.slice(0, 2) : rest.slice(0, 1);
  return join(moduleId.slice(0, index + marker.length), ...nameParts);
}

function readLicenseTexts(packageDir: string): string[] {
  const read = (dir: string) => readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && LICENSE_FILE_PATTERN.test(entry.name))
    .map((entry) => `--- ${entry.name} ---\n${readFileSync(join(dir, entry.name), 'utf8').trim()}`);
  const extraDirs = EXTRA_LICENSE_DIRS.map((name) => join(packageDir, name)).filter(existsSync);
  return [...read(packageDir), ...extraDirs.flatMap(read)];
}

/**
 * The site bundles ECharts, zrender, dagre and the rest of the runtime code,
 * so it is a redistribution: write their license and notice texts next to it.
 */
function thirdPartyLicenses(): Plugin {
  return {
    name: 'third-party-licenses',
    apply: 'build',
    generateBundle() {
      const packageDirs = new Set<string>();
      for (const moduleId of this.getModuleIds()) {
        const dir = findPackageDir(moduleId.replace(/\\/g, '/').replace(/^\0/, ''));
        if (dir && existsSync(join(dir, 'package.json'))) {
          packageDirs.add(dir);
        }
      }
      // Some packages inline their dependencies into their own build (dagre inlines graphlib),
      // so list every installed dependency of a bundled package as well.
      packageDirs.forEach((dir) => {
        const { dependencies = {} } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
        Object.keys(dependencies)
          .map((name) => resolve(root, 'node_modules', name))
          .filter((dependencyDir) => existsSync(join(dependencyDir, 'package.json')))
          .forEach((dependencyDir) => packageDirs.add(dependencyDir));
      });
      const sections = Array.from(packageDirs).sort().map((dir) => {
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; version: string; license?: string };
        return [`=== ${manifest.name}@${manifest.version} (${manifest.license ?? 'see below'}) ===`, ...readLicenseTexts(dir)].join('\n\n');
      });
      const header = 'Third-party software bundled in this site, with its license and notice texts.';
      this.emitFile({ type: 'asset', fileName: THIRD_PARTY_FILE, source: `${header}\n\n${sections.join('\n\n\n')}\n` });
    },
  };
}

export default defineConfig({
  root,
  base: process.env.SITE_BASE ?? '/',
  plugins: [thirdPartyLicenses()],
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
