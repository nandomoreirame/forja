import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve('src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    // Full WorkbenchPage renders take under 1s alone but exceed 5s when every worker runs at once.
    testTimeout: 15_000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'out/**',
      'test/e2e/**',
      'test/app-e2e/**',
      '**/playwright.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/shared/ui/**/*.{ts,tsx}',
        'src/shared/i18n/**/*.ts',
        'src/widgets/**/*.{ts,tsx}',
        'site/src/**/*.{ts,tsx}',
        'src/renderer/src/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/renderer/src/main.tsx',
        '**/index.ts',
        'site/src/main.tsx',
        '**/mermaid-preview.tsx',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
