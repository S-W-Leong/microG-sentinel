import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createVector } from '../../vector/store';
import { scenarioRegistrations } from '../../scenario/registrations';
import { atDay, dayMs, missionCrew, missionStart, missionTime } from '../../scenario/mission';
import { seedScenario } from '../../shell/scenario';
import { riskTabs } from '../../shell/registry';
import type { RiskTab } from '../types';
import { riskTab as cardio } from './index';
import { riskTab as sleep } from '../sleep';
import { riskTab as immune } from '../immune';
import { riskTab as bone } from '../bone';
import { adaptExercise, cardioIdentity, cardioStore, saveCardio } from './model';
import { display } from './presentation';
import { saveSleep, sleepSample, sleepStore } from '../sleep/model';
import { immuneStore, saveImmune } from '../immune/model';
import { boneStore, saveBone } from '../bone/model';
import { sleepContext } from '../mood/model';

const fresh = () =>
  createVector({ clock: () => Date.parse(missionTime), registrations: scenarioRegistrations });
const tabs: RiskTab[] = [cardio, sleep, immune, bone];
const stores = [cardioStore, sleepStore, immuneStore, boneStore];

describe('Shi Wei mission loaders', () => {
  it('saves all four stories through the real vector, with exact downstream context', () => {
    const vector = fresh();
    seedScenario(vector, riskTabs);
    for (const [index, story] of missionCrew.entries()) {
      const ctx = { crewId: story.crewId, vector };
      for (const tab of tabs) {
        expect(tab.loadScenario).toBeTypeOf('function');
        expect(vector.getSignals(tab.id, ctx.crewId, 24)).toMatchObject({
          simulated: true,
          source: 'simulated-crew',
        });
      }
      expect(vector.getSignals('sleep', ctx.crewId, 24)?.signals).toMatchObject({
        sleepHours: story.sleep.hours[2],
        sleepDebtHours: [6.5, 0, 1][index],
        fatigueSamnPerelli: story.sleep.fatigue,
        bodyClockShiftHours: 0,
      });
      expect(sleep.evaluate(ctx).value).toBe(story.sleep.hours[2] - 8);
      expect(sleepContext(ctx)).toEqual({ debt: [6.5, 0, 1][index], fatigue: story.sleep.fatigue });
      expect(sleepStore.history(ctx).map((input) => input.recordedAt)).toEqual([
        atDay(2),
        atDay(1),
        missionTime,
      ]);
      for (const input of sleepStore.history(ctx)) {
        expect(input).toMatchObject({
          mode: 'manual',
          complete: true,
          naps: [],
          stages: [],
          duty: null,
          baselineMidpointHourUtc: 4,
          comparisonGroupId: `${ctx.crewId}-MISSION-01`,
          criticalTaskSleep: false,
          deviceId: null,
          timezone: null,
          movementUnit: null,
        });
        expect(input.planned).toEqual({ start: input.start, end: input.end });
        expect(Date.parse(input.end!)).toBeLessThanOrEqual(Date.parse(input.recordedAt));
      }
      expect(vector.getSignals('immune', ctx.crewId, 24)?.signals.hivesPatternPct).toBe(
        story.immune.basePct,
      );
      expect(immune.evaluate(ctx).value).toBe(story.immune.adjustedPct);
      expect(immune.evaluate(ctx).reasons).toHaveLength(index === 0 ? 2 : 0);
      expect(immuneStore.current(ctx)).toMatchObject({
        recordedAt: missionTime,
        onset: index === 0 ? '2026-11-14T10:30:00.000Z' : null,
        photoTime: index === 0 ? missionTime : null,
        photoArea: index === 0 ? 'left-arm' : null,
        flags: { breathing: false, throat: false, swelling: false, fainting: false },
      });
      if (index !== 0) expect(immune.evaluate(ctx).escalation?.trigger).toBe('no-pattern');
      expect(vector.getSignals('bone', ctx.crewId, 24)?.signals.bmdChangePctPerMonth).toBeCloseTo(
        story.bone.monthlyChangePct,
      );
      expect(vector.getSignals('bone', ctx.crewId, 24)?.signals).toMatchObject({
        resistanceLoadPct: story.bone.loadPct,
        daysInFlight: 99,
      });
      expect((Date.parse(atDay(0).slice(0, 10)) - Date.parse(missionStart)) / dayMs + 1).toBe(100);
      const boneInput = boneStore.current(ctx)!;
      expect(boneInput).toMatchObject({
        missionStart: `${missionStart}T00:00:00.000Z`,
        sodiumTargetMg: 2300,
        calciumTargetMg: 1000,
        vitaminDTargetIu: 600,
        suddenPain: false,
      });
      expect(boneInput.resistance![0]).toMatchObject({
        date: '2026-11-13',
        plannedSets: 2,
        plannedReps: 10,
        plannedKg: 50,
        performedSets: 2,
        performedReps: 10,
        actualKg: (50 * story.bone.loadPct) / 100,
      });
      const food = vector.getSignals('food', ctx.crewId, 24)!;
      const exposures = vector.getExposures(ctx.crewId, 24)!;
      for (const field of ['sodiumMg', 'calciumMg', 'vitaminDIu'] as const) {
        expect(exposures[field]).toBe(food.signals[field]);
        expect(exposures.refs[field]?.recordedAt).toBe(food.recordedAt);
      }
      const input = cardioStore.current(ctx)!;
      expect(input).toMatchObject({
        recordedAt: '2026-11-14T09:30:00.000Z',
        exerciseObservedAt: '2026-11-14T09:30:00.000Z',
        view: 'exercise',
        assessmentId: null,
        assessments: [],
        vo2ObservedAt: null,
        exerciseWindowComplete: true,
        plannedMinutes: 60,
        completedMinutes: [48, 60, 54][index],
      });
      expect(vector.getSignals('cardio', ctx.crewId, 24)?.signals).toEqual({
        workloadW: 100,
        hrDeltaBpmAtWorkload: story.cardio.deltaBpm,
        borgRpe: story.cardio.borg,
        restingHrBpm: story.cardio.restingBpm,
        exerciseLoadPct: story.cardio.loadPct,
        missingReadingsCount: 0,
        vo2PeakPctBaseline: null,
      });
      const adapted = adaptExercise(input.workspace!, input.stageId!);
      expect(adapted.stage.baselineValues).toEqual([125, 126]);
      expect(adapted.stage.baselineMeanBpm).toBe(125.5);
      expect(adapted.session.date).toBe('2026-11-14');
      for (const session of [
        ...input.workspace!.data.sessions,
        ...input.workspace!.baseline.sessions,
      ]) {
        expect(cardioIdentity(session.scope)).toBe(ctx.crewId);
        expect(session.id.startsWith(ctx.crewId)).toBe(true);
      }
      expect(cardio.evaluate(ctx).value).toBe(story.cardio.deltaBpm);
    }
  });

  it('does not emit, duplicate, notify, or change selections on a repeated load', () => {
    const vector = fresh();
    seedScenario(vector, riskTabs);
    const emit = vi.spyOn(vector, 'emitSignals');
    const notify = vi.fn();
    for (const story of missionCrew) {
      const ctx = { crewId: story.crewId, vector };
      for (const store of stores) {
        store.select(ctx, store.history(ctx)[0].recordedAt);
        store.subscribe(ctx, notify);
      }
      const before = stores.map((store) => ({
        history: store.history(ctx),
        current: store.current(ctx),
        revision: store.revision(ctx),
      }));
      for (const tab of tabs) tab.loadScenario!(ctx);
      expect(
        stores.map((store) => ({
          history: store.history(ctx),
          current: store.current(ctx),
          revision: store.revision(ctx),
        })),
      ).toEqual(before);
    }
    expect(emit).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('resumes only missing later nights and preserves existing observations', () => {
    const vector = fresh();
    const ctx = { crewId: 'SIM-CDR', vector };
    const original = { ...sleepSample()[0], duty: null, sleepinessKarolinska: 4 };
    saveSleep(ctx, original);
    const emit = vi.spyOn(vector, 'emitSignals');
    tabs[1].loadScenario!(ctx);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(sleepStore.history(ctx)[0]).toEqual(original);
    const later = { ...sleepSample()[2], recordedAt: atDay(0, 10), duty: null };
    const other = { crewId: 'SIM-PLT', vector };
    saveSleep(other, later);
    tabs[1].loadScenario!(other);
    expect(sleepStore.history(other)).toHaveLength(2);
    expect(sleepStore.history(other)[0]).toEqual(later);
  });

  it('no-ops for unknown, real, research, earlier-clock identities and scenario=off', () => {
    const vector = fresh();
    seedScenario(vector, riskTabs, '?scenario=off');
    expect(stores.map((store) => store.history({ crewId: 'SIM-CDR', vector }))).toEqual([
      [],
      [],
      [],
      [],
    ]);
    for (const ctx of [
      { crewId: 'unknown', vector },
      {
        crewId: 'SIM-CDR',
        vector: createVector({
          clock: () => Date.parse(atDay(1)),
          registrations: scenarioRegistrations,
        }),
      },
      ...(['user-entered', 'nasa-research-replay'] as const).map((source) => {
        const crewId = `${source === 'user-entered' ? 'USER' : 'RESEARCH:MR080G'}:SIM-CDR:MISSION-01`;
        return {
          crewId,
          vector: createVector({
            clock: () => Date.parse(missionTime),
            registrations: [
              {
                ...scenarioRegistrations[0],
                crewId,
                comparisonGroupId: 'MISSION-01',
                source,
                simulated: false,
                baselines: { entries: [] },
              },
            ],
          }),
        };
      }),
    ]) {
      const emit = vi.spyOn(ctx.vector, 'emitSignals');
      for (const tab of tabs) expect(() => tab.loadScenario!(ctx)).not.toThrow();
      expect(emit).not.toHaveBeenCalled();
    }
  });

  it('preserves later user observations in every tab without emitting', () => {
    const fixtureVector = fresh();
    seedScenario(fixtureVector, riskTabs);
    const fixture = { crewId: 'SIM-CDR', vector: fixtureVector };
    const ctx = {
      crewId: 'SIM-CDR',
      vector: createVector({
        clock: () => Date.parse(missionTime) + dayMs,
        registrations: scenarioRegistrations,
      }),
    };
    const recordedAt = atDay(0, 12);
    saveCardio(ctx, {
      ...cardioStore.current(fixture)!,
      recordedAt,
      exerciseObservedAt: null,
      restingHrBpm: 75,
    });
    saveSleep(ctx, { ...sleepStore.current(fixture)!, recordedAt, sleepinessKarolinska: 4 });
    saveImmune(ctx, { ...immuneStore.current(fixture)!, recordedAt, itch: 1 });
    saveBone(ctx, { ...boneStore.current(fixture)!, recordedAt, sodiumTargetMg: 2200 });
    const before = stores.map((store) => store.history(ctx));
    const emit = vi.spyOn(ctx.vector, 'emitSignals');
    for (const tab of tabs) tab.loadScenario!(ctx);
    expect(stores.map((store) => store.history(ctx))).toEqual(before);
    expect(emit).not.toHaveBeenCalled();
  });

  it('restricts cardio identity exceptions and never writes legacy persistence', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => 'preserved', setItem, removeItem: vi.fn() });
    try {
      const vector = fresh();
      const ctx = { crewId: 'SIM-CDR', vector };
      tabs[0].loadScenario!(ctx);
      const input = cardioStore.current(ctx)!;
      expect(() => saveCardio({ ...ctx, crewId: 'SIM-PLT' }, input)).toThrow(/identity/);
      const wrong = structuredClone(input);
      for (const session of [
        ...wrong.workspace!.data.sessions,
        ...wrong.workspace!.baseline.sessions,
      ])
        session.scope.seriesId = 'wrong';
      expect(() => saveCardio(ctx, wrong)).toThrow(/identity/);
      expect(
        cardioIdentity({ source: 'simulated-crew', subjectId: 'SIM-CDR', seriesId: 'other' }),
      ).toBe('SIM-CDR:other');
      expect(
        cardioIdentity({
          source: 'simulated-crew',
          subjectId: 'SIM-OTHER',
          seriesId: 'SIM-OTHER-MISSION-01',
        }),
      ).toBe('SIM-OTHER:SIM-OTHER-MISSION-01');
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders Bone nutrient context from the Food vector snapshot', () => {
    const vector = fresh();
    seedScenario(vector, riskTabs);
    for (const { crewId } of missionCrew) {
      const html = renderToStaticMarkup(createElement(bone.Component, { crewId, vector }));
      expect(html).toContain('Simulated');
      const food = vector.getSignals('food', crewId, 24)!.signals;
      for (const [key, unit] of [
        ['sodiumMg', 'mg'],
        ['calciumMg', 'mg'],
        ['vitaminDIu', 'IU'],
      ] as const)
        expect(html.replace(/<!-- -->/g, '')).toContain(display(food[key], unit));
    }
  });
});
