import { describe, expect, it, vi } from 'vitest';
import { createVector } from '../vector/store';
import { riskTabs, tabStatus } from '../shell/registry';
import { seedScenario } from '../shell/scenario';
import { vector as bootVector, demoTime } from '../shell/vector';
import { foodScenario } from '../risks/food/scenario';
import { getFoodState, highSodiumWeek, lowEnergySummary } from '../risks/food/store';
import { balanceStore } from '../risks/balance/model';
import { moodStore } from '../risks/mood/model';
import { sansStore } from '../risks/sans/model';
import { gutStore } from '../risks/microbiome/model';
import type { AnyRiskSignalRecord, RiskId, RiskTab } from '../risks/types';
import { atDay, dayMs, missionCrew, missionStart, missionTime } from './mission';
import { scenarioRegistrations } from './registrations';

const fresh = () =>
  createVector({ clock: () => Date.parse(missionTime), registrations: scenarioRegistrations });
const owned: RiskId[] = ['food', 'balance', 'microbiome', 'sans', 'mood'];

describe('Mission day 100', () => {
  it('boots with all five owned tab summaries for every crew without user actions', () => {
    for (const { crewId } of missionCrew) {
      for (const risk of owned)
        expect(tabStatus(risk, { crewId, vector: bootVector }).text).not.toBe('No data');
    }
    expect(tabStatus('microbiome', { crewId: 'SIM-CDR', vector: bootVector }).text).toBe(
      '2 changed days',
    );
    expect(tabStatus('microbiome', { crewId: 'SIM-PLT', vector: bootVector }).text).toBe(
      '0 changed days',
    );
  });

  it('uses coherent mission dates, complete food windows and earlier personal references', () => {
    const vector = fresh();
    const records: AnyRiskSignalRecord[] = [];
    const emit = vector.emitSignals;
    vi.spyOn(vector, 'emitSignals').mockImplementation((record) => {
      records.push(record);
      emit(record);
    });
    seedScenario(vector, riskTabs);
    expect(Date.parse(demoTime) - Date.parse(missionTime)).toBe(10 * 60_000);
    expect((Date.parse(atDay(0).slice(0, 10)) - Date.parse(missionStart)) / dayMs + 1).toBe(100);
    expect(records.length).toBeGreaterThan(60);
    for (const record of records) {
      expect(Date.parse(record.recordedAt)).toBeLessThanOrEqual(Date.parse(demoTime));
      expect(record).toMatchObject({ simulated: true, source: 'simulated-crew' });
    }
    for (const story of missionCrew) {
      const ctx = { crewId: story.crewId, vector };
      const meals = foodScenario(ctx);
      for (const input of meals) {
        for (const meal of input.meals) {
          expect(Date.parse(meal.eatenAt)).toBeLessThanOrEqual(Date.parse(input.observedAt));
          expect(Date.parse(meal.eatenAt)).toBeGreaterThan(Date.parse(input.observedAt) - dayMs);
        }
      }
      const vision = sansStore.history(ctx);
      expect(vision[0].recordedAt < vision[1].recordedAt).toBe(true);
      expect(riskTabs.sans!.evaluate(ctx).value).toBe(story.sansChangeLines);
      expect(story.radiation.missionDays).toBe(100);
      expect(story.radiation.missionDoseMsv).toBeCloseTo(story.radiation.dailyDoseMsv * 100);
    }
    expect(
      missionCrew[0].sleep.hours.reduce((debt, hours) => debt + Math.max(0, 8 - hours), 0),
    ).toBe(6.5);
  });

  it('is idempotent through each normal save path, preserving histories, selection and notifications', () => {
    const vector = fresh();
    const emit = vi.spyOn(vector, 'emitSignals');
    seedScenario(vector, riskTabs);
    const snapshots = () =>
      missionCrew.map(({ crewId }) => {
        const ctx = { crewId, vector };
        return {
          food: getFoodState(ctx),
          balance: balanceStore.history(ctx),
          mood: moodStore.history(ctx),
          sans: sansStore.history(ctx),
          gut: gutStore.history(ctx),
        };
      });
    const before = snapshots();
    const calls = emit.mock.calls.length;
    const ctx = { crewId: 'SIM-CDR', vector };
    moodStore.select(ctx, moodStore.history(ctx)[0].recordedAt);
    expect(() => seedScenario(vector, riskTabs)).not.toThrow();
    expect(snapshots()).toEqual(before);
    expect(emit).toHaveBeenCalledTimes(calls);
    expect(moodStore.current(ctx)?.recordedAt).toBe(before[0].mood[0].recordedAt);
  });

  it('shares selective allergy exposure and real Food fibre with downstream tabs', () => {
    const vector = fresh();
    seedScenario(vector, riskTabs);
    const cdr = { crewId: 'SIM-CDR', vector };
    const ms1 = { crewId: 'SIM-MS1', vector };
    expect(vector.getVector(cdr.crewId)?.traits.allergies).toEqual(['shellfish']);
    const exposure = vector.getExposures(cdr.crewId, 6)!.allergensEaten!;
    expect(exposure.filter((item) => item.allergen === 'shellfish')).toHaveLength(1);
    expect(exposure.find((item) => item.allergen === 'shellfish')?.eatenAt).toBe(atDay(0, 8));
    expect(vector.getVector(ms1.crewId)?.traits.allergies).toEqual(['peanuts']);
    expect(vector.getExposures(ms1.crewId, 24)?.allergensEaten).toEqual([]);
    expect(vector.getExposures('SIM-PLT', 24)?.allergensEaten).toEqual([]);
    expect(vector.getSignals('food', cdr.crewId, 24)?.signals.sodiumMg).toBeGreaterThan(2300);
    const gut = gutStore.current(cdr)!;
    expect(gut.fibre.origin).toBe('food-vector');
    expect(gut.fibre.grams).toBe(vector.getExposures(cdr.crewId, 24)?.fibreG);
    expect(gut.fibre.grams).toBeLessThan(gut.fibreTargetG!);
    expect(gutStore.history(cdr)[0].fibre.grams).toBeNull(); // API cannot retrieve historical totals.
    expect(lowEnergySummary(getFoodState(ms1).history)).toBe('71% of need for 5 days');
    expect(highSodiumWeek(getFoodState(cdr).history)).toBe(true);
    expect(highSodiumWeek(getFoodState(ms1).history)).toBe(false);
    expect(riskTabs.food!.evaluate(ms1).value).toBeCloseTo(-1.4);
    expect(riskTabs.balance!.evaluate(cdr).value).toBeCloseTo(1);
    expect(
      moodStore
        .history(cdr)
        .slice(-5)
        .map((entry) => entry.mood),
    ).toEqual([6, 5, 4, 3, 2]);
    expect(riskTabs.sans!.evaluate({ crewId: 'SIM-PLT', vector }).escalation?.level).toBe(
      'next-pmc',
    );
  });

  it.skipIf(!riskTabs.immune?.loadScenario)(
    'CDR reaches 80% through the Immune loader (pending Shi Wei loadScenario)',
    () => {
      const vector = fresh();
      seedScenario(vector, riskTabs);
      expect(riskTabs.immune!.evaluate({ crewId: 'SIM-CDR', vector }).value).toBe(80);
      expect(riskTabs.immune!.evaluate({ crewId: 'SIM-MS1', vector }).reasons).toEqual([]);
    },
  );

  it('can start clean and isolates failed tabs while loading Food first', () => {
    const vector = fresh();
    seedScenario(vector, riskTabs, '?scenario=off');
    for (const risk of owned) expect(vector.getSignals(risk, 'SIM-CDR', 24)).toBeNull();
    const order: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tab = (id: RiskId, fail = false) =>
      ({
        ...riskTabs.food!,
        id,
        loadScenario: () => {
          order.push(id);
          if (fail) throw new Error('isolated failure');
        },
      }) as RiskTab;
    try {
      seedScenario(vector, {
        mood: tab('mood'),
        immune: tab('immune', true),
        food: tab('food'),
        sans: tab('sans'),
      });
      expect(order).toEqual(Array(3).fill(['food', 'mood', 'immune', 'sans']).flat());
      expect(warn).toHaveBeenCalledTimes(3);
    } finally {
      warn.mockRestore();
    }
  });
});
