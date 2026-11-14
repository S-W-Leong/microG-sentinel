import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('guides baseline and later entry, correction and export without duplicating baselines', async ({
  page,
}) => {
  await page.goto('/#/fitness/entry');
  await expect(
    page.getByRole('heading', { name: 'Start with your earlier result.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Later capacity', { exact: true })).toHaveCount(0);
  await page.getByLabel('Baseline date', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Baseline capacity', { exact: true }).fill('3');
  await page.getByLabel('Metric', { exact: true }).selectOption('VO2peak');
  await page.getByLabel('Units', { exact: true }).selectOption('L/min');
  await page.getByLabel('Documented method', { exact: true }).fill('Graded capacity test');
  await page.getByRole('button', { name: 'Save baseline & continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add your later result.' })).toBeVisible();
  await expect(page.getByLabel('Documented method', { exact: true })).toHaveValue(
    'Graded capacity test',
  );
  await page.getByLabel('Later result date', { exact: true }).fill('2026-02-01');
  await page.getByLabel('Later capacity', { exact: true }).fill('2.1');
  await page.getByRole('button', { name: 'Save later result & compare', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Check the copied test details');
  await page
    .getByRole('checkbox', {
      name: 'I checked the metric, units and method against my later report.',
    })
    .check();
  await page.getByRole('button', { name: 'Save later result & compare', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your recorded capacity is 30.0% lower.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Edit baseline', exact: true }).click();
  await page.getByLabel('Baseline capacity', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Save baseline & continue', exact: true }).click();
  await expect(page.getByLabel('Later capacity', { exact: true })).toHaveValue('2.1');
  await page
    .getByRole('checkbox', {
      name: 'I checked the metric, units and method against my later report.',
    })
    .check();
  await page.getByRole('button', { name: 'Save later result & compare', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your recorded capacity is 47.5% lower.' }),
  ).toBeVisible();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download full review JSON', exact: true }).click();
  const file = await waiting;
  const packet = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(packet.records).toHaveLength(2);
  expect(packet.result.calculation.baseline.value).toBe(4);
  expect(packet.result.calculation.retainedPct).toBe(52.5);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Save both reports to see your comparison.' }),
  ).toBeVisible();
});

test('direct links require reports and narrow layout keeps the baseline form separate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/fitness/later');
  await expect(page.getByRole('heading', { name: 'Save a baseline first.' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter your baseline', exact: true }).click();
  await expect(page.getByLabel('Baseline capacity', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Later capacity', { exact: true })).toHaveCount(0);
});
