import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Against the real running app; no mock vector or component harness.
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('Scenario unavailable'))
      errors.push(message.text());
  });
  await page.goto('http://localhost:5173/#/');
  await page.getByRole('heading', { name: 'Body map', exact: true }).waitFor();
  const summaries = {};
  for (const crewId of ['SIM-CDR', 'SIM-PLT', 'SIM-MS1']) {
    if (crewId !== 'SIM-CDR')
      await page.getByLabel('Simulated crew', { exact: true }).selectOption(crewId);
    const rows = await page.locator('.body-status').allTextContents();
    summaries[crewId] = rows.filter((row) => /^(Food|Balance|Microbiome|SANS|Mood)\s/.test(row));
    assert.equal(summaries[crewId].length, 5);
    assert(
      summaries[crewId].every((row) => !/No data|Planned/.test(row)),
      JSON.stringify(rows),
    );
    assert(await page.getByText('Simulated', { exact: true }).count());
    assert(await page.getByText('Mission day 100', { exact: true }).count());
    assert.equal(await page.getByText('Demo path', { exact: true }).count(), 0);
  }
  assert.notDeepEqual(summaries['SIM-CDR'], summaries['SIM-PLT']);
  assert.notDeepEqual(summaries['SIM-PLT'], summaries['SIM-MS1']);

  const requiredText = {
    food: 'Shrimp rice',
    balance: 'Motion sickness history:',
    microbiome: 'Gut pattern changed 2 days',
    sans: 'Near vision',
    mood: 'Mood',
  };
  for (const [risk, text] of Object.entries(requiredText)) {
    await page.goto(`http://localhost:5173/#/risk/${risk}?crewId=SIM-CDR`);
    await page.locator('main').waitFor();
    await page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor();
    const html = await page.locator('main').innerText();
    assert(!html.includes('Crew registration needed'));
    assert(html.includes('Simulated'));
    const links = await page
      .locator('main a[href*="/risk/"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    assert(links.length > 0, `${risk}: cross-tab links missing`);
    assert(
      links.every((href) => href.includes('crewId=SIM-CDR')),
      `${risk}: cross-tab crew lost`,
    );
  }
  await page.goto('http://localhost:5173/#/risk/balance?crewId=SIM-PLT');
  await page.getByText('Recurrent with vomiting', { exact: false }).waitFor();
  await page.goto('http://localhost:5173/#/risk/sans?crewId=SIM-PLT');
  await page.getByRole('alert').getByText('Raise at your next PMC', { exact: false }).waitFor();
  await page.goto('http://localhost:5173/#/risk/food?crewId=SIM-MS1');
  await page.getByText('71% of need for 5 days', { exact: true }).waitFor();
  await page.goto('http://localhost:5173/#/');
  await page.setViewportSize({ width: 320, height: 850 });
  await page.getByRole('heading', { name: 'Body map', exact: true }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  assert.equal(overflow, false, '320 px body map overflows');

  await page.goto('http://localhost:5173/?scenario=off#/');
  await page.getByRole('heading', { name: 'Body map', exact: true }).waitFor();
  const clean = (await page.locator('.body-status').allTextContents()).filter((row) =>
    /^(Food|Balance|Microbiome|SANS|Mood)\s/.test(row),
  );
  assert(
    clean.every((row) => row.includes('No data')),
    JSON.stringify(clean),
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        summaries,
        tabs: Object.keys(requiredText),
        lowEnergy: '71% for 5 days',
        clean: true,
        width320: 'no overflow',
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
