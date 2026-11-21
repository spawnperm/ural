import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Deliberately minimal: the specs start the app themselves, so there is no
 * `webServer` block and no fixed port to collide with a running dev server.
 *
 * Chromium only. The portal's risk is in interaction wiring, which every engine
 * exercises the same way; adding Firefox and WebKit would triple the CI time to
 * catch engine-specific layout quirks this content does not have. Revisit if the
 * UI grows features that differ by engine.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
