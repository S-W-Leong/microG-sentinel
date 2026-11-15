// Render deck.html to slide PNGs and a PDF. Usage: node render.cjs <repoDir> <deckDir>
const path = require('node:path');
const [repo, dir] = process.argv.slice(2);
const { chromium } = require(require.resolve('@playwright/test', { paths: [repo] }));
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/Woo/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file:///' + path.join(dir, 'deck.html').replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: path.join(dir, `slide-${i + 1}.png`) });
  }
  // Report text boxes whose content is wider than the box.
  const over = await page.evaluate(() =>
    [...document.querySelectorAll('.slide *')]
      .filter((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'hidden')
      .map((e) => e.className + ':' + e.textContent.slice(0, 40)),
  );
  console.log('overflow', over.length, over.slice(0, 8));
  await page.pdf({
    path: path.join(dir, 'MicroG-Sentinel-slides.pdf'),
    width: '1920px',
    height: '1080px',
    printBackground: true,
  });
  console.log('slides', slides.length);
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
