import { describe, expect, it, vi } from 'vitest';
import type {
  AnyRiskSignalRecord,
  RiskEvaluation,
  RiskId,
  RiskSignalRecord,
  RiskSignalsMap,
} from '../risks/types';
import * as publicApi from './index';
import { createVector } from './store';
import { demoRegistrations } from './registry';
import { catalogue, normaliseAllergen } from './validation';

const time = '2026-11-14T11:00:00.000Z';
const now = Date.parse(time);
const ago = (hours: number) => new Date(now - hours * 3600000).toISOString();
function snapshot<R extends RiskId>(
  risk: R,
  signals: Partial<RiskSignalsMap[R]> = {},
  recordedAt = time,
): RiskSignalRecord<R> {
  return {
    risk,
    crewId: 'SIM-CDR',
    recordedAt,
    source: 'simulated-crew',
    simulated: true,
    signals: {
      ...Object.fromEntries(Object.keys(catalogue[risk]).map((key) => [key, null])),
      ...signals,
    } as unknown as RiskSignalsMap[R],
  };
}
const food = (): RiskSignalRecord<'food'> =>
  snapshot(
    'food',
    {
      foodsEaten: [{ mealId: 'SIM-MEAL-01', foodName: 'Shrimp rice', eatenAt: ago(3) }],
      allergensEaten: [{ mealId: 'SIM-MEAL-01', allergen: 'shellfish', eatenAt: ago(3) }],
    },
    ago(3),
  );
const immune = () =>
  snapshot('immune', {
    hivesPatternPct: 60,
    rashActive: true,
    whealCountBand: 2,
    itch: 2,
    raised: true,
    clearEdges: true,
    paleCentre: true,
    fadesWithin24h: null,
    bodyAreasCount: 2,
  });
const base = (): RiskEvaluation => ({
  risk: 'immune',
  crewId: 'SIM-CDR',
  kind: 'pattern-match',
  value: 60,
  unit: '%',
  label: 'Hives pattern',
  reasons: [],
  evidence: 'supported',
  simulated: true,
  escalation: null,
});
function fixture() {
  const vector = createVector({ clock: () => now });
  vector.emitSignals(food());
  vector.emitSignals(immune());
  return vector;
}

describe('registry and public API', () => {
  it('exports exactly the six contract functions', () => {
    expect(Object.keys(publicApi).sort()).toEqual(
      ['emitSignals', 'getExposures', 'getSignals', 'getVector', 'personalise', 'subscribe'].sort(),
    );
    expect(publicApi.getVector('SIM-CDR')?.traits.allergies).toEqual(['shellfish']);
  });
  it('registers the exact fictional traits with nullable initial observations', () => {
    const vector = createVector({ clock: () => now });
    for (const registration of demoRegistrations) {
      const result = vector.getVector(registration.crewId)!;
      expect(result.traits).toEqual(registration.traits);
      expect(result.source).toBe('simulated-crew');
      expect(result.simulated).toBe(true);
      expect(result.exposures.sleepDebtHours).toBeNull();
      expect(result.exposures.recentFoods).toBeNull();
      expect(result.exposures.foodRecordRefs).toEqual([]);
    }
  });
  it('returns null for unknown reads, rejects unknown writes/evaluations/subscriptions', () => {
    const vector = fixture();
    expect(vector.getVector('unknown')).toBeNull();
    expect(vector.getSignals('food', 'unknown', 24)).toBeNull();
    expect(vector.getExposures('unknown', 24)).toBeNull();
    expect(() => vector.emitSignals({ ...food(), crewId: 'unknown' })).toThrow('Unknown crew');
    expect(() => vector.personalise('immune', 'unknown', base())).toThrow('Unknown crew');
    expect(() => vector.subscribe('unknown', vi.fn())).toThrow('Unknown crew');
  });
  it('returns detached reads and clones incoming registrations and records', () => {
    const registrations = structuredClone(demoRegistrations);
    const vector = createVector({ clock: () => now, registrations });
    const record = food();
    vector.emitSignals(record);
    record.signals.allergensEaten![0].allergen = 'milk';
    registrations[0].traits.allergies = [];
    vector.getVector('SIM-CDR')!.traits.allergies!.push('milk');
    vector.getExposures('SIM-CDR', 24)!.allergensEaten!.length = 0;
    vector.getSignals('food', 'SIM-CDR', 24)!.signals.allergensEaten!.length = 0;
    expect(vector.getVector('SIM-CDR')!.traits.allergies).toEqual(['shellfish']);
    expect(vector.getExposures('SIM-CDR', 24)!.allergensEaten).toHaveLength(1);
  });
  it.each([
    { source: 'user-entered' },
    { simulated: false },
    { crewId: 'USER:person:wrong', source: 'user-entered', comparisonGroupId: 'series' },
    {
      crewId: 'RESEARCH:MR080G:person:series',
      source: 'nasa-research-replay',
      comparisonGroupId: 'series',
      simulated: true,
    },
  ])('rejects namespace/source/series/flag registration mismatch %j', (changes) => {
    expect(() =>
      createVector({
        registrations: [
          { ...demoRegistrations[0], ...changes } as (typeof demoRegistrations)[number],
        ],
      }),
    ).toThrow();
  });
});

