import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createVector } from '../../vector/store';
import type { RiskEvaluationContext, RiskSignalRecord } from '../types';
import { makePmcPacket } from '../cardio/pmc';
import { riskTab } from './index';
import { Timeline } from './Timeline';
import {
  antibioticActive,
  buildRecord,
  demoHistory,
  emptyInput,
  evaluateMicrobiome,
  gutChangeDays,
  gutStore,
  gutSummary,
  loadDemo,
  lowFibreSince,
  readFibre,
  saveMicrobiome,
  validateInput,
} from './model';

const now = '2026-11-14T11:00:00.000Z';
function context(): RiskEvaluationContext {
  return { crewId: 'SIM-CDR', vector: createVector({ clock: () => Date.parse(now) }) };
}
function food(recordedAt = now, fibreG: number | null = 14): RiskSignalRecord<'food'> {
  return {
    risk: 'food',
    crewId: 'SIM-CDR',
    recordedAt,
    source: 'simulated-crew',
    simulated: true,
    signals: {
      foodsEaten: null,
      allergensEaten: null,
      energyPctOfNeed: null,
      proteinGPerKg: null,
      sodiumMg: null,
      calciumMg: null,
      vitaminDIu: null,
      fibreG,
      bodyMassKg: null,
      bodyMassChangeKg: null,
    },
  };
}

describe('Microbiome contract', () => {
  it('registers in Gut and emits exactly seven nullable signals', () => {
    const ctx = context();
    expect(riskTab.id).toBe('microbiome');
    expect(riskTab.region).toBe('gut');
    saveMicrobiome(ctx, emptyInput(now));
    expect(ctx.vector.getSignals('microbiome', ctx.crewId, 24)).toEqual({
      risk: 'microbiome',
      crewId: 'SIM-CDR',
      recordedAt: now,
      simulated: true,
      source: 'simulated-crew',
      signals: {
        bristolType: null,
        bloating: null,
        abdominalPain: null,
        appetite: null,
        antibiotics14d: null,
        skinInfectionSigns: null,
        gutChangeDays: null,
      },
    });
  });
  it('preserves explicit zeroes and counts only confirmed skin signs', () => {
    const input = {
      ...emptyInput(now),
      changed: false,
      bristolType: 1,
      bloating: 0 as const,
      abdominalPain: 0 as const,
      appetite: 0 as const,
      antibiotics14d: false,
      skin: { redness: true, warmth: false, discharge: false },
    };
    expect(buildRecord(context(), input, []).signals).toEqual({
      bristolType: 1,
      bloating: 0,
      abdominalPain: 0,
      appetite: 0,
      antibiotics14d: false,
      skinInfectionSigns: 1,
      gutChangeDays: 0,
    });
    expect(
      buildRecord(context(), { ...input, skin: { ...input.skin, warmth: null } }, []).signals
        .skinInfectionSigns,
    ).toBeNull();
  });
  it.each([0, 8, 1.5, NaN])('rejects invalid Bristol %s', (value) => {
    expect(() => buildRecord(context(), { ...emptyInput(now), bristolType: value }, [])).toThrow();
  });
  it('normalises offsets and rejects future observations', () => {
    expect(buildRecord(context(), emptyInput('2026-11-14T19:00:00+08:00'), []).recordedAt).toBe(
      now,
    );
    expect(() => buildRecord(context(), emptyInput('2026-11-15T11:00:00Z'), [])).toThrow('future');
  });
  it('isolates crews and prevents overwriting history', () => {
    const ctx = context();
    loadDemo(ctx);
    expect(gutStore.history({ ...ctx, crewId: 'SIM-PLT' })).toEqual([]);
    expect(gutStore.history(context())).toEqual([]);
    expect(() => saveMicrobiome(ctx, emptyInput('2026-11-14T09:00:00Z'))).toThrow('after');
    expect(() => loadDemo(ctx)).toThrow('empty');
    expect(() => loadDemo({ ...context(), crewId: 'SIM-PLT' })).toThrow('SIM-CDR');
  });
});

