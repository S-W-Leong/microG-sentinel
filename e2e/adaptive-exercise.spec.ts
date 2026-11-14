import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('adaptive observation, refresh and locally prepared review', async ({ page, context }) => {
  await context.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort(),
  );
  await page.goto('/#/exercise/plan');
  await expect(
    page.getByRole('heading', { name: 'Next useful observation', exact: true }),
  ).toBeVisible();
  await page.getByText('Change the demo schedule (optional)', { exact: true }).click();
  await page.getByRole('switch', { name: 'Available: 14 Nov · 09:00 UTC', exact: true }).uncheck();
  await page.getByText('Planning basis', { exact: true }).click();
  await expect(page.getByTestId('selected-plan')).toContainText('DEMO-missing-hr-op-1');
  await page.getByRole('button', { name: 'Use this observation plan', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Generate synthetic observation', exact: true }).click();
  await page.getByText('See these readings on a chart', { exact: true }).click();
  await page.getByText('View measurement values', { exact: true }).click();
  await expect(page.getByText('145 bpm', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Next: save your review', exact: true }).click();
  await page
    .locator('#exercise-review')
    .getByRole('button', { name: 'Prepare review', exact: true })
    .click();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review JSON', exact: true }).click();
  const file = await waiting;
  const packet = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(packet.transferState).toBe('prepared-locally');
  expect(packet.baseline.sessions).toHaveLength(2);
  await page.getByRole('link', { name: 'NASA evidence', exact: true }).click();
  await expect(page.getByText('+41.5 bpm', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use this observation plan' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/adaptive-research.png', fullPage: true });
});
test('symptoms bypass collection at narrow width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Demo settings & records', { exact: true }).click();
  await page.getByText('Demonstration inputs and prescribed schedule', { exact: true }).click();
  await page.getByLabel('Scenario', { exact: true }).selectOption('symptoms');
  await page.getByRole('link', { name: 'Next: try a follow-up', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review takes priority', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use this observation plan' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  await page
    .locator('#exercise-review')
    .getByRole('button', { name: 'Prepare review', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText('Prepared locally. No transmission or receipt is claimed.', { exact: true }),
  ).toBeVisible();
});
test('explains the default values before collection and links to personal entry', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What do these readings mean?' })).toBeVisible();
  await page.getByRole('button', { name: '100 W Reading missing', exact: true }).click();
  await expect(
    page.getByText('No reading recorded. There is no change to calculate yet.'),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Next useful observation', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Next: try a follow-up', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Next useful observation', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back', exact: false }).click();
  await expect(
    page.getByRole('button', { name: '100 W Reading missing', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'artifacts/adaptive-exercise.png', fullPage: true });
  await page.getByRole('link', { name: 'My values', exact: true }).click();
  await expect(page.getByLabel('Participant identifier')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to use your own values' })).toBeVisible();
});
test('imports and links actual CSV observations without changing the baseline', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByText('Demo settings & records', { exact: true }).click();
  await page.getByText('Import demonstration observations', { exact: true }).click();
  const header =
    'sessionId,subjectId,seriesId,date,isBaseline,deviceId,protocolId,posture,stageId,stageIndex,workloadW,durationSec,hrBpm,rpe,rpeScale,quality,qualityBasis,symptoms,notes';
  const rows = [50, 100, 150].map(
    (w, i) =>
      `csv-followup,DEMO-CREW,missing-hr,2026-11-14,false,DEMO-CYCLE,DEMO-PROTOCOL,seated,csv-stage-${i},${i + 1},${w},180,${120 + i * 20},11,borg-6-20,usable,Imported demo,,Synthetic`,
  );
  await page.getByLabel('Observation CSV').setInputFiles({
    name: 'observations.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([header, ...rows].join('\n')),
  });
  await expect(page.getByText('3 accepted rows; 0 rejected.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Commit import', exact: true }).click();
  await page.getByLabel('Link imported follow-up').selectOption('csv-followup');
  await page.getByText('See these readings on a chart', { exact: true }).click();
  await page.getByText('View measurement values', { exact: true }).click();
  await expect(page.getByText('140 bpm', { exact: true }).first()).toBeVisible();
  await page.reload();
  await page.getByText('See these readings on a chart', { exact: true }).click();
  await page.getByText('View measurement values', { exact: true }).click();
  await expect(page.getByText('140 bpm', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Frozen baseline: 2 independent sessions.', { exact: false }),
  ).toBeVisible();
});
