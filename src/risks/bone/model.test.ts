import { expect, it } from 'vitest';
import { testVector } from '../cardio/testVector';
import { boneSample, calculateBone, saveBone, evaluateBone } from './model';

it('uses actual scan days and complete seven-day volume, keeping nutrient totals out of signals', () => {
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveBone(ctx, boneSample());
  expect(v.emitted[0]).toEqual({
    risk: 'bone',
    crewId: 'SIM-CDR',
    source: 'simulated-crew',
    simulated: true,
    recordedAt: '2026-11-14T11:00:00.000Z',
    signals: {
      site: 'total-hip',
      bmdChangePctPerMonth: expect.closeTo(-1.2, 8),
      resistanceLoadPct: 70,
      daysInFlight: 13,
    },
  });
  expect(evaluateBone(ctx)).toMatchObject({
    value: expect.closeTo(-1.2, 8),
    unit: '%/month',
    evidence: 'supported',
  });
});

it.each(['side', 'scannerId', 'protocolId'] as const)(
  'blocks different %s and escalates conflicting evidence',
  (field) => {
    const sample = boneSample();
    const bad = {
      ...sample,
      current: { ...sample.current!, [field]: field === 'side' ? 'right' : 'other' },
    };
    const v = testVector();
    const ctx = { crewId: 'SIM-CDR', vector: v.api };
    saveBone(ctx, bad as typeof sample);
    expect(evaluateBone(ctx)).toMatchObject({
      value: null,
      evidence: 'conflicting',
      escalation: { trigger: 'conflicting' },
    });
  },
);

it('never turns incomplete logs or missing DXA into zero, permits true zero volume', () => {
  const s = boneSample();
  expect(
    calculateBone({ ...s, baseline: null, current: null, resistance: null }).signals,
  ).toMatchObject({ bmdChangePctPerMonth: null, resistanceLoadPct: null });
  expect(
    calculateBone({
      ...s,
      resistance: s.resistance!.map((x) => ({
        ...x,
        performedSets: 0,
        performedReps: 0,
        actualKg: 0,
      })),
    }).signals.resistanceLoadPct,
  ).toBe(0);
  expect(
    calculateBone({ ...s, resistance: s.resistance!.map((x) => ({ ...x, actualKg: null })) })
      .signals.resistanceLoadPct,
  ).toBeNull();
});

it('rejects invalid dates and inputs, reports pre-flight without a negative day count', () => {
  const s = boneSample();
  expect(() => calculateBone({ ...s, current: { ...s.current!, date: '2026-02-30' } })).toThrow();
  expect(() => calculateBone({ ...s, current: { ...s.current!, bmd: 0 } })).toThrow();
  expect(
    calculateBone({ ...s, missionStart: '2026-11-15T00:00:00Z' }).signals.daysInFlight,
  ).toBeNull();
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveBone(ctx, { ...s, suddenPain: true });
  expect(evaluateBone(ctx)).toMatchObject({ value: null, escalation: { level: 'urgent' } });
  expect(v.calls()).toBe(0);
});

it('requires a single supported resistance device protocol and the 500% boundary', () => {
  const s = boneSample();
  const other = { ...s.resistance![0], exerciseId: 'SECOND', deviceId: 'OTHER-DEVICE' };
  expect(() => calculateBone({ ...s, resistance: [...s.resistance!, other] })).toThrow();
  expect(
    calculateBone({ ...s, resistance: [{ ...s.resistance![0], actualKg: 250 }] }).signals
      .resistanceLoadPct,
  ).toBe(500);
  expect(() =>
    calculateBone({ ...s, resistance: [{ ...s.resistance![0], actualKg: 251 }] }),
  ).toThrow();
});

it('requires an actual hip side and never treats a central scan as a hip side', () => {
  const s = boneSample();
  expect(() =>
    calculateBone({
      ...s,
      baseline: { ...s.baseline!, side: 'central' },
      current: { ...s.current!, side: 'central' },
    }),
  ).toThrow();
});

it('shares missing nutrient groups after two check-ins without erasing a supported DXA', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveBone(ctx, { ...boneSample(), recordedAt: '2026-11-14T10:00:00.000Z' });
  saveBone(ctx, boneSample());
  expect(evaluateBone(ctx)).toMatchObject({
    value: expect.closeTo(-1.2),
    escalation: { level: 'next-pmc', trigger: 'no-pattern' },
  });
});
