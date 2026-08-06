/**
 * UXUI Smoke Journey Test — The Binding
 *
 * Full end-to-end smoke journey: load → mode select → class pick →
 * action buttons → click action → DM response → voice toggle.
 *
 * Run: npx playwright test tests/uxui-smoke-journey.test.js
 * Run (smoke project only): npx playwright test --project=smoke
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

// ═════════════════════════════════════════════════════════════════════════
// SMOKE JOURNEY: Full Player Flow
// ═════════════════════════════════════════════════════════════════════════

test.describe('Smoke Journey — Full Player Flow', () => {
  test('complete journey: load → mode → class → actions → DM response', async ({ page }) => {
    // ── Step 1: Load the app ──
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissAccessGate(page);

    // Verify the app loaded
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible({ timeout: 5000 });

    // ── Step 2: Select Storyline mode ──
    const storylineCard = page.locator('.mode-card', { hasText: 'Story' });
    await expect(storylineCard).toBeVisible({ timeout: 5000 });
    await storylineCard.click();
    await page.waitForTimeout(1000);

    // ── Step 3: Pick a class (if class selection appears) ──
    const classSelection = page.locator('#classSelection, .class-selection, .class-card');
    const classVisible = await classSelection.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (classVisible) {
      // Click the first available class
      const firstClass = page.locator('.class-card, .class-option').first();
      await firstClass.click();
      await page.waitForTimeout(1000);
    }

    // ── Step 4: Wait for game UI to load ──
    // The messages container should appear
    const messagesContainer = page.locator('#messages');
    await expect(messagesContainer).toBeVisible({ timeout: 10000 });

    // ── Step 5: Verify DM narration appears ──
    // Wait for the first DM message (narration)
    const dmMessage = page.locator('.msg.dm, .message.dm, [data-type="dm"]').first();
    await expect(dmMessage).toBeVisible({ timeout: 15000 });

    // ── Step 6: Check action buttons appear ──
    const actionsContainer = page.locator('#actions');
    await expect(actionsContainer).toBeVisible({ timeout: 10000 });

    // Verify at least one action button exists
    const actionButtons = page.locator('#actions button, #actions .action-btn, .action-button');
    const actionCount = await actionButtons.count();
    expect(actionCount, 'Should have at least one action button').toBeGreaterThan(0);

    // ── Step 7: Click an action button ──
    const firstAction = actionButtons.first();
    const actionText = await firstAction.textContent();
    await firstAction.click();

    // ── Step 8: Verify player action message appears ──
    const playerMessage = page.locator('.msg.player, .message.player, [data-type="player"]').first();
    await expect(playerMessage).toBeVisible({ timeout: 5000 });

    // ── Step 9: Wait for DM response ──
    // After clicking an action, the DM should respond with narration
    // Wait for a new DM message to appear (after the player action)
    await page.waitForTimeout(3000); // Give the DM time to respond

    // Check that we have at least 2 DM messages now (initial + response)
    const allDmMessages = page.locator('.msg.dm, .message.dm, [data-type="dm"]');
    const dmCount = await allDmMessages.count();
    expect(dmCount, 'Should have at least 2 DM messages after action').toBeGreaterThanOrEqual(2);

    // ── Step 10: Verify voice toggle exists ──
    const voiceToggle = page.locator('#voiceToggle, .voice-toggle, [data-action="toggle-voice"]');
    const voiceToggleVisible = await voiceToggle.isVisible({ timeout: 2000 }).catch(() => false);

    // Voice toggle should exist (may be hidden on some viewports)
    if (voiceToggleVisible) {
      // Click voice toggle to enable voice
      await voiceToggle.click();
      await page.waitForTimeout(500);

      // Verify voice state changed (button should have active class or state)
      const isActive = await voiceToggle.evaluate(el => {
        return el.classList.contains('active') ||
               el.classList.contains('on') ||
               el.getAttribute('aria-pressed') === 'true' ||
               el.dataset.state === 'on';
      });
      // Voice toggle should be in active state after click
      expect(isActive, 'Voice toggle should be active after click').toBe(true);
    }
  });

  test('responsive: journey works on mobile viewport', async ({ page }) => {
    // ── Mobile viewport ──
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissAccessGate(page);

    // Verify app loads on mobile
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible({ timeout: 5000 });

    // Select storyline mode
    const storylineCard = page.locator('.mode-card', { hasText: 'Story' });
    await expect(storylineCard).toBeVisible({ timeout: 5000 });
    await storylineCard.click();
    await page.waitForTimeout(1000);

    // Pick class if visible
    const classSelection = page.locator('#classSelection, .class-selection, .class-card');
    const classVisible = await classSelection.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (classVisible) {
      await page.locator('.class-card, .class-option').first().click();
      await page.waitForTimeout(1000);
    }

    // Verify messages appear on mobile
    const messagesContainer = page.locator('#messages');
    await expect(messagesContainer).toBeVisible({ timeout: 10000 });

    // Verify DM message appears
    const dmMessage = page.locator('.msg.dm, .message.dm, [data-type="dm"]').first();
    await expect(dmMessage).toBeVisible({ timeout: 15000 });

    // Verify action buttons appear on mobile
    const actionsContainer = page.locator('#actions');
    await expect(actionsContainer).toBeVisible({ timeout: 10000 });

    const actionButtons = page.locator('#actions button, #actions .action-btn, .action-button');
    const actionCount = await actionButtons.count();
    expect(actionCount, 'Should have action buttons on mobile').toBeGreaterThan(0);
  });
});
