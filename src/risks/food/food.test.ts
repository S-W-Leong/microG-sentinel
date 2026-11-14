import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { BaselineValue, CrewVector, VectorApi } from '../types';
import { riskTab } from './index';
import {
  baseEvaluation,
  baselineKey,
  buildRecord,
  demoInput,
  emptyInput,
  foodEscalation,
  mustScore,
  nutrientTotals,
  utcTimestamp,
} from './model';
import { evaluateFood, getFoodState, saveFood, subscribeFood } from './store';

const observedAt = '2026-11-14T11:00:00.000Z';
const baseline: BaselineValue<'bodyMassKg'> = {
  metric: 'bodyMassKg',
  value: 71.4,
  unit: 'kg',
  sourceSessionIds: ['mass-1'],
  count: 1,
  source: 'simulated-crew',
  comparisonGroupId: 'sim-cdr-mass',
  methodId: 'same-scale',
  contextKey: 'morning',
  recordedAt: '2026-11-01T08:00:00.000Z',
  evidence: 'supported',
};

function fakeVector(reference: BaselineValue<'bodyMassKg'> = baseline) {
  const crew: CrewVector = {
    crewId: 'SIM-CDR',
    source: 'simulated-crew',
    simulated: true,
    traits: {
      allergies: ['shellfish'],
      chronotype: null,
      geneticFlags: null,
      motionSicknessHistory: null,
    },
    baselines: { entries: [reference] },
    exposures: {
      asOf: observedAt,
      sinceHours: 24,
      sleepDebtHours: null,
      exerciseLoadPct: null,
      resistanceLoadPct: null,
      daysInFlight: null,
      cabinCo2MmHg: null,
      sodiumMg: null,
      calciumMg: null,
      vitaminDIu: null,
      fibreG: null,
      energyPctOfNeed: null,
      bodyMassKg: null,
      recentFoods: null,
      allergensEaten: null,
      foodRecordRefs: [],
      refs: {
        sleepDebtHours: null,
        exerciseLoadPct: null,
        resistanceLoadPct: null,
        daysInFlight: null,
        cabinCo2MmHg: null,
        sodiumMg: null,
        calciumMg: null,
        vitaminDIu: null,
        fibreG: null,
        energyPctOfNeed: null,
        bodyMassKg: null,
      },
    },
  };
  const emitSignals = vi.fn();
  const personalise = vi.fn(() => ({ adjustedPct: 99, reasons: [] }));
  const vector: VectorApi = {
    emitSignals,
    getVector: (crewId) => (crewId === crew.crewId ? structuredClone(crew) : null),
    getExposures: () => null,
    getSignals: () => null,
    personalise,
    subscribe: () => () => {},
  };
  return { vector, crew, emitSignals, personalise, context: { crewId: 'SIM-CDR', vector } };
}