describe('Daily continuity and fibre', () => {
  it('counts four explicitly changed days, not stool type', () => {
    const history = demoHistory(now);
    expect(gutChangeDays(history)).toBe(4);
    expect(gutChangeDays(history.map((entry) => ({ ...entry, changed: null })))).toBeNull();
    expect(gutSummary(history)).toBe('Gut pattern changed 4 days · low fibre since day 12');
  });
  it('returns null across missing days or unknown daily answers', () => {
    const history = demoHistory(now);
    expect(gutChangeDays(history.filter((_, index) => index !== 2))).toBeNull();
    history[2].changed = null;
    expect(gutChangeDays(history)).toBeNull();
  });
  it('does not double count entries in one day; explicit no resets the run', () => {
    const history = demoHistory(now);
    expect(gutChangeDays([...history, { ...history[4], recordedAt: now }])).toBe(4);
    expect(gutChangeDays([...history, { ...history[4], recordedAt: now, changed: false }])).toBe(0);
  });
  it('omits the low-fibre clause for any missing or adequate daily total', () => {
    for (const grams of [null, 25, 26]) {
      const history = demoHistory(now);
      history[2].fibre.grams = grams;
      expect(lowFibreSince(history)).toBeNull();
      expect(gutSummary(history)).toBe('Gut pattern changed 4 days');
    }
  });
  it('requires a documented consistent target and mission start', () => {
    for (const patch of [
      { fibreTargetG: null },
      { fibreTargetG: 24 },
      { targetNote: '' },
      { missionStart: '' },
    ]) {
      const history = demoHistory(now);
      Object.assign(history[3], patch);
      expect(lowFibreSince(history)).toBeNull();
    }
  });
  it('reads fibre through real vector exposures and captures the dated provenance', () => {
    const ctx = context();
    ctx.vector.emitSignals(food());
    const spy = vi.spyOn(ctx.vector, 'getExposures');
    saveMicrobiome(ctx, emptyInput(now));
    expect(spy).toHaveBeenCalledWith('SIM-CDR', 24);
    expect(gutStore.history(ctx)[0].fibre).toMatchObject({
      grams: 14,
      origin: 'food-vector',
      ref: { risk: 'food', recordedAt: now },
    });
  });
  it('does not reuse a latest Food total for another day or a later observation', () => {
    const ctx = context();
    ctx.vector.emitSignals(food());
    expect(readFibre(ctx, '2026-11-13T11:00:00Z').grams).toBeNull();
    expect(readFibre(ctx, '2026-11-14T10:59:00Z').grams).toBeNull();
    const missing = context();
    missing.vector.emitSignals(food(now, null));
    expect(readFibre(missing, now).grams).toBeNull();
  });
  it('rejects contradictory antibiotic answers and draws dated bands', () => {
    const input = demoHistory(now)[4];
    expect(() => validateInput({ ...input, antibiotics14d: false })).toThrow('conflict');
    expect(antibioticActive(input.antibiotics[0], '2026-11-12')).toBe(true);
    expect(antibioticActive(input.antibiotics[0], '2026-11-14')).toBe(false);
    expect(
      buildRecord(context(), { ...emptyInput(now), antibiotics14d: null }, []).signals
        .antibiotics14d,
    ).toBeNull();
  });
  it('keeps missing timeline days blank and each stool event separate', () => {
    const history = demoHistory(now).filter((_, index) => index !== 2);
    history.push({ ...history[3], recordedAt: now });
    const html = renderToStaticMarkup(
      <Timeline history={history} selected="2026-11-12" onSelect={() => {}} />,
    );
    expect(html).toContain('View 2026-11-12');
    expect((html.match(/gut-point/g) ?? []).length).toBe(5);
    expect(html).toContain('<td></td>');
  });
});

describe('Medical escalation', () => {
  it.each(['blood', 'feverPain', 'fluids24h'] as const)(
    'makes %s urgent before save and hides the result',
    (flag) => {
      const ctx = context();
      loadDemo(ctx);
      const draft = emptyInput(now);
      draft.flags[flag] = true;
      expect(evaluateMicrobiome(ctx, draft)).toMatchObject({
        value: null,
        reasons: [],
        escalation: { level: 'urgent', trigger: 'red-flag' },
      });
      saveMicrobiome(ctx, draft);
      const evaluation = riskTab.evaluate(ctx);
      const html = renderToStaticMarkup(<riskTab.Component {...ctx} />);
      expect(html).toContain('Contact the flight surgeon now');
      expect(html).toContain('Request PMC');
      expect(html).not.toContain('gut-result');
      expect(makePmcPacket(ctx, evaluation, draft, 'urgent')).toMatchObject({
        transmitted: false,
        channel: 'unscheduled-pmc-via-flight-director',
      });
    },
  );
  it('raises incomplete observations after two check-ins at the next PMC', () => {
    const ctx = context();
    saveMicrobiome(ctx, emptyInput('2026-11-13T11:00:00Z'));
    saveMicrobiome(ctx, emptyInput(now));
    expect(evaluateMicrobiome(ctx).escalation).toMatchObject({
      level: 'next-pmc',
      trigger: 'no-pattern',
    });
  });
  it('raises persistent unexplained changes but never computes a GSRS score', () => {
    const ctx = context();
    for (const entry of demoHistory(now)) saveMicrobiome(ctx, entry);
    expect(evaluateMicrobiome(ctx)).toMatchObject({
      value: null,
      escalation: { level: 'next-pmc', trigger: 'persistent-change' },
    });
    const demo = context();
    loadDemo(demo);
    expect(evaluateMicrobiome(demo)).toMatchObject({ value: null, escalation: null });
  });
});
