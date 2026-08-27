'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Storyline V2 Northstar public shell', () => {
  test('serves the reading-first launch surface', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.northstar-app')).toBeVisible();
    await expect(page.locator('#launch-title')).toHaveText('Open Dracula');
    await expect(page.locator('#class-select')).toBeVisible();
    await expect(page.locator('#token')).toHaveAttribute('type', 'password');
    await expect(page.locator('#launch-form button[type="submit"]')).toHaveText('Begin the journey');

    const source = await page.locator('body').textContent();
    expect(source).not.toContain('scene_00');
    expect(source).not.toContain('Chapter 1:');
  });

  test('keeps the authored reading shell responsive and accessible', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('main.northstar-app')).toBeVisible();
    await expect(page.locator('#launch-form')).toBeVisible();
    await expect(page.locator('#token-help')).toBeVisible();
    await expect(page.locator('#launch-form button[type="submit"]')).toHaveCSS('min-height', /^(4[4-9]|[5-9]\d|\d{3,})px$/);
  });
});
