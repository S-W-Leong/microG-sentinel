import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { riskTab } from '/src/risks/food/index.ts';
import '/src/index.css';
window.records = [];
window.personaliseCalls = 0;
const listeners = new Set();
const vector = {
  emitSignals(record) { window.records.push(record); listeners.forEach(listener => listener()); },
  getVector() { return null; }, getExposures() { return null; }, getSignals() { return null; },
  personalise() { window.personaliseCalls++; return { adjustedPct: null, reasons: [] }; },
  subscribe(crewId, listener) { listeners.add(listener); return () => listeners.delete(listener); }
};
createRoot(document.getElementById('root')).render(React.createElement(riskTab.Component, { crewId: 'SIM-CDR', vector }));
</script></body></html>`;

const server = await createServer({
  server: { host: '127.0.0.1', port: 0, open: false },
  plugins: [
    {
      name: 'food-isolated-check',
      configureServer(instance) {
        instance.middlewares.use(async (request, response, next) => {
          if (request.url !== '/__food-check') return next();
          response.setHeader('Content-Type', 'text/html');
          response.end(await instance.transformIndexHtml('/__food-check', html));
        });
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text());
  });
  await page.goto(`${server.resolvedUrls.local[0]}__food-check`);
  await page.getByRole('heading', { name: 'Food & nutrition' }).waitFor();
  await page.getByLabel('Observation time').fill('2026-11-14T11:00:00Z');
  await page.getByLabel('Body mass (kg)').fill('70');
  await page
    .locator('summary')
    .filter({ hasText: /^Add meal$/ })
    .click();
  await page.getByLabel('Portion (g)').fill('250');
  await page.getByLabel('Consumed time').fill('2026-11-14T08:00:00Z');
  await page.getByLabel('Confirm meal', { exact: true }).check();
  await page.getByRole('button', { name: 'Add meal', exact: true }).click();
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await page.waitForFunction(() => window.records.length === 1);
  const record = await page.evaluate(() => window.records[0]);
  assert.equal(record.signals.sodiumMg, 875);
  assert.deepEqual(
    record.signals.allergensEaten.map(({ allergen, eatenAt }) => ({ allergen, eatenAt })),
    [{ allergen: 'shellfish', eatenAt: '2026-11-14T08:00:00.000Z' }],
  );
  assert.equal(record.signals.energyPctOfNeed, null);
  assert.equal(await page.locator('.food-rings').count(), 1);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    '320 px overflow',
  );
  const beforeUrgent = await page.evaluate(() => window.personaliseCalls);
  await page
    .getByRole('group', { name: 'Unable to eat or drink for 24 h?' })
    .getByRole('button', { name: 'Yes', exact: true })
    .click();
  await page.getByRole('alert').filter({ hasText: 'Contact the flight surgeon now' }).waitFor();
  assert.equal(await page.locator('.food-rings').count(), 0);
  assert.equal(await page.locator('.food-must').count(), 0);
  assert.equal(await page.evaluate(() => window.personaliseCalls), beforeUrgent);
  await page.getByRole('button', { name: 'Request call', exact: true }).first().click();
  assert.match(await page.getByRole('status').innerText(), /no message sent/);
  assert.equal(await page.evaluate(() => window.records.length), 1);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Urgent view overflow',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: isolated React UI, manual meal/save/emission, 320 px width, immediate urgent suppression, local-only call notice.',
  );
} finally {
  await browser?.close();
  await server.close();
}
