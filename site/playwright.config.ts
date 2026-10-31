import { defineConfig, devices } from '@playwright/test'

const port = 4173

export default defineConfig({
  testDir: '../test/e2e',
  testMatch: 'site.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  outputDir: '../test-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run build:site && npx vite preview --config site/vite.config.ts --port ${port} --strictPort`,
    cwd: '..',
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
