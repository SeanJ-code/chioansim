// Run from the repository root: node front/scripts/check-mobile-home.cjs
// Uses the project's existing back/node_modules/playwright and a running frontend.
const { chromium } = require('../../back/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(process.env.HOME_URL || 'http://localhost:9000');
    await page.locator('.opening__skip').click({ timeout: 5000 }).catch(() => {});
    await page.locator('.opening').waitFor({ state: 'hidden' });
    for (const [width, height] of [[320, 740], [375, 667], [390, 844], [599, 844], [844, 390], [768, 1024], [1440, 1000]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
      assert.equal(await page.locator('#care-scene-01').isVisible(), width > 599);
      assert.equal(await page.locator('.home-hero .mobile-chapters').isVisible(), width <= 599);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const scene of ['.home-hero', '#care-scene-02', '#care-scene-03', '#care-scene-04', '#care-scene-05', '#care-scene-06', '#care-scene-07', '#care-scene-08']) {
      assert(await page.locator(scene).evaluate(el => el.querySelector('h1,h2').getBoundingClientRect().bottom <= el.querySelector('img').getBoundingClientRect().top), `copy above image: ${scene}`);
    }
    await page.locator('.home-hero .mobile-chapters a').last().click();
    assert.equal(await page.evaluate(() => location.hash), '#care-scene-08');
    await page.locator('.scene-ending-actions button').click();
    await page.getByText('@690hzupc', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('.line-dialog__copy a').getAttribute('href'), 'https://line.me/R/ti/p/@690hzupc');
    await page.getByRole('button', { name: '關閉 LINE 專人服務' }).click();
    await page.locator('.line-dialog').waitFor({ state: 'hidden' });
    await page.locator('.hero-secondary').click();
    await page.waitForFunction(() => Math.abs(document.querySelector('#home-journey').getBoundingClientRect().top) < 150);
    assert.equal(await page.locator('.hero-primary').getAttribute('href'), '/caregivers');
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.locator('.quick-access__trigger').click();
    await page.getByRole('button', { name: 'LINE 客服', exact: true }).waitFor({ state: 'visible' });
    await page.locator('.quick-access__trigger').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'large text overflow');
    console.log('PASS: responsive layout, eight chapters, links, booking scroll, LINE dialog, quick access, reduced motion and large text.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