describe('Food save-to-emit contract', () => {
  it('exports only the required descriptor fields', () => {
    expect(Object.keys(riskTab).sort()).toEqual(['Component', 'evaluate', 'id', 'region', 'title']);
    expect(riskTab).toMatchObject({ id: 'food', region: 'gut', title: 'Food' });
  });

  it('emits all ten exact fields with unknowns preserved', () => {
    const { context, emitSignals } = fakeVector();
    const record = saveFood(context, emptyInput(observedAt));
    expect(emitSignals).toHaveBeenCalledExactlyOnceWith(record);
    expect(record).toEqual({
      risk: 'food',
      crewId: 'SIM-CDR',
      recordedAt: observedAt,
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
        fibreG: null,
        bodyMassKg: null,
        bodyMassChangeKg: null,
      },
    });
  });

  it('emits the shellfish fixture, correct units and portion totals', () => {
    const { context, emitSignals } = fakeVector();
    const record = saveFood(context, demoInput());
    expect(emitSignals).toHaveBeenCalledExactlyOnceWith(record);
    expect(record.signals).toEqual({
      foodsEaten: [
        {
          mealId: 'sim-cdr-shrimp-20261114',
          foodName: 'Shrimp rice',
          eatenAt: '2026-11-14T08:00:00.000Z',
        },
      ],
      allergensEaten: [
        {
          mealId: 'sim-cdr-shrimp-20261114',
          allergen: 'shellfish',
          eatenAt: '2026-11-14T08:00:00.000Z',
        },
      ],
      energyPctOfNeed: 15,
      proteinGPerKg: 20 / 70,
      sodiumMg: 875,
      calciumMg: 100,
      vitaminDIu: 20,
      fibreG: 3.75,
      bodyMassKg: 70,
      bodyMassChangeKg: null,
    });
  });

  it('distinguishes reviewed empty intake from unknown intake', () => {
    const { context } = fakeVector();
    const input = { ...emptyInput(observedAt), logComplete: true };
    expect(saveFood(context, input).signals).toMatchObject({
      foodsEaten: [],
      allergensEaten: [],
      sodiumMg: 0,
      energyPctOfNeed: null,
      proteinGPerKg: null,
    });
  });

  it('sums mixed meals and propagates an unknown nutrient', () => {
    const input = demoInput();
    input.meals.push({
      ...input.meals[0],
      id: 'fruit',
      itemId: 'sim-fruit',
      grams: 100,
      ingredients: 'Apple, peach, pear',
      allergens: [],
    });
    expect(nutrientTotals(input)).toEqual({
      energyKcal: 435,
      proteinG: 20.5,
      sodiumMg: 877,
      calciumMg: 110,
      vitaminDIu: null,
      fibreG: 6.25,
    });
  });

  it('does not count unconfirmed meals or infer allergens', () => {
    const input = demoInput();
    input.meals[0].confirmed = false;
    input.meals[0].allergens = null;
    expect(buildRecord('SIM-CDR', input, null).signals).toMatchObject({
      foodsEaten: null,
      allergensEaten: null,
      energyPctOfNeed: null,
      sodiumMg: null,
    });
  });

  it('uses the open-start, closed-end trailing window', () => {
    const input = demoInput();
    input.meals[0].eatenAt = '2026-11-13T11:00:00.000Z';
    expect(buildRecord('SIM-CDR', input, null).signals.foodsEaten).toBeNull();
    input.meals[0].eatenAt = observedAt;
    expect(buildRecord('SIM-CDR', input, null).signals.foodsEaten).toHaveLength(1);
  });

  it('canonicalises offset timestamps and rejects invalid dates', () => {
    expect(utcTimestamp('2026-11-14T16:00:00+08:00')).toBe('2026-11-14T08:00:00.000Z');
    expect(() => utcTimestamp('2026-11-14T08:00')).toThrow();
    expect(() => utcTimestamp('2026-02-30T08:00Z')).toThrow();
  });

  it.each([0, -1, 501, NaN, Infinity])('rejects invalid mass %s before emission', (mass) => {
    const { context, emitSignals } = fakeVector();
    expect(() => saveFood(context, { ...demoInput(), bodyMassKg: mass })).toThrow();
    expect(emitSignals).not.toHaveBeenCalled();
  });

  it('rejects bad portions, targets, future meals and out-of-domain totals', () => {
    const input = demoInput();
    input.meals[0].grams = 0;
    expect(() => buildRecord('SIM-CDR', input, null)).toThrow();
    input.meals[0].grams = 250;
    input.targets.energyKcal = 0;
    expect(() => buildRecord('SIM-CDR', input, null)).toThrow();
    input.targets.energyKcal = 2500;
    input.meals[0].eatenAt = '2026-11-14T12:00:00Z';
    expect(() => buildRecord('SIM-CDR', input, null)).toThrow();
    input.meals[0].eatenAt = observedAt;
    input.meals[0].grams = 100000;
    expect(() => buildRecord('SIM-CDR', input, null)).toThrow();
  });

  it('requires confirmed ingredients and reviewed allergen tags', () => {
    const input = demoInput();
    input.meals[0].allergens = null;
    expect(() => buildRecord('SIM-CDR', input, null)).toThrow();
    input.meals[0].allergens = [];
    expect(buildRecord('SIM-CDR', input, null).signals.allergensEaten).toEqual([]);
  });

  it('keeps crews and VectorApi instances isolated', () => {
    const { context } = fakeVector();
    saveFood(context, demoInput());
    expect(getFoodState({ ...context, crewId: 'SIM-OTHER' }).history).toEqual([]);
    expect(getFoodState(fakeVector().context).history).toEqual([]);
  });

  it('rejects real/research vectors for the simulated menu', () => {
    const { crew } = fakeVector();
    expect(() =>
      buildRecord('SIM-CDR', demoInput(), { ...crew, source: 'user-entered', simulated: false }),
    ).toThrow();
    expect(() => buildRecord('OTHER', demoInput(), crew)).toThrow();
  });

  it('notifies once, detaches drafts and rejects duplicate check-ins', () => {
    const { context, emitSignals } = fakeVector();
    const listener = vi.fn();
    const unsubscribe = subscribeFood(context, listener);
    const input = demoInput();
    saveFood(context, input);
    input.meals[0].grams = 9;
    expect(getFoodState(context).input.meals[0].grams).toBe(250);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => saveFood(context, input)).toThrow();
    expect(emitSignals).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not save if the vector rejects emission', () => {
    const { context, emitSignals } = fakeVector();
    emitSignals.mockImplementation(() => {
      throw new Error('Rejected');
    });
    expect(() => saveFood(context, demoInput())).toThrow('Rejected');
    expect(getFoodState(context).history).toEqual([]);
  });
});

