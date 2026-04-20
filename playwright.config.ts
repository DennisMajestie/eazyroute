import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 2,
  workers: 1,
  reporter: 'html',
  timeout: 180000, // 3 minutes
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 }, // iPhone 12/13 mobile view
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