describe('validation, snapshots and notification', () => {
  it('notifies once per novel crew record, no duplicate/conflict notification', () => {
    const vector = createVector({ clock: () => now });
    const listener = vi.fn(() => {
      vector.getVector('SIM-CDR');
    });
    const other = vi.fn();
    const unsubscribe = vector.subscribe('SIM-CDR', listener);
    vector.subscribe('SIM-PLT', other);
    vector.emitSignals(food());
    vector.emitSignals(food());
    expect(() =>
      vector.emitSignals({ ...food(), signals: { ...food().signals, sodiumMg: 5 } }),
    ).toThrow('Conflicting');
    expect(vector.getSignals('food', 'SIM-CDR', 24)?.signals.sodiumMg).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    unsubscribe();
    unsubscribe();
    vector.emitSignals(immune());
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('treats object property order as irrelevant for duplicate payloads', () => {
    const vector = fixture();
    const record = food();
    record.signals = Object.fromEntries(
      Object.entries(record.signals).reverse(),
    ) as unknown as RiskSignalsMap['food'];
    expect(() => vector.emitSignals(record)).not.toThrow();
  });
  it('notifies all subscriptions even when one listener throws', () => {
    const vector = createVector({ clock: () => now });
    vector.subscribe('SIM-CDR', () => {
      throw new Error('listener failure');
    });
    const listener = vi.fn();
    vector.subscribe('SIM-CDR', listener);
    expect(() => vector.emitSignals(food())).toThrow('Signals stored');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(vector.getSignals('food', 'SIM-CDR', 24)).not.toBeNull();
  });
  it.each([0, -1, 337, NaN, Infinity])('rejects invalid time window %s', (hours) => {
    const vector = fixture();
    expect(() => vector.getSignals('food', 'SIM-CDR', hours)).toThrow(RangeError);
    expect(() => vector.getExposures('SIM-CDR', hours)).toThrow(RangeError);
  });
  it('excludes the lower boundary, includes now, expires records without backfill', () => {
    let clock = now;
    const vector = createVector({ clock: () => clock });
    vector.emitSignals(snapshot('sleep', { sleepDebtHours: 8 }, ago(24)));
    expect(vector.getSignals('sleep', 'SIM-CDR', 24)).toBeNull();
    expect(vector.getSignals('sleep', 'SIM-CDR', 336)).not.toBeNull();
    vector.emitSignals(snapshot('sleep', { sleepDebtHours: null }));
    vector.emitSignals(snapshot('sleep', { sleepDebtHours: 4 }, ago(1)));
    expect(vector.getExposures('SIM-CDR', 24)?.sleepDebtHours).toBeNull();
    expect(vector.getExposures('SIM-CDR', 24)?.refs.sleepDebtHours).toBeNull();
    clock += 24 * 3600000;
    expect(vector.getSignals('sleep', 'SIM-CDR', 24)).toBeNull();
  });
  it('selects scalar producers independently and retains exact provenance', () => {
    const vector = fixture();
    vector.emitSignals(snapshot('sleep', { sleepDebtHours: 0 }, ago(1)));
    vector.emitSignals(snapshot('cardio', { exerciseLoadPct: 135 }, ago(2)));
    vector.emitSignals(snapshot('bone', { resistanceLoadPct: 90, daysInFlight: 7 }, ago(3)));
    vector.emitSignals(snapshot('sans', { cabinCo2MmHg: 2 }, ago(4)));
    vector.emitSignals(
      snapshot('food', {
        sodiumMg: 10,
        calciumMg: 20,
        vitaminDIu: 30,
        fibreG: 40,
        energyPctOfNeed: 50,
        bodyMassKg: 60,
      }),
    );
    const result = vector.getExposures('SIM-CDR', 24)!;
    expect(result).toMatchObject({
      sleepDebtHours: 0,
      exerciseLoadPct: 135,
      resistanceLoadPct: 90,
      daysInFlight: 7,
      cabinCo2MmHg: 2,
      sodiumMg: 10,
      calciumMg: 20,
      vitaminDIu: 30,
      fibreG: 40,
      energyPctOfNeed: 50,
      bodyMassKg: 60,
    });
    expect(result.refs.sleepDebtHours).toEqual({
      risk: 'sleep',
      signal: 'sleepDebtHours',
      source: 'simulated-crew',
      simulated: true,
      recordedAt: ago(1),
    });
  });
  it('uses latest food arrays only, deduplicates and filters event times', () => {
    const vector = fixture();
    const event = food().signals.foodsEaten![0];
    vector.emitSignals(
      snapshot('food', {
        foodsEaten: [event, event, { ...event, mealId: 'older', eatenAt: ago(6) }],
        allergensEaten: [],
      }),
    );
    expect(vector.getExposures('SIM-CDR', 6)?.recentFoods).toEqual([event]);
    expect(vector.getExposures('SIM-CDR', 6)?.allergensEaten).toEqual([]);
    expect(vector.getExposures('SIM-CDR', 6)?.foodRecordRefs).toHaveLength(2);
    expect(vector.getExposures('SIM-CDR', 336)?.recentFoods).toHaveLength(2);
  });
  it('keeps null arrays distinct from reviewed empty arrays', () => {
    const vector = createVector({ clock: () => now });
    vector.emitSignals(snapshot('food', { foodsEaten: [], allergensEaten: null }));
    expect(vector.getExposures('SIM-CDR', 24)).toMatchObject({
      recentFoods: [],
      allergensEaten: null,
      foodRecordRefs: [{ signal: 'foodsEaten' }],
    });
  });
  it.each([NaN, Infinity, undefined, '60', -1, 101])(
    'rejects invalid numeric signal %s atomically',
    (value) => {
      const vector = createVector({ clock: () => now });
      const listener = vi.fn();
      vector.subscribe('SIM-CDR', listener);
      const record = immune();
      Object.assign(record.signals, { hivesPatternPct: value });
      expect(() => vector.emitSignals(record)).toThrow();
      expect(vector.getSignals('immune', 'SIM-CDR', 24)).toBeNull();
      expect(listener).not.toHaveBeenCalled();
    },
  );
  it.each([
    '2026-11-14',
    '2026-02-30T10:00:00Z',
    '2026-11-14T11:00:00',
    '2026-11-14T24:00:00Z',
    ago(-1),
  ])('rejects invalid/future timestamps %s', (recordedAt) => {
    expect(() => fixture().emitSignals(snapshot('mood', {}, recordedAt))).toThrow();
  });
  it('rejects extra and missing keys, wrong discriminator and source', () => {
    const vector = fixture();
    for (const record of [
      { ...immune(), extra: true },
      { ...immune(), signals: { rashActive: true } },
      { ...food(), risk: 'sleep' },
      { ...immune(), source: 'user-entered' },
      { ...immune(), simulated: false },
    ]) {
      expect(() => vector.emitSignals(record as AnyRiskSignalRecord)).toThrow();
    }
  });
  it.each([
    snapshot('cardio', { hrDeltaBpmAtWorkload: 0 }),
    snapshot('bone', { bmdChangePctPerMonth: 0 }),
    snapshot('sans', { nearVisionChangeLines: 0 }),
    snapshot('sans', { octThicknessChangeUm: 0 }),
  ])('rejects dependent values without companions: $risk', (record) => {
    expect(() => fixture().emitSignals(record)).toThrow('requires');
  });
  it.each([24, -1])('rejects food events outside the source snapshot at %s hours', (hours) => {
    const record = snapshot('food', {
      allergensEaten: [{ mealId: 'meal', allergen: 'shellfish', eatenAt: ago(hours) }],
    });
    expect(() => fixture().emitSignals(record)).toThrow('outside snapshot');
  });
  it('rejects an event later than its record even when not future', () => {
    const record = food();
    record.signals.allergensEaten![0].eatenAt = ago(2);
    expect(() => fixture().emitSignals(record)).toThrow('outside snapshot');
  });
  it('accepts valid zero, false, signed changes, and uncapped retention', () => {
    const vector = fixture();
    vector.emitSignals(
      snapshot('cardio', {
        workloadW: 0,
        hrDeltaBpmAtWorkload: -10,
        vo2PeakPctBaseline: 140,
        missingReadingsCount: 0,
      }),
    );
    vector.emitSignals(snapshot('mood', { mood: 0, crewConflict: false }));
    expect(vector.getSignals('cardio', 'SIM-CDR', 24)?.signals.vo2PeakPctBaseline).toBe(140);
    expect(vector.getSignals('mood', 'SIM-CDR', 24)?.signals.crewConflict).toBe(false);
  });
});

describe('demo-immune-v1', () => {
  it('reproduces complete 60 -> 80 worked example through VectorApi', () => {
    expect(fixture().personalise('immune', 'SIM-CDR', base())).toEqual({
      adjustedPct: 80,
      reasons: [
        {
          direction: 'up',
          text: 'Known matching food allergy',
          sourceRisk: 'immune',
          signal: 'traits.allergies',
        },
        {
          direction: 'up',
          text: 'Matching allergen eaten within six hours',
          sourceRisk: 'food',
          signal: 'food.allergensEaten',
        },
      ],
    });
  });
  it.each([null, []])('does not infer unknown or undeclared allergies: %j', (allergies) => {
    const registrations = structuredClone(demoRegistrations);
    registrations[0].traits.allergies = allergies;
    const vector = createVector({ clock: () => now, registrations });
    vector.emitSignals(food());
    vector.emitSignals(immune());
    expect(vector.personalise('immune', 'SIM-CDR', base())).toEqual({
      adjustedPct: 60,
      reasons: [],
    });
  });
  it.each([false, null])('requires active rash: %s', (rashActive) => {
    const vector = createVector({ clock: () => now });
    vector.emitSignals(food());
    vector.emitSignals({ ...immune(), signals: { ...immune().signals, rashActive } });
    expect(vector.personalise('immune', 'SIM-CDR', base()).adjustedPct).toBe(60);
  });
  it.each([6, 24])('does not adjust at event/context boundary %s hours', (hours) => {
    const vector = createVector({ clock: () => now });
    vector.emitSignals(
      snapshot(
        'food',
        { allergensEaten: [{ mealId: 'meal', allergen: 'shellfish', eatenAt: ago(hours) }] },
        ago(hours),
      ),
    );
    vector.emitSignals(immune());
    expect(vector.personalise('immune', 'SIM-CDR', base())).toEqual({
      adjustedPct: 60,
      reasons: [],
    });
  });
  it('includes an event exactly now and one just inside six hours', () => {
    for (const eatenAt of [time, new Date(now - 6 * 3600000 + 1).toISOString()]) {
      const vector = createVector({ clock: () => now });
      vector.emitSignals(immune());
      vector.emitSignals(
        snapshot('food', { allergensEaten: [{ mealId: 'meal', allergen: 'shrimp', eatenAt }] }),
      );
      expect(vector.personalise('immune', 'SIM-CDR', base()).adjustedPct).toBe(80);
    }
  });
  it('does not match food names, unrelated allergens, or missing context', () => {
    for (const allergensEaten of [
      null,
      [],
      [{ mealId: 'meal', allergen: 'milk', eatenAt: time }],
    ]) {
      const vector = createVector({ clock: () => now });
      vector.emitSignals(immune());
      vector.emitSignals(
        snapshot('food', { foodsEaten: food().signals.foodsEaten, allergensEaten }),
      );
      expect(vector.personalise('immune', 'SIM-CDR', base())).toEqual({
        adjustedPct: 60,
        reasons: [],
      });
    }
    expect(
      createVector({ clock: () => now }).personalise('immune', 'SIM-CDR', base()).adjustedPct,
    ).toBe(60);
  });
  it.each(['insufficient', 'conflicting'] as const)(
    'keeps null %s evidence nonnumeric',
    (evidence) => {
      expect(
        fixture().personalise('immune', 'SIM-CDR', { ...base(), evidence, value: null }),
      ).toEqual({ adjustedPct: null, reasons: [] });
      expect(() => fixture().personalise('immune', 'SIM-CDR', { ...base(), evidence })).toThrow(
        'evidence/value',
      );
    },
  );
  it.each([
    [60, 80],
    [60.25, 80.25],
    [90.25, 100],
  ])('never stacks, preserves decimals and clamps: %s -> %s', (value, adjustedPct) => {
    const registrations = structuredClone(demoRegistrations);
    registrations[0].traits.allergies = ['shellfish', 'peanut'];
    const vector = createVector({ clock: () => now, registrations });
    vector.emitSignals(
      snapshot('food', {
        allergensEaten: ['shrimp', 'shellfish', 'peanut'].map((allergen, index) => ({
          mealId: String(index),
          allergen,
          eatenAt: time,
        })),
      }),
    );
    vector.emitSignals({ ...immune(), signals: { ...immune().signals, hivesPatternPct: value } });
    expect(vector.personalise('immune', 'SIM-CDR', { ...base(), value })).toMatchObject({
      adjustedPct,
      reasons: [{ direction: 'up' }, { direction: 'up' }],
    });
    expect(
      fixture().personalise('immune', 'SIM-CDR', { ...base(), value: 60.25 }).adjustedPct,
    ).toBe(60.25);
  });
  it('reads once from clock and never emits/evaluates into a feedback loop', () => {
    const clock = vi.fn(() => now);
    const vector = createVector({ clock });
    vector.emitSignals(food());
    vector.emitSignals(immune());
    const listener = vi.fn(() => vector.personalise('immune', 'SIM-CDR', base()));
    vector.subscribe('SIM-CDR', listener);
    clock.mockClear();
    expect(vector.personalise('immune', 'SIM-CDR', base()).adjustedPct).toBe(80);
    expect(clock).toHaveBeenCalledTimes(1);
    expect(vector.personalise('immune', 'SIM-CDR', base()).adjustedPct).toBe(80);
    expect(vector.getSignals('immune', 'SIM-CDR', 24)?.signals.hivesPatternPct).toBe(60);
    expect(listener).not.toHaveBeenCalled();
    const adjusted = vector.personalise('immune', 'SIM-CDR', base());
    expect(() =>
      vector.personalise('immune', 'SIM-CDR', {
        ...base(),
        value: adjusted.adjustedPct,
        reasons: adjusted.reasons,
      }),
    ).toThrow('unpersonalised');
    expect(vector.personalise('immune', 'SIM-CDR', { ...base(), value: 80 }).adjustedPct).toBe(80);
  });
  it.each([-20, 140])('leaves change-vs-baseline %s untouched', (value) => {
    const evaluation = { ...base(), kind: 'change-vs-baseline' as const, value };
    expect(fixture().personalise('immune', 'SIM-CDR', evaluation)).toEqual({
      adjustedPct: null,
      reasons: [],
    });
    expect(evaluation.value).toBe(value);
  });
  it('never changes escalation and suppresses urgent personalisation', () => {
    for (const level of ['urgent', 'next-pmc'] as const) {
      const evaluation = {
        ...base(),
        escalation: { level, trigger: 'red-flag' as const, text: 'Reported trouble breathing' },
        ...(level === 'urgent' ? { value: null, evidence: 'insufficient' as const } : {}),
      };
      const original = structuredClone(evaluation);
      const result = fixture().personalise('immune', 'SIM-CDR', evaluation);
      expect(evaluation).toEqual(original);
      expect(result.adjustedPct).toBe(level === 'urgent' ? null : 80);
    }
    expect(() =>
      fixture().personalise('immune', 'SIM-CDR', {
        ...base(),
        escalation: { level: 'urgent', trigger: 'red-flag', text: 'Reported trouble breathing' },
      }),
    ).toThrow('null display');
  });
  it('rejects identity/flag mismatches and malformed evaluations', () => {
    const vector = fixture();
    for (const changes of [
      { risk: 'food' },
      { crewId: 'SIM-PLT' },
      { simulated: false },
      { value: 101 },
      { unit: 'kg' },
      { label: '' },
      { value: null },
    ]) {
      expect(() =>
        vector.personalise('immune', 'SIM-CDR', { ...base(), ...changes } as RiskEvaluation),
      ).toThrow();
    }
    expect(vector.personalise('food', 'SIM-CDR', { ...base(), risk: 'food' })).toEqual({
      adjustedPct: 60,
      reasons: [],
    });
  });
  it('isolates identities and source/series, with no research adjustment', () => {
    const registrations = [
      ...demoRegistrations,
      ...['USER:person:first', 'USER:person:second', 'RESEARCH:MR080G:person:first'].map(
        (crewId) => ({
          ...structuredClone(demoRegistrations[0]),
          crewId,
          comparisonGroupId: crewId.split(':').slice(-1)[0],
          source: crewId.startsWith('USER')
            ? ('user-entered' as const)
            : ('nasa-research-replay' as const),
          simulated: crewId.startsWith('USER'),
          baselines: { entries: [] },
        }),
      ),
    ];
    const vector = createVector({ clock: () => now, registrations });
    vector.emitSignals(food());
    for (const registration of registrations) {
      const identity = {
        crewId: registration.crewId,
        source: registration.source,
        simulated: registration.simulated,
      };
      vector.emitSignals({ ...immune(), ...identity });
      const evaluation = { ...base(), crewId: identity.crewId, simulated: identity.simulated };
      expect(vector.personalise('immune', identity.crewId, evaluation).adjustedPct).toBe(
        identity.crewId === 'SIM-CDR' ? 80 : 60,
      );
      if (identity.source === 'nasa-research-replay') {
        vector.emitSignals({ ...food(), ...identity });
        expect(vector.personalise('immune', identity.crewId, evaluation).adjustedPct).toBe(60);
      }
    }
    vector.emitSignals({ ...food(), crewId: 'USER:person:first', source: 'user-entered' });
    expect(
      vector.personalise('immune', 'USER:person:first', { ...base(), crewId: 'USER:person:first' })
        .adjustedPct,
    ).toBe(80);
    expect(
      vector.personalise('immune', 'USER:person:second', {
        ...base(),
        crewId: 'USER:person:second',
      }).adjustedPct,
    ).toBe(60);
  });
  it('does not reuse stale immune context or backfill latest null base scores', () => {
    const vector = createVector({ clock: () => now });
    vector.emitSignals(food());
    vector.emitSignals({ ...immune(), recordedAt: ago(24) });
    expect(vector.personalise('immune', 'SIM-CDR', base()).adjustedPct).toBe(60);
    vector.emitSignals({ ...immune(), recordedAt: ago(1) });
    vector.emitSignals(snapshot('immune', { rashActive: true }));
    expect(vector.personalise('immune', 'SIM-CDR', base()).adjustedPct).toBe(60);
  });
  it('deduplicates aliases in exposure snapshots without mutating producer records', () => {
    const vector = createVector({ clock: () => now });
    vector.emitSignals(
      snapshot('food', {
        allergensEaten: ['shrimp', 'shellfish'].map((allergen) => ({
          mealId: 'meal',
          allergen,
          eatenAt: time,
        })),
      }),
    );
    expect(vector.getExposures('SIM-CDR', 24)?.allergensEaten).toEqual([
      { mealId: 'meal', allergen: 'shellfish', eatenAt: time },
    ]);
    expect(vector.getSignals('food', 'SIM-CDR', 24)?.signals.allergensEaten).toHaveLength(2);
  });
  it.each([
    [' ＰＲＡＷＮＳ ', 'shellfish'],
    ['Tree   Nut', 'tree-nuts'],
    ['PEANUT', 'peanuts'],
    ['soya', 'soy'],
    ['dairy', 'milk'],
    ['egg', 'eggs'],
    ['custom   food', 'custom food'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normaliseAllergen(input)).toBe(expected);
  });
});
