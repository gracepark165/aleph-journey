import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    { name: 'desktop', testMatch: /core-flow\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } },
  ],
})
