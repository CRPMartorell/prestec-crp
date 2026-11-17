import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const API_PORT = 8080;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Les proves comparteixen base de dades: s'executen en sèrie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'ca-ES',
    timezoneId: 'Europe/Madrid',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Backend PHP (SQLite en local; MySQL al hosting).
      command: 'php -S 127.0.0.1:8080 -t server/public server/public/index.php',
      url: `${API_URL}/api/sessio`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { CRP_TEST_RESET: '1', CRP_MAIL: 'log' },
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
