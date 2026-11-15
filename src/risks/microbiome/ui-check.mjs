import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`${server.resolvedUrls.local[0]}#/risk/microbiome?crewId=SIM-CDR`);
  await page.getByRole('heading', { name: 'Microbiome', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Load simulated history' }).click();
  await page.getByRole('heading', { name: 'Gut pattern changed 4 days' }).waitFor();
  assert.equal(await page.getByText('low fibre since day 12', { exact: true }).count(), 1);
  assert.equal(await page.locator('.gut-point').count(), 5);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 320), true);
  await page.getByRole('button', { name: 'View 2026-11-12' }).focus();
  await page.keyboard.press('Enter');
  assert.match(await page.getByRole('region', { name: 'Selected day' }).innerText(), /17 g/);
  await page.screenshot({ path: 'src/risks/microbiome/ui-320.png', fullPage: true });
  await page.getByLabel('Blood in stool', { exact: true }).selectOption('true');
  await page.getByText('Contact the flight surgeon now', { exact: true }).waitFor();
  assert.equal(await page.locator('.gut-result').count(), 0);
  await page.getByRole('alert').getByRole('button', { name: 'Request PMC' }).click();
  await page.getByRole('status').filter({ hasText: 'not transmitted' }).waitFor();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download packet' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let json = '';
  for await (const chunk of stream) json += chunk.toString();
  const packet = JSON.parse(json);
  assert.equal(packet.channel, 'unscheduled-pmc-via-flight-director');
  assert.equal(packet.transmitted, false);
  assert.equal(packet.evaluation.value, null);
  await page.getByLabel('Blood in stool', { exact: true }).selectOption('false');
  await page.getByLabel('Fever with abdominal pain', { exact: true }).selectOption('false');
  await page
    .getByLabel('Unable to keep fluids down for 24 h', { exact: true })
    .selectOption('false');
  await page.getByLabel('Gut pattern changed', { exact: true }).selectOption('false');
  await page.getByRole('radio', { name: '4 Smooth sausage' }).check();
  await page.getByText('Skin observation', { exact: true }).click();
  await page.getByLabel('Local skin photo').setInputFiles({
    name: 'local.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByAltText('Local skin observation preview').waitFor();
  await page.getByLabel('Redness', { exact: true }).selectOption('true');
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check-in saved' }).waitFor();
  assert.equal(await page.locator('.gut-point').count(), 6);
  await page.getByAltText('Local skin observation on 2026-11-14').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 320), true);
  assert.deepEqual(errors, []);
  console.log(
    'PASS actual shell route, 320px overflow, keyboard day selection, fixture, immediate urgent suppression, local PMC download, local photo, saved check-in',
  );
} finally {
  await browser.close();
  await server.close();
}
