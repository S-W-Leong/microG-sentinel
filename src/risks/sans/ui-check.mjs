import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${server.resolvedUrls.local[0]}#/risk/sans?crewId=SIM-CDR`);
  await page.getByRole('heading', { name: 'SANS', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Load sample', exact: true }).click();
  await page.getByText('Near vision -0.5 lines vs baseline', { exact: true }).waitFor();
  assert.equal(
    await page.getByText('Display calibration needed · no screen acuity measurement.').count(),
    1,
  );
  const grid = page.getByRole('button', { name: /^Amsler grid/ });
  await grid.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.getByText('1 marks · 1 quadrants', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Right eye', exact: true }).click();
  await page.getByText('0 marks · 0 quadrants', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Left eye', exact: true }).click();
  await page.getByText('1 marks · 1 quadrants', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'New check-in', exact: true }).click();
  await page.getByLabel('Distortion rating').selectOption('1');
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await page.getByText('Eye check saved locally', { exact: true }).waitFor();
  const signal = await page.evaluate(async () => {
    const { vector } = await import('/src/shell/vector.ts');
    return vector.getSignals('sans', 'SIM-CDR', 24);
  });
  assert.equal(signal.signals.nearVisionChangeLines, -0.5);
  assert.equal(signal.signals.amslerDistortion, 1);
  assert.equal(signal.signals.octThicknessChangeUm, null);
  assert.equal(signal.simulated, true);
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(sizes.content <= sizes.width, `320px overflow: ${JSON.stringify(sizes)}`);
  await page.getByLabel('Sudden vision loss?').selectOption('true');
  await page.getByText('Contact the flight surgeon now', { exact: false }).waitFor();
  assert.equal(await page.locator('.risk-result').count(), 0);
  assert.equal(
    await page.getByText('Near vision -0.5 lines vs baseline', { exact: true }).count(),
    0,
  );
  assert.equal(await page.getByRole('button', { name: 'Request PMC', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Request PMC', exact: true }).click();
  await page.getByRole('heading', { name: 'Unscheduled PMC request' }).waitFor();
  await page.getByText('Prepared locally · not transmitted.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: real registered SANS tab, SIM-CDR fixture, keyboard grid, per-eye marks, save-to-vector, urgent score suppression, local PMC packet, 320px no horizontal overflow.',
  );
} finally {
  await browser?.close();
  await server.close();
}
