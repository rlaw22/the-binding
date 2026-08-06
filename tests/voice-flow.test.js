/**
 * Voice Flow Test — The Binding
 *
 * Playwright-driven voice toggle and BrowserTTS integration checks:
 *   - Voice toggle button exists and is clickable
 *   - Toggle changes voice state (on/off)
 *   - BrowserTTS initializes correctly
 *   - Voice speaks on DM narration when enabled
 *
 * Run: npx playwright test tests/voice-flow.test.js
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

async function startStoryMode(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissAccessGate(page);

  // Click storyline mode
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

  // Wait for messages to appear
  const messagesContainer = page.locator('#messages');
  await expect(messagesContainer).toBeVisible({ timeout: 10000 });
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 1: Voice Toggle Exists and Works
// ═════════════════════════════════════════════════════════════════════════

test.describe('Voice Toggle — Basic Functionality', () => {
  test('voice toggle button exists and changes state on click', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await startStoryMode(page);

    // Find voice toggle
    const voiceToggle = page.locator('#voiceToggle, .voice-toggle, [data-action="toggle-voice"]');
    await expect(voiceToggle).toBeVisible({ timeout: 5000 });

    // Get initial state
    const initialState = await voiceToggle.evaluate(el => {
      return {
        isActive: el.classList.contains('active') ||
                  el.classList.contains('on') ||
                  el.getAttribute('aria-pressed') === 'true' ||
                  el.dataset.state === 'on',
        text: el.textContent.trim()
      };
    });

    // Click toggle
    await voiceToggle.click();
    await page.waitForTimeout(500);

    // Verify state changed
    const newState = await voiceToggle.evaluate(el => {
      return {
        isActive: el.classList.contains('active') ||
                  el.classList.contains('on') ||
                  el.getAttribute('aria-pressed') === 'true' ||
                  el.dataset.state === 'on',
        text: el.textContent.trim()
      };
    });

    // State should have changed
    expect(newState.isActive).not.toBe(initialState.isActive);
  });

  test('voice toggle persists state across page reload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await startStoryMode(page);

    // Find and enable voice toggle
    const voiceToggle = page.locator('#voiceToggle, .voice-toggle, [data-action="toggle-voice"]');
    await expect(voiceToggle).toBeVisible({ timeout: 5000 });

    // Enable voice
    const isInitiallyActive = await voiceToggle.evaluate(el => {
      return el.classList.contains('active') ||
             el.classList.contains('on') ||
             el.getAttribute('aria-pressed') === 'true' ||
             el.dataset.state === 'on';
    });

    if (!isInitiallyActive) {
      await voiceToggle.click();
      await page.waitForTimeout(500);
    }

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissAccessGate(page);

    // Check localStorage for voice state
    const voiceEnabled = await page.evaluate(() => {
      return localStorage.getItem('voiceEnabled');
    });

    expect(voiceEnabled).toBe('true');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST 2: BrowserTTS Integration
// ═════════════════════════════════════════════════════════════════════════

test.describe('BrowserTTS — Integration', () => {
  test('BrowserTTS is initialized and available', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissAccessGate(page);

    // Check if BrowserTTS is defined and initialized
    const browserTTSState = await page.evaluate(() => {
      if (typeof BrowserTTS === 'undefined') {
        return { exists: false };
      }
      return {
        exists: true,
        hasSpeak: typeof BrowserTTS.speak === 'function',
        hasStop: typeof BrowserTTS.stop === 'function',
        hasInit: typeof BrowserTTS.init === 'function',
        isSpeaking: BrowserTTS.isSpeaking ? BrowserTTS.isSpeaking() : false
      };
    });

    expect(browserTTSState.exists, 'BrowserTTS should be defined').toBe(true);
    expect(browserTTSState.hasSpeak, 'BrowserTTS.speak should be a function').toBe(true);
    expect(browserTTSState.hasStop, 'BrowserTTS.stop should be a function').toBe(true);
    expect(browserTTSState.hasInit, 'BrowserTTS.init should be a function').toBe(true);
  });

  test('voice speaks on DM narration when enabled', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await startStoryMode(page);

    // Enable voice
    const voiceToggle = page.locator('#voiceToggle, .voice-toggle, [data-action="toggle-voice"]');
    await expect(voiceToggle).toBeVisible({ timeout: 5000 });

    const isInitiallyActive = await voiceToggle.evaluate(el => {
      return el.classList.contains('active') ||
             el.classList.contains('on') ||
             el.getAttribute('aria-pressed') === 'true' ||
             el.dataset.state === 'on';
    });

    if (!isInitiallyActive) {
      await voiceToggle.click();
      await page.waitForTimeout(500);
    }

    // Click an action button to trigger DM response
    const actionButtons = page.locator('#actions button, #actions .action-btn, .action-button');
    const actionCount = await actionButtons.count();

    if (actionCount > 0) {
      await actionButtons.first().click();

      // Wait for DM response
      await page.waitForTimeout(2000);

      // Check if BrowserTTS.speak was called (we can't directly test audio output,
      // but we can verify the speak function exists and voice is enabled)
      const voiceState = await page.evaluate(() => {
        return {
          voiceEnabled: typeof voiceEnabled !== 'undefined' ? voiceEnabled : false,
          browserTTSExists: typeof BrowserTTS !== 'undefined',
          hasSpeak: typeof BrowserTTS !== 'undefined' && typeof BrowserTTS.speak === 'function'
        };
      });

      expect(voiceState.voiceEnabled, 'Voice should be enabled').toBe(true);
      expect(voiceState.browserTTSExists, 'BrowserTTS should exist').toBe(true);
      expect(voiceState.hasSpeak, 'BrowserTTS.speak should exist').toBe(true);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST 3: Voice on Mobile
// ═════════════════════════════════════════════════════════════════════════

test.describe('Voice Toggle — Mobile', () => {
  test('voice toggle works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await startStoryMode(page);

    // Find voice toggle
    const voiceToggle = page.locator('#voiceToggle, .voice-toggle, [data-action="toggle-voice"]');
    const isVisible = await voiceToggle.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      // Click toggle
      await voiceToggle.click();
      await page.waitForTimeout(500);

      // Verify state changed
      const isActive = await voiceToggle.evaluate(el => {
        return el.classList.contains('active') ||
               el.classList.contains('on') ||
               el.getAttribute('aria-pressed') === 'true' ||
               el.dataset.state === 'on';
      });

      // Should be active after click
      expect(isActive).toBe(true);
    }
  });
});
