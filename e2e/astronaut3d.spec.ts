import { test, expect } from '@playwright/test';

const shots = 'design/astronaut-3d-v2/shots';
test.use({
  baseURL: 'http://localhost:5173',
  video: 'off',
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium',
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

test('3D selection, navigation, and responsive screenshots', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.location().url === 'http://localhost:5173/favicon.ico') {
      test
        .info()
        .annotations.push({ type: 'Existing issue', description: 'Missing favicon.ico (404)' });
    } else errors.push(`${message.text()} ${message.location().url}`);
  });
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto('/#/');
  await expect(page.locator('.astronaut-3d canvas')).toBeVisible();
  await expect(page.locator('[data-marker="heart-lungs"]')).toBeVisible();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${shots}/app-desktop.png`, fullPage: true });
  await page.locator('[data-card="heart-lungs"] .body-chip').click();
  await expect(page.locator('[data-marker="heart-lungs"]')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${shots}/app-desktop-heart-lungs.png`, fullPage: true });
  const line = page.locator('[data-leader="heart-lungs"]');
  await expect(line).toHaveAttribute('class', 'active');
  expect(await line.getAttribute('d')).toMatch(/^M.+H.+L/);
  await page.locator('[data-marker="skin"]').click();
  await expect(page.locator('[data-card="skin"] .body-chip')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('[data-card="heart-lungs"] .body-chip')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-card="skin"] .body-chip')).toBeFocused();
  await expect(page.locator('[data-marker="skin"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-card="heart-lungs"] .body-chip').click();
  await page.locator('#region-heart-lungs').getByRole('link', { name: 'Open' }).click();
  await expect(page).toHaveURL(/#\/risk\/cardio\?crewId=SIM-CDR$/);
  await expect(page.locator('.astronaut-3d')).toHaveCount(0);
  await page.goto('/#/');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('.astronaut-3d canvas')).toBeVisible();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${shots}/app-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const stage = await page.locator('.body-stage').boundingBox();
  const card = await page.locator('.body-card').first().boundingBox();
  expect(card!.y).toBeGreaterThan(stage!.y + stage!.height);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Simulated crew').selectOption('SIM-PLT');
  await page.locator('[data-card="head"] .body-chip').click();
  await page.getByRole('tab', { name: 'Sleep', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Mood', exact: true })).toBeFocused();
  await expect(page.locator('#region-head a')).toHaveAttribute(
    'href',
    '#/risk/mood?crewId=SIM-PLT',
  );
  await expect(page.locator('#region-head')).toContainText('Planned');
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.getByLabel('Your note').fill('Discuss at PMC');
  await page.getByRole('button', { name: 'Queue note' }).click();
  await expect(page.locator('.shell-note')).toContainText('Discuss at PMC');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(errors).toEqual([]);
});

test('vector notifications update region flags without rebuilding the canvas', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.astronaut-3d canvas')).toBeVisible();
  const canvas = await page.locator('.astronaut-3d canvas').elementHandle();
  await expect(page.locator('[data-marker="skin"]')).toHaveAttribute('data-flag', 'empty');
  await page.evaluate(async () => {
    const vectorModule = '/src/shell/vector.ts';
    const immuneModule = '/src/risks/immune/model.ts';
    const { vector } = await import(vectorModule);
    const { immuneSample, saveImmune } = await import(immuneModule);
    const input = immuneSample();
    saveImmune(
      { crewId: 'SIM-CDR', vector },
      { ...input, flags: { ...input.flags, breathing: true } },
    );
  });
  await expect(page.locator('[data-marker="skin"]')).toHaveAttribute('data-flag', 'urgent');
  await expect(page.locator('[data-card="skin"]')).toContainText('Contact the flight surgeon now');
  await expect(page.locator('[data-card="skin"] .body-value')).toHaveCount(0);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.getByLabel('Simulated crew').selectOption('SIM-PLT');
  await expect(page.locator('[data-marker="skin"]')).toHaveAttribute('data-flag', 'empty');
  await expect(page.locator('[data-card="skin"] .body-escalation')).toHaveCount(0);
});

test('WebGL absence keeps the SVG, cards, and routing usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.location().url === 'http://localhost:5173/favicon.ico') {
      test
        .info()
        .annotations.push({ type: 'Existing issue', description: 'Missing favicon.ico (404)' });
    } else errors.push(`${message.text()} ${message.location().url}`);
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args);
    };
  });
  await page.goto('/#/');
  await expect(page.locator('.body-fallback svg')).toBeVisible();
  await expect(page.locator('.astronaut-3d')).toHaveCount(0);
  await page.getByRole('button', { name: 'Scan Gut', exact: true }).click();
  await expect(page.locator('[data-card="gut"] .body-chip')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('[data-select="gut"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#region-gut').getByRole('link', { name: 'Open' }).click();
  await expect(page).toHaveURL(/#\/risk\/food\?crewId=SIM-CDR$/);
  expect(errors).toEqual([]);
});

test('lost WebGL context preserves current selection in the SVG fallback', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.astronaut-3d canvas')).toBeVisible();
  await page.locator('[data-card="heart-lungs"] .body-chip').click();
  await page
    .locator('canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(page.locator('.body-fallback svg')).toBeVisible();
  await expect(page.locator('[data-select="heart-lungs"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#region-heart-lungs a')).toHaveAttribute(
    'href',
    '#/risk/cardio?crewId=SIM-CDR',
  );
});
