// Run from the checkout: node src/shell/profile/profile.browser.mjs (Vite on 5173).
import { chromium, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const document = readFileSync('docs/battleplan.md', 'utf8');
const section = document
  .split('**Immune worked example, complete payloads:**')[1]
  .split('The fixture states')[0];
const fixture = [...section.matchAll(/```json\s*([\s\S]*?)```/g)].map((match) =>
  JSON.parse(match[1]),
);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
async function capture(name, width) {
  await page.setViewportSize({ width, height: 960 });
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `design/astronaut-3d-v2/shots/profile-${name}-${width}.png`,
    fullPage: true,
  });
}
try {
  await page.goto('http://localhost:5173/?scenario=off#/profile?crewId=SIM-CDR');
  await expect(page.locator('h1')).toHaveText('Crew profile');
  await expect(page.locator('.profile-link[data-active="true"]')).toHaveCount(0);
  await capture('empty', 1280);
  await capture('empty', 320);
  // Emit the documented fixture into the same public API while the profile stays mounted.
  await page.evaluate(async (records) => {
    // Vite may version the app's module URL during concurrent work; reuse that instance.
    const vectorUrl = performance
      .getEntriesByType('resource')
      .find((entry) => new URL(entry.name).pathname === '/src/shell/vector.ts')?.name;
    if (!vectorUrl) throw new Error('App vector module not loaded');
    const { vector } = await import(vectorUrl);
    records.forEach((record) => vector.emitSignals(record));
  }, fixture);
  await expect(page.locator('[data-signal="food.allergensEaten"]')).toHaveAttribute(
    'data-active',
    'true',
  );
  await expect(page.locator('[data-signal="food.allergensEaten"]')).toContainText(
    'shellfish 3 h ago',
  );
  // Public signals alone do not invent an evaluator result: save through the real Immune UI.
  await page.locator('[data-signal="food.allergensEaten"]').click();
  await page.getByRole('button', { name: 'Load sample', exact: true }).click();
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await page.getByRole('link', { name: 'Crew profile', exact: true }).click();
  await expect(page.locator('[data-signal="food.allergensEaten"]')).toHaveClass(/changed/);
  await expect(page.locator('[data-signal="food.allergensEaten"]')).toContainText(
    'Matching allergen eaten within six hours',
  );
  await capture('fixture', 1280);
  // Follow a diagram node by keyboard, then return through the real header route.
  await page.locator('.profile-node[aria-label="Sleep, Head"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/risk\/sleep\?crewId=SIM-CDR/);
  await page.getByRole('link', { name: 'Crew profile', exact: true }).click();
  await capture('fixture', 320);
  await expect(page.locator('.profile-graph')).toBeHidden();
  await expect(page.locator('.profile-mobile-nodes a')).toHaveCount(9);
  await page.getByRole('combobox', { name: 'Simulated crew', exact: true }).selectOption('SIM-PLT');
  await expect(page).toHaveURL(/#\/profile\?crewId=SIM-PLT/);
  await expect(page.locator('.profile-link[data-active="true"]')).toHaveCount(0);
  await expect(page.locator('.profile-identity')).toContainText('Pilot');
  await page.getByRole('combobox', { name: 'Simulated crew', exact: true }).selectOption('SIM-CDR');
  await expect(page.locator('[data-signal="food.allergensEaten"]')).toHaveClass(/changed/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.profile-link')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await page.goto('http://localhost:5173/#/profile?crewId=SIM-CDR');
  await expect(page.locator('h1')).toHaveText('Crew profile');
  await capture('scenario', 1280);
  await capture('scenario', 320);
  expect(errors).toEqual([]);
  console.log(
    'PASS: 1280/320 reflow, public API live updates, Immune save and changed edge, keyboard node navigation, crew isolation, reduced motion; six screenshots saved.',
  );
} finally {
  await browser.close();
}
