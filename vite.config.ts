import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'echartsFlow',
      fileName: 'echarts-flow',
    },
    rollupOptions: {
      external: ['echarts', /^echarts\//, '@dagrejs/dagre'],
      output: {
        globals: { echarts: 'echarts', 'echarts/core': 'echarts', '@dagrejs/dagre': 'dagre' },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
