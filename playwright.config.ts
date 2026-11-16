import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    env: {
      NEXT_PUBLIC_CLOUD_FAKE: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'http://fake.local',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake',
    },
    // Never reuse: a server started without the fake-cloud env would silently hide the friends UI.
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    { name: 'desktop', testMatch: /core-flow\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'friends', testMatch: /friends\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } },
  ],
})
