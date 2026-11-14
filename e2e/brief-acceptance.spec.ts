import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('offline production entry, evidence export and session reset', async ({ page, context }) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/#/body-map');
  await page.getByRole('link', { name: 'Open My Fitness →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Fitness', exact: true })).toBeVisible();
  async function enter(value: string, baseline: boolean) {
    if (!(await page.getByLabel('Participant identifier').isVisible()))
      await page.getByText('Enter an existing assessment', { exact: true }).click();
    await page.getByLabel('Participant identifier').fill('Synthetic P');
    await page.getByLabel('Assessment series').fill('Synthetic series');
    await page.getByLabel('Date', { exact: true }).fill(baseline ? '2026-01-01' : '2026-02-01');
    await page.getByLabel('Phase', { exact: true }).selectOption('not-applicable');
    await page.getByLabel('Metric', { exact: true }).selectOption('VO2peak');
    await page.getByLabel('Capacity', { exact: true }).fill(value);
    await page.getByLabel('Units', { exact: true }).selectOption('L/min');
    await page.getByLabel('Documented method').fill('Graded capacity test');
    await page.getByLabel('Baseline record', { exact: true }).setChecked(baseline);
    await page.getByRole('button', { name: 'Save assessment', exact: true }).click();
  }
  await enter('3', true);
  await enter('2.1', false);
  await expect(
    page.getByText('Supported recorded comparison', { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Evidence & follow-up', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export review card ↓' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toContain('user-entered');
  const payload = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(payload.result.calculation.retainedPct).toBe(70);
  expect(payload.result.reference.state).toBe('not-applicable');
  expect(payload.records).toHaveLength(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Assessment not found' })).toBeVisible();
});
test('NASA replay keeps units separate', async ({ page }) => {
  await page.goto('/#/understand/MR080G-3985-070506-REL');
  await expect(
    page.getByText('Measured decrease of 26.1% from baseline; 73.9% retained.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View recorded L/min series (no conversion)' }).click();
  await expect(page.getByText('2.725', { exact: true }).first()).toBeVisible();
});

test('backup demonstration sequence', async ({ page }) => {
  await page.goto('/#/body-map');
  await page.getByRole('link', { name: 'Open My Fitness →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Fitness', exact: true })).toBeVisible();
  await page.waitForTimeout(2000); // Allow the recorded demonstration to be read.
  await page.getByRole('link', { name: 'Evidence & follow-up', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('link', { name: 'Demo: research replay' }).click();
  await expect(
    page.getByText('Measured decrease of 26.1% from baseline; 73.9% retained.'),
  ).toBeVisible();
  await page.waitForTimeout(2000);
  await page.goto('/#/understand/MR080G-3985-070517-REL');
  await expect(
    page.getByText('Measured decrease of 2.0% from baseline; 98.0% retained.'),
  ).toBeVisible();
  await page.waitForTimeout(2000);
  await page.goto('/#/understand/MR080G-0224-050303-REL');
  await expect(page.getByText('Conflicting records', { exact: false }).first()).toBeVisible();
  await page.waitForTimeout(2000);
});

test('planned regions, unsupported chart points and research conflicts at narrow width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/body-map');
  await page
    .getByRole('button', { name: '1 / Head · sleep and stress Planned module', exact: true })
    .click();
  await expect(
    page.getByText('This planned module does not assess these risks.', { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open My Fitness →', exact: true }).click();
  await expect(page.locator('circle.hollow')).toHaveCount(1);
  await page.goto('/#/understand/SIM-FLIGHT-MISSING');
  await expect(page.getByText('Insufficient evidence', { exact: false }).first()).toBeVisible();
  await page.goto('/#/understand/MR080G-5580-090609-REL');
  await expect(page.getByText('Conflicting records', { exact: false }).first()).toBeVisible();
  await expect(page.locator('.amber')).toHaveCount(0);
});
