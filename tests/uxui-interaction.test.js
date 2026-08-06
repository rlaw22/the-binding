/**
 * UXUI Interaction Tests — Layer 3: The Binding
 *
 * Playwright-driven user interaction checks:
 *   - Click storyline adventure → action buttons appear (no refresh required)
 *   - Report button is always clickable (not obscured by send button or action bar)
 *
 * Run: npx playwright test tests/uxui-interaction.test.js
 */

const { test, expect } = require('@playwright/test');

// ═════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════

async function dismissAccessGate(page) {
  const gate = page.locator('#accessGate');
  if (await gate.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gate.evaluate(el => el.style.display = 'none');
  }
}

async function clickElementAtPoint(page, selector) {
  // Use JavaScript click as a fallback for elements Playwright can't see
  const box = await page.locator(selector).boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await page.locator(selector).click({ force: true });
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 1: Click Storyline → Action Buttons Appear (No Refresh)
// ═════════════════════════════════════════════════════════════════════════

test.describe('Storyline Mode — Action Buttons Appear', () => {
  test('clicking storyline adventure shows action buttons without page refresh', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await dismissAccessGate(page);

    // Verify #actions is hidden initially
    const actionsInitiallyHidden = await page.locator('#actions').evaluate(el => {
      const style = window.getComputedStyle(el);
      return el.classList.contains('hidden') || style.display === 'none';
    });
    expect(actionsInitiallyHidden, '#actions should be hidden on initial load').toBe(true);

    // Click the storyline mode card
    const storylineCard = page.locator('.mode-card', { hasText: 'Story' });
    await expect(storylineCard).toBeVisible({ timeout: 5000 });
    await storylineCard.click();

    // Wait for class selection overlay or game UI to transition
    // The app should show class selection first, then we pick a class
    await page.waitForTimeout(1500);

    // If class selection overlay appeared, pick the first available class
    const classOverlay = page.locator('#class-select-overlay');
    if (await classOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
      const firstClassBtn = classOverlay.locator('button, .class-option, [onclick]').first();
      if (await firstClassBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstClassBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Now check that #actions is visible
    const actionsVisible = await page.locator('#actions').evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && !el.classList.contains('hidden') && style.visibility !== 'hidden';
    });

    expect(actionsVisible, '#actions should be visible after storyline selection (no refresh needed)').toBe(true);

    // Also verify action buttons have content
    const actionBtnCount = await page.locator('#action-buttons').evaluate(el => {
      return el.querySelectorAll('button, .story-btn, .action-btn, [onclick]').length;
    });
    expect(actionBtnCount, 'Action buttons area should contain interactive elements').toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST 2: Report Button Always Clickable
// ═════════════════════════════════════════════════════════════════════════

test.describe('Report Button — Always Clickable', () => {
  const VIEWPORTS_TO_TEST = [
    { name: 'iPhone 15 Pro',   width: 393,  height: 852  },
    { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
    { name: 'iPad 10th gen',   width: 810,  height: 1080 },
    { name: 'iPad Air 11"',    width: 820,  height: 1180 },
    { name: 'Desktop',         width: 1280, height: 720  },
  ];

  for (const vp of VIEWPORTS_TO_TEST) {
    test(`#report-btn is clickable at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      await dismissAccessGate(page);

      const reportBtn = page.locator('#report-btn');

      // 1. Check visibility
      const isVisible = await reportBtn.isVisible({ timeout: 3000 }).catch(() => false);
      expect(isVisible, `#report-btn should be visible at ${vp.name}`).toBe(true);

      // 2. Check it's not obscured (z-index, pointer-events)
      const isClickable = await reportBtn.evaluate(el => {
        const style = window.getComputedStyle(el);
        return (
          style.pointerEvents !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          parseInt(style.zIndex, 10) > 0
        );
      });
      expect(isClickable, `#report-btn should be clickable at ${vp.name} (not obscured)`).toBe(true);

      // 3. Check no higher z-index element covers it at its exact position
      const reportRect = await reportBtn.boundingBox();
      expect(reportRect, `#report-btn should have a bounding box at ${vp.name}`).not.toBeNull();

      const centerX = reportRect.x + reportRect.width / 2;
      const centerY = reportRect.y + reportRect.height / 2;

      const elementAtPoint = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        return {
          id: el.id,
          tagName: el.tagName,
          className: el.className,
          isReportBtn: el.id === 'report-btn' || el.closest('#report-btn') !== null,
        };
      }, { x: centerX, y: centerY });

      expect(elementAtPoint, `Should hit-test at report button center on ${vp.name}`).not.toBeNull();
      expect(
        elementAtPoint.isReportBtn,
        `elementFromPoint at #report-btn center should be the report button itself on ${vp.name} (hit: #${elementAtPoint.id} <${elementAtPoint.tagName}>)`
      ).toBe(true);
    });
  }

  test('clicking #report-btn opens the report modal', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await dismissAccessGate(page);

    const reportBtn = page.locator('#report-btn');
    await expect(reportBtn).toBeVisible({ timeout: 5000 });
    await reportBtn.click();

    // Report modal should become visible
    const reportModal = page.locator('#report-modal');
    const modalVisible = await reportModal.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' || el.classList.contains('show');
    });

    expect(modalVisible, 'Clicking #report-btn should open the report modal').toBe(true);
  });
});
