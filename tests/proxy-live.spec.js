// @ts-check
const { test, expect } = require('@playwright/test');

const LIVE_URL = 'https://gleica.github.io/ensaio/';

test.describe('Ensaio — live proxy mode (real AI calls)', () => {
  test('proxy end-to-end: start rehearsal and get AI streaming response', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    // Navigate to the live app
    await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // --- Check 1: Proxy mode active — gear button must have class "hide" ---
    const gearHidden = await page.locator('#gearBtn').evaluate(el =>
      el.classList.contains('hide')
    );
    expect(gearHidden, '#gearBtn should have class "hide" in proxy/shared mode').toBe(true);

    // --- Check 2: Fill setup form and start rehearsal via proxy ---
    await page.locator('#who').fill('meu chefe');
    await page.locator('#goal').fill('pedir um aumento de salário');

    // Watch for any alert dialog (should NOT appear in proxy mode)
    let alertFired = false;
    page.once('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.locator('#startBtn').click();

    // Wait up to 10s for #sim to lose class "hide"
    await page.waitForFunction(
      () => {
        const sim = document.getElementById('sim');
        return sim && !sim.classList.contains('hide');
      },
      { timeout: 10000 }
    );

    expect(alertFired, 'startBtn should NOT trigger an alert in proxy mode').toBe(false);

    // Verify #sim is visible
    const simHidden = await page.locator('#sim').evaluate(el =>
      el.classList.contains('hide')
    );
    expect(simHidden, '#sim should not have class "hide" after starting rehearsal').toBe(false);

    // Wait for at least one bubble in #chat (the welcome/opening message)
    await page.waitForFunction(
      () => {
        const chat = document.getElementById('chat');
        return chat && chat.children.length > 0;
      },
      { timeout: 15000 }
    );

    const initialBubbleCount = await page.locator('#chat').evaluate(el => el.children.length);
    expect(initialBubbleCount, '#chat should have at least one bubble (welcome message)').toBeGreaterThan(0);

    // --- Check 3: Send a message and wait for real AI streaming response ---
    await page.locator('#input').fill('Preciso conversar sobre meu salário');
    await page.locator('#sendBtn').click();

    // Wait for a .msg.them.streaming bubble to appear (streaming started)
    await page.waitForFunction(
      () => document.querySelector('#chat .msg.them.streaming') !== null,
      { timeout: 15000 }
    );

    // Wait up to 25s for streaming to complete — class "streaming" is removed when done
    await page.waitForFunction(
      () => {
        const streaming = document.querySelector('#chat .msg.them.streaming');
        return streaming === null;
      },
      { timeout: 25000 }
    );

    // Now assert the settled bubble has text
    const themBubbles = page.locator('#chat .msg.them');
    const themCount = await themBubbles.count();
    expect(themCount, 'Should have at least one .msg.them bubble from the AI persona').toBeGreaterThan(0);

    const lastBubbleText = await themBubbles.last().textContent();
    expect(lastBubbleText?.trim().length ?? 0, '.msg.them bubble should have non-empty text').toBeGreaterThan(0);

    // Verify it is not an error message
    const lowerText = (lastBubbleText || '').toLowerCase();
    expect(lowerText, 'AI response should not be an error message').not.toMatch(/erro|error|401|403|cors|no_key/);

    // --- Check 4: Mood meter was set after AI response (moodHistory populated) ---
    // Note: the AI may return humor:50 (neutral) on a first turn, so we verify
    // that setMood() was called — the #meterFill has an explicit style.width set
    // (the element goes from no inline style on init to a value set by setMood).
    // We also accept 50% if the AI responded neutrally; the key thing is that
    // the meter element received an explicit width via style.
    const meterWidth = await page.locator('#meterFill').evaluate(el =>
      el.style.width
    );
    expect(meterWidth, '#meterFill should have an explicit inline width set by setMood()').not.toBe('');

    // --- Check 5: No critical console errors ---
    const criticalErrors = consoleErrors.filter(e => {
      const lower = e.toLowerCase();
      return (
        lower.includes('cors') ||
        lower.includes('401') ||
        lower.includes('403') ||
        lower.includes('no_key') ||
        (lower.includes('failed to fetch') && !lower.includes('proxy'))
      );
    });
    expect(criticalErrors, `Critical console errors: ${criticalErrors.join('; ')}`).toHaveLength(0);

    // --- Final screenshot: full simulator with AI response visible ---
    await page.screenshot({
      path: '/Users/gleica/code/ensaio/ensaio/tests/screenshots/proxy-live-result.png',
      fullPage: true,
    });
  });
});
