// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9000';

test.describe('Ensaio — critical user journeys', () => {
  test('1. Page loads — title correct, no JS console errors', async ({ page }) => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/Ensaio/);

    expect(errors, `JS errors on load: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('2. CSS loads — body background is dark (not white)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Dark theme: --bg is #0f1020 = rgb(15, 16, 32). White would be rgb(255, 255, 255).
    expect(bgColor, `Body background was "${bgColor}" — expected dark, not white`).not.toBe(
      'rgb(255, 255, 255)'
    );

    const bgVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    );
    expect(bgVar, 'CSS custom property --bg should be defined').not.toBe('');
  });

  test('3. Setup screen visible, sim hidden on load', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const setupHidden = await page.locator('#setup').evaluate(el =>
      el.classList.contains('hide')
    );
    expect(setupHidden, '#setup should NOT have class "hide" on load').toBe(false);

    const simHidden = await page.locator('#sim').evaluate(el =>
      el.classList.contains('hide')
    );
    expect(simHidden, '#sim should have class "hide" on load').toBe(true);
  });

  test('4. Scene gallery renders with child cards', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.waitForFunction(() => {
      const gallery = document.getElementById('scenesGallery');
      return gallery && gallery.children.length > 0;
    }, { timeout: 5000 });

    const childCount = await page.locator('#scenesGallery').evaluate(el => el.children.length);
    expect(childCount, '#scenesGallery should have at least one scene card').toBeGreaterThan(0);
  });

  test('5. Trait chip toggles on when clicked', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const chip = page.locator('#traits .chip').first();

    const hadOnBefore = await chip.evaluate(el => el.classList.contains('on'));
    expect(hadOnBefore, 'Trait chip should not start with class "on"').toBe(false);

    await chip.click();

    const hasOnAfter = await chip.evaluate(el => el.classList.contains('on'));
    expect(hasOnAfter, 'Trait chip should gain class "on" after click').toBe(true);
  });

  test('6. Tone chips are single-select — clicking one removes "on" from others', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const toneChips = page.locator('#tones .chip');
    const count = await toneChips.count();
    expect(count).toBeGreaterThan(1);

    // Click the second chip (index 1); the first starts as "on" by default
    const target = toneChips.nth(1);
    await target.click();

    const targetOn = await target.evaluate(el => el.classList.contains('on'));
    expect(targetOn, 'Clicked tone chip should have class "on"').toBe(true);

    const onCount = await toneChips.evaluateAll(chips =>
      chips.filter(c => c.classList.contains('on')).length
    );
    expect(onCount, 'Only one tone chip should have class "on" at a time').toBe(1);
  });

  test('7. Demo mode — clicking "Ver demonstracao" switches screens and shows chat bubbles', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await page.locator('#demoBtn').click();

    // #setup should be hidden after demo starts
    await expect(page.locator('#setup')).toHaveClass(/hide/);

    // #sim should be visible (no hide class)
    const simClass = await page.locator('#sim').getAttribute('class');
    expect(simClass ?? '', '#sim should NOT have class "hide" after demo starts').not.toMatch(/\bhide\b/);

    // Wait for at least one message bubble in #chat
    await page.waitForFunction(() => {
      const chat = document.getElementById('chat');
      return chat && chat.children.length > 0;
    }, { timeout: 5000 });

    const bubbleCount = await page.locator('#chat').evaluate(el => el.children.length);
    expect(bubbleCount, '#chat should have at least one message bubble').toBeGreaterThan(0);

    // No JS errors during demo activation
    expect(errors, `JS errors during demo: ${errors.join('; ')}`).toHaveLength(0);

    // Screenshot of the simulator screen
    await page.screenshot({
      path: '/Users/gleica/code/ensaio/ensaio/tests/screenshots/demo-simulator.png',
      fullPage: true,
    });
  });
});
