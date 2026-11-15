import { expect, it } from 'vitest';
import { testVector } from '../cardio/testVector';
import { calculateSleep, emptySleep, saveSleep, evaluateSleep, sleepSample } from './model';

it('emits 6.5 hours debt only after three consecutive complete windows', () => {
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  const nights = sleepSample();
  saveSleep(ctx, nights[0]);
  saveSleep(ctx, nights[1]);
  expect(v.emitted[1].signals).toMatchObject({ sleepDebtHours: null });
  saveSleep(ctx, nights[2]);
  expect(v.emitted[2]).toEqual({
    risk: 'sleep',
    crewId: 'SIM-CDR',
    source: 'simulated-crew',
    simulated: true,
    recordedAt: '2026-11-14T11:00:00.000Z',
    signals: {
      sleepHours: 6,
      sleepEfficiencyPct: 75,
      sleepDebtHours: 6.5,
      sleepinessKarolinska: 6,
      fatigueSamnPerelli: 5,
      bodyClockShiftHours: null,
    },
  });
  expect(evaluateSleep(ctx)).toMatchObject({ value: null, evidence: 'insufficient', unit: 'h' });
  expect(v.emitted).toHaveLength(3);
});

it('includes nap sleep and time in bed consistently and wraps a 12-hour midpoint shift', () => {
  const input = {
    ...sleepSample()[2],
    naps: [{ start: '2026-11-14T09:00:00+00:00', end: '2026-11-14T10:00:00+00:00' }],
    planned: { start: '2026-11-14T00:00:00Z', end: '2026-11-14T08:00:00Z' },
    baselineMidpointHourUtc: 16,
  };
  expect(calculateSleep(input, []).signals).toMatchObject({
    sleepHours: 7,
    sleepEfficiencyPct: 700 / 9,
    bodyClockShiftHours: 12,
  });
});

it('rejects overlapping episodes, impossible losses and invalid ratings', () => {
  const n = sleepSample()[2];
  for (const bad of [
    { ...n, naps: [{ start: n.start!, end: n.end! }] },
    { ...n, latencyMinutes: 481 },
    { ...n, sleepinessKarolinska: 0 },
    { ...n, fatigueSamnPerelli: Infinity },
    { ...n, start: '2026-11-14T00:00:00' },
  ])
    expect(() => calculateSleep(bad, [])).toThrow();
});

it('preserves unknown sleep, known zero sleep and gaps in wearable stages', () => {
  const empty = emptySleep('2026-11-14T11:00:00.000Z');
  expect(calculateSleep(empty, []).signals.sleepHours).toBeNull();
  const n = { ...sleepSample()[2], latencyMinutes: 480, awakeMinutes: 0 };
  expect(calculateSleep(n, []).signals).toMatchObject({ sleepHours: 0, sleepEfficiencyPct: 0 });
  const wearable = {
    ...n,
    mode: 'wearable' as const,
    deviceId: 'Watch',
    timezone: 'UTC',
    stages: [{ start: n.start!, end: n.end!, stage: 'unknown' as const, movement: null }],
  };
  expect(calculateSleep(wearable, []).signals.sleepHours).toBeNull();
});

it('does not claim debt from gaps, partial coverage or two check-ins on the same day', () => {
  const nights = sleepSample();
  expect(calculateSleep(nights[2], [nights[0]]).signals.sleepDebtHours).toBeNull();
  expect(
    calculateSleep(nights[2], [nights[0], { ...nights[1], complete: false }]).signals
      .sleepDebtHours,
  ).toBeNull();
  expect(
    calculateSleep(nights[2], [{ ...nights[1], recordedAt: '2026-11-14T10:00:00Z' }]).signals
      .sleepDebtHours,
  ).toBeNull();
});

it('derives wearable sleep from contiguous known stages rather than manual losses', () => {
  const n = sleepSample()[2];
  const result = calculateSleep(
    {
      ...n,
      mode: 'wearable',
      deviceId: 'Watch-1',
      timezone: 'UTC',
      stages: [
        { start: n.start!, end: '2026-11-14T02:00:00Z', stage: 'awake', movement: null },
        { start: '2026-11-14T02:00:00Z', end: n.end!, stage: 'deep', movement: null },
      ],
    },
    [],
  );
  expect(result.signals).toMatchObject({ sleepHours: 6, sleepEfficiencyPct: 75 });
});

it('uses a supported personal sleep baseline and suppresses it for a critical-task flag', () => {
  const v = testVector('SIM-CDR', [
    {
      metric: 'sleepHours',
      unit: 'h',
      value: 8,
      sourceSessionIds: ['BASE'],
      count: 1,
      source: 'simulated-crew',
      comparisonGroupId: 'SIM-CDR-MISSION-01',
      methodId: 'sleep-manual-v1',
      contextKey: 'default',
      recordedAt: '2026-11-01T11:00:00.000Z',
      evidence: 'supported',
    },
  ]);
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveSleep(ctx, sleepSample()[2]);
  expect(evaluateSleep(ctx)).toMatchObject({
    value: -2,
    evidence: 'supported',
    label: 'Sleep change vs baseline',
  });
  saveSleep(ctx, {
    ...sleepSample()[2],
    recordedAt: '2026-11-14T10:59:00.000Z',
    criticalTaskSleep: true,
  });
  // Earlier imports do not replace the selected latest observation.
  expect(evaluateSleep(ctx).value).toBe(-2);
  const other = testVector();
  saveSleep(
    { crewId: 'SIM-CDR', vector: other.api },
    { ...sleepSample()[2], criticalTaskSleep: true },
  );
  expect(evaluateSleep({ crewId: 'SIM-CDR', vector: other.api })).toMatchObject({
    value: null,
    escalation: { level: 'urgent' },
  });
});
