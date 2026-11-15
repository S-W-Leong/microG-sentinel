import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 320, height: 900 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${server.resolvedUrls.local[0]}#/risk/balance?crewId=SIM-CDR`);
  await page.getByRole('heading', { name: 'Balance', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Load 2.1× sample' }).click();
  await page.getByText('Eyes-closed sway 2.1× your baseline', { exact: true }).waitFor();
  assert.equal(await page.locator('.balance-baseline').count(), 1);
  assert.equal(await page.locator('.balance-current').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: /Eyes open/ }).click();
  await page.getByRole('button', { name: /Eyes closed/ }).click();
  await page.getByLabel('MISC · 0–10', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await page.getByText(/Raise at your next PMC/).waitFor();
  await page.getByLabel('Fall with head strike?').selectOption('true');
  await page.getByText(/Contact the flight surgeon now/).waitFor();
  assert.equal(await page.locator('.risk-result').count(), 0);
  assert.equal(await page.locator('.balance-trace').count(), 0);
  await page.getByRole('button', { name: 'Request call' }).click();
  await page.getByRole('heading', { name: 'Unscheduled PMC request' }).waitFor();
  await page.getByLabel('Fall with head strike?').selectOption('false');
  await page.getByRole('button', { name: 'Run simulated replay' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Stop test' }).click();
  await page.getByText('Test stopped. No comparison; no repeat required.').waitFor();
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await page.getByText('Test incomplete · no comparison', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: real shell route, 320px overflow, 2.1x fixture, condition toggle, MISC escalation, urgent suppression, local PMC queue, replay abort/save.',
  );
} finally {
  await browser?.close();
  await server.close();
}