describe('Food evaluation and rendering', () => {
  it('makes the saved input visible during vector notification', () => {
    const { context, emitSignals } = fakeVector();
    emitSignals.mockImplementation(() => {
      expect(getFoodState(context).input.bodyMassKg).toBe(70);
    });
    saveFood(context, demoInput());
  });

  it('retains above-target text while capping the ring arc', () => {
    const { context } = fakeVector();
    const input = demoInput();
    input.targets.energyKcal = 250;
    saveFood(context, input);
    const html = renderToStaticMarkup(createElement(riskTab.Component, context));
    expect(html).toContain('150%');
    expect(html).toContain('--food-progress:360deg');
  });

  it('preserves unknown mass denominators and exact numeric upper bounds', () => {
    const input = demoInput();
    input.bodyMassKg = null;
    expect(buildRecord('SIM-CDR', input, null).signals.proteinGPerKg).toBeNull();
    input.bodyMassKg = 500;
    input.targets.energyKcal = 75;
    expect(buildRecord('SIM-CDR', input, null).signals).toMatchObject({
      bodyMassKg: 500,
      energyPctOfNeed: 500,
    });
  });

  it('compares only an explicitly selected compatible baseline and preserves kg', () => {
    const { context, personalise } = fakeVector();
    saveFood(context, { ...demoInput(), baselineKey: baselineKey(baseline) });
    const evaluation = evaluateFood(context);
    expect(evaluation.value).toBeCloseTo(-1.4);
    expect(evaluation.unit).toBe('kg');
    expect(personalise).toHaveBeenCalledTimes(1);
  });

  it.each(['insufficient', 'conflicting'] as const)('withholds %s baseline values', (evidence) => {
    const { context } = fakeVector({ ...baseline, evidence });
    saveFood(context, { ...demoInput(), baselineKey: baselineKey(baseline) });
    expect(evaluateFood(context).value).toBeNull();
    if (evidence === 'conflicting')
      expect(evaluateFood(context).escalation?.trigger).toBe('conflicting');
  });

  it.each(['unableToEatDrink24h', 'unplannedLossOver10Pct'] as const)(
    'makes %s urgent and suppresses scores/personalisation',
    (flag) => {
      const { context, personalise } = fakeVector();
      saveFood(context, {
        ...demoInput(),
        [flag]: true,
        heightCm: 175,
        unplannedLossPct: 0,
        acuteIllnessNoIntake5d: false,
      });
      const evaluation = evaluateFood(context);
      expect(evaluation).toMatchObject({
        value: null,
        escalation: { level: 'urgent', trigger: 'red-flag' },
        reasons: [],
      });
      const html = renderToStaticMarkup(createElement(riskTab.Component, context));
      expect(html).toContain('Contact the flight surgeon now');
      expect(html).not.toContain('food-rings');
      expect(html).not.toContain('MUST follow-up');
      expect(personalise).not.toHaveBeenCalled();
    },
  );

  it('computes MUST only with complete inputs and tests weight-loss boundaries', () => {
    const input = { ...demoInput(), heightCm: 175, acuteIllnessNoIntake5d: false };
    expect(mustScore(input)).toBeNull();
    expect(mustScore({ ...input, unplannedLossPct: 4.9 })).toBe(0);
    expect(mustScore({ ...input, unplannedLossPct: 5 })).toBe(1);
    expect(mustScore({ ...input, unplannedLossPct: 10 })).toBe(1);
    expect(mustScore({ ...input, unplannedLossPct: 10.1 })).toBe(2);
    expect(foodEscalation({ ...input, unplannedLossPct: 10.1 }, 1, null)?.level).toBe('urgent');
    expect(
      foodEscalation({ ...input, unplannedLossPct: 0, acuteIllnessNoIntake5d: true }, 1, null)
        ?.trigger,
    ).toBe('indicative-score');
  });

  it('queues incomplete repeated check-ins and other concerns for PMC', () => {
    expect(foodEscalation(emptyInput(observedAt), 1, null)).toBeNull();
    expect(foodEscalation(emptyInput(observedAt), 2, null)?.level).toBe('next-pmc');
    expect(foodEscalation({ ...demoInput(), somethingElse: true }, 1, null)?.trigger).toBe(
      'something-else',
    );
  });

  it('renders numbers, source tags, timeline, and neutral wording', () => {
    const { context } = fakeVector();
    saveFood(context, demoInput());
    const html = renderToStaticMarkup(createElement(riskTab.Component, context));
    expect(html).toContain('375');
    expect(html).toContain('shellfish');
    expect(html).toContain('2026-11-14T08:00:00.000Z');
    expect(html).toContain('Simulated');
    expect(html).toContain('Prototype · not for clinical use');
    expect(html).not.toMatch(/\b(healthy|safe|cleared|diagnosed|diagnosis|malnourished)\b/i);
    expect(baseEvaluation('SIM-CDR', demoInput(), 1, null).label).toBe('Baseline needed');
  });
});
