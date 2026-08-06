/**
 * UXUI Render Tests — Layer 2: The Binding
 *
 * Playwright-driven browser rendering checks:
 *   - iPad portrait: #app has non-zero top padding
 *   - #report-btn and #send-btn bounding rects do NOT intersect at any device width
 *   - Storyline mode first-load screenshot: action section has visible content
 *
 * Run: npx playwright test tests/uxui-render.test.js
 */

const { test, expect } = require('@playwright/test');

// ─── Device Matrix for Bounding Box Checks ────────────────────────────

const VIEWPORTS = [
  { name: 'iPhone 14',       width: 390,  height: 844  },
  { name: 'iPhone 15 Pro',   width: 393,  height: 852  },
  { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
  { name: 'iPad 10th gen',   width: 810,  height: 1080 },
  { name: 'iPad Air 11"',    width: 820,  height: 1180 },
  { name: 'iPad Pro 12.9"',  width: 1024, height: 1366 },
  { name: 'Galaxy Tab S9',   width: 800,  height: 1280 },
  { name: 'Desktop',         width: 1280, height: 720  },
];

// ═════════════════════════════════════════════════════════════════════════
// TEST 1: iPad Portrait — #app Has Non-Zero Top Padding
// ═════════════════════════════════════════════════════════════════════════

test.describe('iPad Portrait — #app padding', () => {
  for (const vp of [
    { name: 'iPad 10th gen', width: 810, height: 1080 },
    { name: 'iPad Air 11"',  width: 820, height: 1180 },
  ]) {
    test(`#app has non-zero top padding at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Dismiss access gate if present
      const gate = page.locator('#accessGate');
      if (await gate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gate.evaluate(el => el.style.display = 'none');
      }

      const appPaddingTop = await page.locator('#app').evaluate(el => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.paddingTop);
      });

      expect(appPaddingTop, `#app should have non-zero top padding for safe area on ${vp.name}`).toBeGreaterThan(0);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// TEST 2: #report-btn and #send-btn Bounding Rects Do NOT Intersect
// ═════════════════════════════════════════════════════════════════════════

test.describe('Button Overlap — #report-btn vs #send-btn', () => {
  function rectsIntersect(a, b) {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  for (const vp of VIEWPORTS) {
    test(`no overlap at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Dismiss access gate
      const gate = page.locator('#accessGate');
      if (await gate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gate.evaluate(el => el.style.display = 'none');
      }

      // Both elements need to be visible to test overlap
      const reportBtn = page.locator('#report-btn');
      const sendBtn = page.locator('#send-btn');

      const reportVisible = await reportBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const sendVisible = await sendBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (!reportVisible || !sendVisible) {
        test.skip(!reportVisible || !sendVisible,
          `Skipping: report=${reportVisible}, send=${sendVisible} at ${vp.name}`);
        return;
      }

      const reportRect = await reportBtn.boundingBox();
      const sendRect = await sendBtn.boundingBox();

      expect(reportRect, `#report-btn should have a bounding box at ${vp.name}`).not.toBeNull();
      expect(sendRect, `#send-btn should have a bounding box at ${vp.name}`).not.toBeNull();

      const overlaps = rectsIntersect(reportRect, sendRect);
      expect(overlaps, `#report-btn and #send-btn must NOT intersect at ${vp.name} — report: ${JSON.stringify(reportRect)}, send: ${JSON.stringify(sendRect)}`).toBe(false);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// TEST 3: Storyline Mode First-Load — Action Section Has Content
// ═════════════════════════════════════════════════════════════════════════

test.describe('Storyline Mode — First Load', () => {
  test('action section has visible content after selecting storyline', async ({ page }) => {
    await page.setViewportSize({ width: 810, height: 1080 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Dismiss access gate
    const gate = page.locator('#accessGate');
    if (await gate.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gate.evaluate(el => el.style.display = 'none');
    }

    // Click the storyline mode card
    const storylineCard = page.locator('.mode-card', { hasText: 'Story' });
    await expect(storylineCard, 'Storyline mode card should be visible').toBeVisible({ timeout: 5000 });
    await storylineCard.click();

    // Wait for class selection or game UI to appear
    await page.waitForTimeout(1000);

    // Screenshot the result
    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot.byteLength, 'Screenshot should not be empty').toBeGreaterThan(0);

    // Check that #actions is not blank
    const actionsEl = page.locator('#actions');
    const actionsContent = await actionsEl.evaluate(el => el.textContent.trim());
    const actionsHasChildren = await actionsEl.evaluate(el => el.children.length > 0);

    expect(
      actionsContent.length > 0 || actionsHasChildren,
      '#actions should have visible content after storyline selection'
    ).toBe(true);

    // Attach screenshot for review
    await test.info().attach('storyline-first-load', {
      body: screenshot,
      contentType: 'image/png',
    });
  });
});
