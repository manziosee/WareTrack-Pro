import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests that click through the main flows. They expect the API and
 * the app to be running on a test database seeded with backend/prisma/e2e-seed.ts
 * (CI does this; see .github/workflows/ci.yml).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Locally use the installed Chrome; CI installs Playwright's Chromium
    ...(process.env.CI ? {} : { channel: 'chrome' }),
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], ...(process.env.CI ? {} : { channel: 'chrome' }) } }],
});
