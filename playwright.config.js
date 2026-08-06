/**
 * Playwright Configuration — The Binding
 *
 * Used by Layer 2 (render) and Layer 3 (interaction) UX/UI tests.
 *
 * Run all UX/UI tests:   npx playwright test tests/uxui-
 * Run Layer 2 only:      npx playwright test tests/uxui-render.test.js
 * Run Layer 3 only:      npx playwright test tests/uxui-interaction.test.js
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/uxui-*.test.js',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'smoke',
      testMatch: '**/uxui-smoke-journey.test.js',
      use: {
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'ipad-portrait',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 810, height: 1080 },
      },
    },
    {
      name: 'ipad-air-portrait',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 820, height: 1180 },
      },
    },
    {
      name: 'iphone-15-pro',
      use: {
        ...devices['iPhone 15 Pro'],
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: 'node server.js',
    port: 3000,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
