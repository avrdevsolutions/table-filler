import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * The E2E test suite starts the Next.js dev server automatically and runs
 * against a dedicated test SQLite database (e2e-test.db) to avoid polluting
 * the development database.
 *
 * Run:
 *   npm run test:e2e          # headless (default)
 *   npm run test:e2e:headed   # headed (interactive)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // keep serial — tests share a local DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // single worker to avoid DB race conditions
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: 'file:./prisma/e2e-test.db',
      NEXTAUTH_SECRET: 'e2e-test-secret-key-not-for-production',
      NEXTAUTH_URL: 'http://localhost:3001',
    },
  },
});
