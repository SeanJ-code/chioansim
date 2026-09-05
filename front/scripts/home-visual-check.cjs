// Run with the local preview active: node front/scripts/home-visual-check.cjs
const { chromium } = require('../../back/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.addInitScript(() => sessionStorage.setItem('chioansim-opening-played', 'true'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.HOME_PREVIEW_URL || 'http://localhost:9012');
    await page.locator('#hero-title').waitFor();
    await page.getByRole('button', { name: 'skip', exact: true }).click();
    await page.locator('.opening').waitFor({ state: 'detached' });
    for (const width of [375, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `/tmp/home-${width}.png` });
      assert.equal(await page.locator('.care-scene').count(), 8);
      for (const scene of await page.locator('.care-scene').all()) {
        if (!await scene.isVisible()) continue;
        await scene.scrollIntoViewIfNeeded();
        await scene.locator('img').evaluate(image => image.decode());
        const box = await scene.locator('h2').boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width, `Heading overflow at ${width}`);
      }
      await page.locator('#care-scene-03').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/story-${width}.png` });
    }
    const toggle = page.locator('.quick-access__trigger');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.quick-access__items').getAttribute('inert'), null);
    await page.getByRole('button', { name: 'LINE 客服', exact: true }).click();
    await page.getByText('官方 LINE ID', { exact: true }).waitFor();
    await page.getByRole('button', { name: '關閉 LINE 專人服務' }).click();
    await page.locator('.q-dialog').waitFor({ state: 'detached' });
    await page.locator('.quick-access__trigger').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.quick-access__trigger').getAttribute('aria-expanded'), 'false');
    assert.notEqual(await page.locator('.quick-access__items').getAttribute('inert'), null);
    assert.equal(await page.locator('.hero-primary').getAttribute('href'), '/caregivers');
    assert.deepEqual(errors, []);
    console.log('PASS: four viewport sizes, eight images/headings, quick access, Escape, LINE dialog, caregiver link, no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
