import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve('src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'out/**',
      'test/e2e/**',
      '**/playwright.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/shared/ui/**/*.{ts,tsx}',
        'src/shared/i18n/**/*.ts',
        'src/widgets/**/*.{ts,tsx}',
        'site/src/**/*.{ts,tsx}',
      ],
      exclude: ['**/index.ts', 'site/src/main.tsx', '**/mermaid-preview.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
