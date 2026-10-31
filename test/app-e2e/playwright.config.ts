import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:5181',
    browserName: 'chromium',
    locale: 'en-US',
    viewport: { width: 1280, height: 1024 },
  },
  webServer: {
    command: 'npm run dev:web -- --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: false,
  },
})
