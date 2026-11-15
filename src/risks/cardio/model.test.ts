import { expect, it } from 'vitest';
import { testVector } from './testVector';
import { createExerciseStore } from '../../exercise/store';
import { simulatedCrew } from '../../data/simulated';
import {
  cardioIdentity,
  emptyCardio,
  saveCardio,
  evaluateCardio,
  adaptExercise,
  adaptVo2,
  selectCardioView,
} from './model';

it('adapts only the selected workload through the existing workspace comparator', () => {
  const store = createExerciseStore(null);
  store.selectScenario('complete');
  const w = store.getSnapshot();
  const stage = w.data.stages.find(
    (s) => s.sessionId === w.activeSessionId && s.context.workloadW === 100,
  )!;
  expect(adaptExercise(w, stage.id)).toMatchObject({
    signals: {
      workloadW: 100,
      hrDeltaBpmAtWorkload: 1.5,
      borgRpe: 11,
      missingReadingsCount: 0,
    },
  });
  expect(cardioIdentity(w.data.sessions[0].scope)).toBe('SIM-DEMO-CREW:complete');
});

it('keeps VO2peak retention uncapped and refuses a legacy metric substitution', () => {
  expect(adaptVo2(simulatedCrew, 'SIM-FLIGHT-01').value).toBe(95);
  const records = simulatedCrew.map((r) => ({ ...r, metric: 'VO2max' as const }));
  expect(adaptVo2(records, 'SIM-FLIGHT-01').value).toBeNull();
});

it('emits only timestamp-documented resting data, never old exercise/VO2 as contemporaneous', () => {
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  const input = {
    ...emptyCardio(v.person.exposures.asOf),
    restingHrBpm: 60,
    restingPosture: 'seated' as const,
  };
  saveCardio(ctx, input);
  expect(v.emitted).toEqual([
    {
      risk: 'cardio',
      crewId: 'SIM-CDR',
      source: 'simulated-crew',
      simulated: true,
      recordedAt: '2026-11-14T11:00:00.000Z',
      signals: {
        workloadW: null,
        hrDeltaBpmAtWorkload: null,
        vo2PeakPctBaseline: null,
        exerciseLoadPct: null,
        restingHrBpm: 60,
        borgRpe: null,
        missingReadingsCount: null,
      },
    },
  ]);
  expect(evaluateCardio(ctx)).toMatchObject({ value: null, evidence: 'insufficient' });
});

it('keeps date-only reports private and emits a capacity value only at its documented time', () => {
  const v = testVector('SIM-CREW-01:default');
  const ctx = { crewId: 'SIM-CREW-01:default', vector: v.api };
  const input = {
    ...emptyCardio('2026-04-10T10:00:00.000Z'),
    view: 'vo2' as const,
    assessments: simulatedCrew,
    assessmentId: 'SIM-FLIGHT-03',
  };
  saveCardio(ctx, input);
  expect(v.emitted[0].signals).toMatchObject({ vo2PeakPctBaseline: null });
  expect(evaluateCardio(ctx)).toMatchObject({
    value: expect.closeTo(76.6666667),
    unit: '%',
    escalation: { level: 'next-pmc', trigger: 'indicative-score' },
  });
  saveCardio(ctx, {
    ...input,
    recordedAt: '2026-04-10T11:00:00.000Z',
    vo2ObservedAt: '2026-04-10T11:00:00Z',
  });
  expect(v.emitted[1].signals).toMatchObject({ vo2PeakPctBaseline: expect.closeTo(76.6666667) });
  expect(() => saveCardio({ ...ctx, crewId: 'SIM-CDR' }, input)).toThrow();
});

it('emits a selected timed exercise snapshot and never averages different workloads', () => {
  const store = createExerciseStore(null);
  store.selectScenario('complete');
  const w = store.getSnapshot();
  const stage = w.data.stages.find(
    (s) => s.sessionId === w.activeSessionId && s.context.workloadW === 100,
  )!;
  const v = testVector('SIM-DEMO-CREW:complete');
  const ctx = { crewId: v.person.crewId, vector: v.api };
  saveCardio(ctx, {
    ...emptyCardio('2026-11-12T11:00:00.000Z'),
    workspace: w,
    stageId: stage.id,
    exerciseObservedAt: '2026-11-12T11:00:00Z',
  });
  expect(v.emitted[0]).toMatchObject({
    signals: { workloadW: 100, hrDeltaBpmAtWorkload: 1.5, borgRpe: 11, missingReadingsCount: 0 },
  });
  expect(evaluateCardio(ctx)).toMatchObject({
    value: 1.5,
    unit: 'bpm',
    label: 'HR change at workload',
  });
});

it('does not replace a zero numerator with missing exercise load', () => {
  const v = testVector();
  saveCardio(
    { crewId: 'SIM-CDR', vector: v.api },
    {
      ...emptyCardio(v.person.exposures.asOf),
      completedMinutes: 0,
      plannedMinutes: 60,
      exerciseWindowComplete: true,
    },
  );
  expect(v.emitted[0].signals).toMatchObject({ exerciseLoadPct: 0 });
});

it('changes the selected headline without emitting or resaving measurements', () => {
  const v = testVector('SIM-CREW-01:default'),
    ctx = { crewId: v.person.crewId, vector: v.api };
  saveCardio(ctx, {
    ...emptyCardio('2026-04-10T11:00:00.000Z'),
    assessments: simulatedCrew,
    assessmentId: 'SIM-FLIGHT-01',
  });
  expect(evaluateCardio(ctx).value).toBeNull();
  selectCardioView(ctx, 'vo2');
  expect(evaluateCardio(ctx)).toMatchObject({
    value: 95,
    unit: '%',
    label: 'VO2peak baseline retained',
  });
  expect(v.emitted).toHaveLength(1);
});

it.each(['chest', 'fainting', 'stopped', 'palpitations'] as const)(
  'prioritises %s and rejects invalid inputs atomically',
  (flag) => {
    const v = testVector();
    const ctx = { crewId: 'SIM-CDR', vector: v.api };
    const input = emptyCardio(v.person.exposures.asOf);
    expect(() => saveCardio(ctx, { ...input, restingHrBpm: 0 })).toThrow();
    expect(v.emitted).toHaveLength(0);
    saveCardio(ctx, { ...input, flags: { ...input.flags, [flag]: true } });
    expect(evaluateCardio(ctx)).toMatchObject({ value: null, escalation: { level: 'urgent' } });
    expect(v.calls()).toBe(0);
  },
);
