// Run from the repository root; --dev additionally audits the real in-memory vector/stores.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:4174';
const dev = process.argv.includes('--dev');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const definitions = [
  {
    risk: 'cardio',
    open: 'NASA research',
    close: 'Crew observations',
    region: 'NASA cardio research replay',
    draft: 'Resting HR bpm',
    value: '67',
  },
  {
    risk: 'sleep',
    open: 'NASA replay',
    close: 'Crew check-in',
    region: 'NASA sleep research replay',
    draft: 'Latency min',
    value: '17',
  },
  {
    risk: 'bone',
    open: 'NASA replay',
    close: 'Crew observations',
    region: 'NASA bone research replay',
    draft: 'Observation UTC',
    value: '2026-11-13T11:00:00Z',
  },
  {
    risk: 'immune',
    open: 'NASA labs',
    close: 'Crew check-in',
    region: 'NASA immune laboratory replay',
    draft: 'Itch interference',
    value: '1',
    select: true,
  },
];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  // A fresh page/reload may load local assets; every external data request is blocked.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  async function snapshot() {
    return page.evaluate(async (auditDev) => {
      const storage = Object.fromEntries(
        Object.keys(localStorage)
          .sort()
          .map((key) => [key, localStorage.getItem(key)]),
      );
      if (!auditDev) return JSON.stringify({ storage });
      const loadedModule = (path) =>
        performance
          .getEntriesByType('resource')
          .find((entry) => new URL(entry.name).pathname === path)?.name ?? path;
      const { vector } = await import(loadedModule('/src/shell/vector.ts'));
      const risks = ['cardio', 'sleep', 'bone', 'immune'];
      const models = await Promise.all(
        risks.map((risk) => import(loadedModule(`/src/risks/${risk}/model.ts`))),
      );
      const people = ['SIM-CDR', 'SIM-PLT', 'SIM-MS1'].map((crewId) => {
        const ctx = { crewId, vector };
        return {
          person: vector.getVector(crewId),
          signals: risks.map((risk) => vector.getSignals(risk, crewId, 24)),
          tabs: models.map((model, i) => ({
            history: model[`${risks[i]}Store`].history(ctx),
            current: model[`${risks[i]}Store`].current(ctx),
            evaluation: model[`evaluate${risks[i][0].toUpperCase()}${risks[i].slice(1)}`](ctx),
          })),
        };
      });
      return JSON.stringify({ storage, people });
    }, dev);
  }
  const options = (field) =>
    field.locator('option').evaluateAll((els) => els.map((el) => el.value));
  for (const definition of definitions) {
    const { risk } = definition;
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.goto(`${base}/#/risk/${risk}?crewId=SIM-CDR`);
    const crew = page
      .locator('section.risk-tab')
      .filter({ has: page.locator('header .risk-kicker', { hasText: 'Crew observations' }) });
    assert.match(await crew.locator('.risk-badges').innerText(), /Simulated/);
    // Populate the real private tab store through its registered UI before auditing isolation.
    if (risk === 'cardio') {
      await crew.getByLabel('Resting HR bpm', { exact: true }).fill('62');
      await crew.getByLabel('Resting posture', { exact: true }).selectOption('seated');
    } else {
      await crew.getByRole('button', { name: 'Load sample', exact: true }).click();
    }
    if (risk !== 'sleep') {
      await crew
        .getByRole('button', {
          name: risk === 'immune' ? 'Save check-in' : 'Save observation',
          exact: true,
        })
        .click();
      await crew.getByText('Saved for this session', { exact: true }).waitFor();
    } else {
      await crew.getByText('Simulated sample saved', { exact: true }).waitFor();
    }
    const originalHeadline = await crew.locator('.risk-result').innerText();
    const draft = crew.getByLabel(definition.draft, { exact: true });
    if (definition.select) await draft.selectOption(definition.value);
    else await draft.fill(definition.value);
    const before = await snapshot();
    if (dev) {
      const commander = JSON.parse(before).people[0];
      assert.ok(
        commander.tabs[definitions.indexOf(definition)].history.length > 0,
        'Audit must inspect the saved app store',
      );
      if (risk === 'immune')
        assert.equal(
          commander.tabs[3].evaluation.value,
          80,
          'Audit must inspect the actual personalised hives result',
        );
    }
    await page.getByRole('button', { name: definition.open, exact: true }).click();
    const replay = page.getByRole('region', { name: definition.region, exact: true });
    assert.equal(await crew.isVisible(), false);
    assert.match(
      await replay.locator('.risk-badges').innerText(),
      /NASA research replay\s+Research participant/,
    );
    assert.doesNotMatch(
      await replay.innerText(),
      /SIM-CDR|Simulated|Save check-in|Save observation|Request PMC|Hives pattern/,
    );
    if (risk === 'cardio') {
      assert.match(await replay.locator('.risk-result').innerText(), /\+41.5 bpm/);
      assert.match(await replay.innerText(), /73.9 %/);
      assert.match(await replay.innerText(), /Historical research observation/);
      const tests = replay.getByLabel('Research test', { exact: true });
      for (const test of await options(tests)) {
        await tests.selectOption(test);
        for (const workload of ['50', '100', '150']) {
          await replay.getByLabel('Workload', { exact: true }).selectOption(workload);
          for (const unit of ['mL/kg/min', 'L/min']) {
            await replay.getByLabel('VO2peak units', { exact: true }).selectOption(unit);
            assert.ok((await replay.innerText()).includes(`${unit} recorded`));
            // One export per occasion avoids Chrome's rapid-download limit.
            if (workload !== '150' || unit !== 'L/min') continue;
            const download = page.waitForEvent('download');
            await replay.getByRole('button', { name: 'Download packet', exact: true }).click();
            const packet = JSON.parse(await readFile(await (await download).path(), 'utf8'));
            assert.equal(packet.source, 'nasa-research-replay');
            assert.equal(packet.simulated, false);
            assert.equal(packet.vo2.result.reference.state, 'not-applicable');
            assert.ok(
              packet.records.every(
                (r) => r.source === packet.source && r.unit === unit && r.subjectId === 'C3D-3985',
              ),
            );
            assert.equal(packet.stage.context.workloadW, Number(workload));
            assert.ok(packet.stage.sourceRefs.length);
          }
        }
      }
    } else {
      const participants = replay.getByLabel('Research participant', { exact: true });
      const ids = await options(participants);
      assert.equal(ids.length, { sleep: 3, bone: 7, immune: 4 }[risk]);
      for (const participant of ids) {
        await participants.selectOption(participant);
        if (risk === 'sleep') {
          const observations = replay.getByLabel('Observation', { exact: true });
          for (const observation of await options(observations))
            await observations.selectOption(observation);
        } else if (risk === 'bone') {
          const regions = replay.getByLabel('Research region', { exact: true });
          for (const region of await options(regions)) {
            await regions.selectOption(region);
            const visits = replay.getByLabel('Research visit', { exact: true });
            for (const visit of await options(visits)) await visits.selectOption(visit);
          }
        } else {
          const markers = replay.getByLabel('Laboratory marker', { exact: true });
          assert.equal((await options(markers)).length, 71);
          for (const marker of await options(markers)) {
            await markers.selectOption(marker);
            const samples = replay.getByLabel('Research sample', { exact: true });
            for (const sample of await options(samples)) {
              await samples.selectOption(sample);
              assert.match(
                await replay.locator('.risk-result').innerText(),
                sample.startsWith('L-') ? /Comparison unavailable/ : /Recorded comparison/,
              );
            }
          }
        }
      }
      if (risk === 'sleep') {
        await participants.selectOption('C1G0001');
        assert.match(await replay.locator('.risk-result').innerText(), /\+5 min/);
        await participants.selectOption('C1G0002');
        assert.match(await replay.locator('.risk-result').innerText(), /Comparison unavailable/);
        await participants.selectOption('C1G0003');
        await replay.getByLabel('Observation', { exact: true }).selectOption('171');
        assert.match(await replay.locator('.risk-result').innerText(), /Conflicting records/);
      } else if (risk === 'bone') {
        await participants.selectOption('C3D-3985');
        assert.match(await replay.locator('.risk-result').innerText(), /Comparison unavailable/);
        await participants.selectOption('C3A-224');
        assert.match(await replay.locator('.risk-result').innerText(), /-1.18 %\/month/);
        await replay
          .getByRole('button', { name: 'Select research Spine', exact: true })
          .press('Enter');
        assert.equal(
          await replay.getByLabel('Research region', { exact: true }).inputValue(),
          'lumbar-spine|central',
        );
      } else {
        await participants.selectOption('C001');
        assert.match(await replay.locator('.risk-result').innerText(), /\+3.0633 pg\/mL/);
      }
    }
    await replay.locator('details').evaluateAll((els) =>
      els.forEach((el) => {
        el.open = true;
      }),
    );
    const dataset = replay.getByRole('link', { name: /NASA .*dataset/ });
    assert.match(await dataset.getAttribute('href'), /^https:\/\/(nlsp|osdr)\.nasa\.gov\//);
    assert.match(await replay.innerText(), /Source|provenance/);
    await page.setViewportSize({ width: 320, height: 850 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${risk} document overflows`,
    );
    const chart = replay.getByLabel(
      risk === 'cardio'
        ? 'Capacity retained chart; scroll horizontally on small screens'
        : risk === 'sleep'
          ? 'Scrollable research chart'
          : risk === 'bone'
            ? 'Scrollable research DXA chart'
            : 'Scrollable laboratory chart',
    );
    assert.ok(
      await chart.evaluate((el) => el.scrollWidth > el.clientWidth),
      `${risk} chart must scroll internally`,
    );
    await chart.focus();
    await chart.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    assert.ok(await chart.evaluate((el) => el.scrollLeft > 0));
    assert.equal(await snapshot(), before, `${risk} replay changed saved crew data`);
    await page.getByRole('button', { name: definition.close, exact: true }).click();
    assert.equal(await draft.inputValue(), definition.value, `${risk} unsaved draft lost`);
    assert.equal(
      await crew.locator('.risk-result').innerText(),
      originalHeadline,
      `${risk} crew result changed`,
    );
    if (risk === 'immune') {
      await crew.getByLabel('Upload photo', { exact: true }).setInputFiles({
        name: 'local-skin.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      const photo = crew.locator('img.risk-photo');
      await photo.waitFor();
      const photoUrl = await photo.getAttribute('src');
      await draft.selectOption('1');
      await page.getByRole('button', { name: definition.open, exact: true }).click();
      await page.getByRole('button', { name: definition.close, exact: true }).click();
      assert.equal(await photo.getAttribute('src'), photoUrl);
      assert.ok(await photo.evaluate((el) => el.naturalWidth > 0));
      assert.equal(await draft.inputValue(), '1');
      assert.equal(await snapshot(), before);
    }
    await page.getByRole('button', { name: definition.open, exact: true }).click();
    await page.screenshot({
      path: `/tmp/microg-review-${dev ? 'dev' : 'production'}-${risk}-320.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByRole('button', { name: definition.open, exact: true }).click();
    await replay.waitFor();
    console.log(
      `PASS ${risk}: every selector, source labels/evidence, 320px scrolling, preserved draft/results, external requests blocked, reload${dev ? ', all three crew vectors/stores unchanged' : ', storage unchanged'}.`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
