import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('offline production entry, evidence export and session reset', async ({ page, context }) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/#/fitness');
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
  await page.goto('/#/fitness');
  await expect(page.getByRole('heading', { name: 'My Fitness', exact: true })).toBeVisible();
  await page.waitForTimeout(2000); // Allow the recorded demonstration to be read.
  await page.getByRole('link', { name: 'Evidence & follow-up', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.goto('/#/understand/MR080G-3985-070506-REL');
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
  await page.getByRole('button', { name: 'Scan Head', exact: true }).click();
  await page.locator('#region-head').getByRole('link', { name: 'Balance' }).click();
  await expect(page.getByText('Planned', { exact: true })).toBeVisible();
  await page.goto('/#/fitness');
  await expect(page.locator('circle.hollow')).toHaveCount(1);
  await page.goto('/#/understand/SIM-FLIGHT-MISSING');
  await expect(page.getByText('Insufficient evidence', { exact: false }).first()).toBeVisible();
  await page.goto('/#/understand/MR080G-5580-090609-REL');
  await expect(page.getByText('Conflicting records', { exact: false }).first()).toBeVisible();
  await expect(page.locator('.amber')).toHaveCount(0);
});

test('body map navigation and local notes at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little closer, inside.' })).toBeVisible();
  await expect(page.locator('.body-card')).toHaveCount(6);
  await expect(page.locator('.body-chip')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Always', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Simulated crew')).toHaveValue('SIM-CDR');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.getByLabel('Your note').fill('Review this at PMC');
  await page.getByRole('button', { name: 'Queue note' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Queued locally' })).toHaveText(
    'Queued locally · not transmitted.',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Scan Head', exact: true }).click();
  await page.locator('#region-head').getByRole('link', { name: 'Balance' }).click();
  await expect(page.getByText('Planned', { exact: true })).toBeVisible();
  await page.getByLabel('Simulated crew').selectOption('SIM-MS1');
  await expect(page).toHaveURL(/crewId=SIM-MS1/);
  await page
    .getByRole('navigation', { name: 'Region tabs' })
    .getByRole('link', { name: 'Sleep' })
    .click();
  await expect(page.getByRole('region', { name: 'Sleep tab' })).toBeVisible();
});

test('Food exposure personalises the Immune sample', async ({ page }) => {
  await page.goto('/#/risk/immune?crewId=SIM-CDR');
  await page.getByRole('button', { name: 'Load sample', exact: true }).click();
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(page.getByText(/Personalised 60 %/)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Body map', exact: true })
    .click();
  await page.getByRole('button', { name: 'Scan Gut', exact: true }).click();
  await page.locator('#region-gut').getByRole('link', { name: 'Food', exact: false }).click();
  await page.getByRole('button', { name: 'Load demo', exact: true }).click();
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(
    page.getByText('Check-in saved for this session; signals shared locally.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Body map', exact: true })
    .click();
  await expect(page.locator('[data-card="skin"]')).toContainText('80 %');
  await page.getByRole('button', { name: 'Scan Skin', exact: true }).click();
  await page.locator('#region-skin').getByRole('link', { name: 'Immune' }).click();
  await expect(page.getByText(/Personalised 80 %/)).toBeVisible();
  await page.getByText('Why this?', { exact: true }).click();
  await expect(page.getByText('Known matching food allergy', { exact: false })).toBeVisible();
  await expect(
    page.getByText('Matching allergen eaten within six hours', { exact: false }),
  ).toBeVisible();
});
