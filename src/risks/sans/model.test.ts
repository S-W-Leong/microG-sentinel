import { describe, expect, it, vi } from 'vitest';
import { createVector } from '../../vector/store';
import { demoRegistrations } from '../../vector/registry';
import {
  calculateSans,
  emptySans,
  evaluateSans,
  octMethod,
  sansSample,
  sansStore,
  saveSans,
  visionMethod,
  type SansInput,
} from './model';

const now = '2026-11-14T12:00:00.000Z';
function context() {
  return { crewId: 'SIM-CDR', vector: createVector({ clock: () => Date.parse(now) }) };
}

it('saves the exact typed snapshot, preserving nulls and source', () => {
  const ctx = context();
  saveSans(ctx, emptySans(now));
  expect(ctx.vector.getSignals('sans', ctx.crewId, 24)).toEqual({
    risk: 'sans',
    crewId: 'SIM-CDR',
    source: 'simulated-crew',
    simulated: true,
    recordedAt: now,
    signals: {
      eye: 'left-eye',
      amslerDistortion: null,
      nearVisionChangeLines: null,
      headache: null,
      octThicknessChangeUm: null,
      cabinCo2MmHg: null,
    },
  });
  expect(evaluateSans(ctx).value).toBeNull();
  expect(evaluateSans(ctx).escalation?.level).toBe('next-pmc');
});

it('emits −0.5 lines from the designated SIM-CDR fixture', () => {
  const ctx = context();
  sansSample(now).forEach((input) => saveSans(ctx, input));
  const personalise = vi.spyOn(ctx.vector, 'personalise');
  expect(evaluateSans(ctx)).toMatchObject({
    value: -0.5,
    unit: 'lines',
    evidence: 'supported',
    simulated: true,
  });
  expect(personalise).toHaveBeenCalledTimes(1);
  expect(ctx.vector.getSignals('sans', ctx.crewId, 24)?.signals).toMatchObject({
    nearVisionChangeLines: -0.5,
    octThicknessChangeUm: null,
    headache: 0,
    amslerDistortion: 0,
  });
});

describe('vision comparison gates', () => {
  it.each<Partial<SansInput>>([
    { eye: 'right-eye' },
    { chart: 'other' },
    { distanceCm: 41 },
    { correction: false },
    { calibration: 'different' },
    { calibration: null },
    { device: 'other' },
    { comparisonGroupId: 'other' },
    { halfLines: null, nearLines: 9 },
    { nearBaseline: true },
  ])('withholds mismatched comparison %j', (patch) => {
    const ctx = context(),
      [baseline, current] = sansSample(now);
    saveSans(ctx, baseline);
    expect(calculateSans(ctx, { ...current, ...patch }).signals.nearVisionChangeLines).toBeNull();
  });
  it('requires a prior baseline and supports a zero line baseline', () => {
    const ctx = context(),
      [baseline, current] = sansSample(now);
    expect(
      calculateSans(ctx, current, [{ ...baseline, recordedAt: now }]).signals.nearVisionChangeLines,
    ).toBeNull();
    expect(
      calculateSans(ctx, { ...current, nearLines: 0.5 }, [{ ...baseline, nearLines: 0 }]).signals
        .nearVisionChangeLines,
    ).toBe(0.5);
  });
});

it('reads matching per-eye vector baselines without mutating the vector', () => {
  const [, current] = sansSample(now);
  const registrations = structuredClone(demoRegistrations);
  registrations[0].baselines.entries.push({
    metric: 'nearVisionLines',
    value: 10,
    unit: 'lines',
    count: 1,
    sourceSessionIds: ['eye-baseline'],
    source: 'simulated-crew',
    comparisonGroupId: 'SIM-CDR-MISSION-01',
    methodId: visionMethod(current)!,
    contextKey: 'left-eye',
    recordedAt: '2026-11-01T00:00:00Z',
    evidence: 'supported',
  });
  const ctx = {
    crewId: 'SIM-CDR',
    vector: createVector({ registrations, clock: () => Date.parse(now) }),
  };
  expect(calculateSans(ctx, current).signals.nearVisionChangeLines).toBe(-0.5);
  expect(
    calculateSans(ctx, { ...current, eye: 'right-eye' }).signals.nearVisionChangeLines,
  ).toBeNull();
});

it('matches OCT eye, protocol, device, date and series independently of vision', () => {
  const ctx = context(),
    [baseline, current] = sansSample(now);
  const prior = {
    ...baseline,
    octUm: 100,
    octAt: baseline.recordedAt,
    octDevice: 'device-a',
    octProtocol: 'RNFL-a',
    octBaseline: true,
  };
  const latest = {
    ...current,
    octUm: 104,
    octAt: now,
    octDevice: 'device-a',
    octProtocol: 'RNFL-a',
  };
  expect(octMethod(latest)).toContain('peripapillary-rnfl');
  expect(calculateSans(ctx, latest, [prior]).signals.octThicknessChangeUm).toBe(4);
  for (const patch of [
    { eye: 'right-eye' as const },
    { octAt: null },
    { octDevice: null },
    { octProtocol: 'other' },
    { octDevice: 'other' },
    { comparisonGroupId: 'other' },
    { octAt: prior.octAt },
  ]) {
    expect(
      calculateSans(ctx, { ...latest, ...patch }, [prior]).signals.octThicknessChangeUm,
    ).toBeNull();
  }
});

it.each(['visionLoss', 'blindSpot', 'severeHeadache'] as const)(
  '%s urgently hides the score',
  (flag) => {
    const ctx = context(),
      [baseline, current] = sansSample(now);
    saveSans(ctx, baseline);
    saveSans(ctx, { ...current, flags: { ...current.flags, [flag]: true } });
    expect(evaluateSans(ctx)).toMatchObject({
      value: null,
      evidence: 'insufficient',
      reasons: [],
      escalation: { level: 'urgent', trigger: 'red-flag' },
    });
  },
);

it('keeps context and display-only grades out of the evaluation', () => {
  const registrations = structuredClone(demoRegistrations);
  registrations[0].traits.geneticFlags = ['one-carbon-risk'];
  const ctx = {
    crewId: 'SIM-CDR',
    vector: createVector({ registrations, clock: () => Date.parse(now) }),
  };
  const [baseline, current] = sansSample(now);
  ctx.vector.emitSignals({
    risk: 'food',
    crewId: ctx.crewId,
    source: 'simulated-crew',
    simulated: true,
    recordedAt: now,
    signals: {
      foodsEaten: null,
      allergensEaten: null,
      energyPctOfNeed: null,
      proteinGPerKg: null,
      sodiumMg: 30000,
      calciumMg: null,
      vitaminDIu: null,
      fibreG: null,
      bodyMassKg: null,
      bodyMassChangeKg: null,
    },
  });
  saveSans(ctx, baseline);
  saveSans(ctx, { ...current, frisen: 5, cabinCo2MmHg: 20 });
  expect(evaluateSans(ctx).value).toBe(-0.5);
  expect(ctx.vector.getExposures(ctx.crewId, 24)?.cabinCo2MmHg).toBe(20);
  expect(ctx.vector.getExposures(ctx.crewId, 24)?.sodiumMg).toBe(30000);
  expect(Object.keys(ctx.vector.getSignals('sans', ctx.crewId, 24)!.signals)).not.toContain(
    'frisen',
  );
  expect(ctx.vector.getSignals('sans', 'SIM-PLT', 24)).toBeNull();
  expect(sansStore.current({ ...ctx, crewId: 'SIM-PLT' })).toBeNull();
  expect(sansStore.current(context())).toBeNull();
});

it('rejects invalid input before emission and preserves marks per eye', () => {
  const ctx = context(),
    [, current] = sansSample(now);
  for (const patch of [
    { nearLines: 9.25 },
    { halfLines: false },
    { headache: 11 },
    { amslerDistortion: 4 },
    { octUm: 0 },
    { frisen: 6 },
    { cabinCo2MmHg: 21 },
    { distanceCm: 0 },
    { octAt: '2026-11-15T00:00:00Z' },
    { marks: [{ x: NaN, y: 0 }] },
    { recordedAt: '2026-11-15T00:00:00Z' },
  ]) {
    expect(() => saveSans(ctx, { ...current, ...patch } as SansInput)).toThrow();
  }
  expect(ctx.vector.getSignals('sans', ctx.crewId, 24)).toBeNull();
  saveSans(ctx, { ...current, marks: [{ x: 0.1, y: 0.2 }] });
  saveSans(ctx, {
    ...current,
    recordedAt: '2026-11-14T11:00:00Z',
    eye: 'right-eye',
    marks: [{ x: 0.8, y: 0.9 }],
  });
  expect(sansStore.history(ctx).map((input) => [input.eye, input.marks])).toEqual([
    ['right-eye', [{ x: 0.8, y: 0.9 }]],
    ['left-eye', [{ x: 0.1, y: 0.2 }]],
  ]);
});

it('does not replace a conflicting snapshot or guess between baselines', () => {
  const ctx = context(),
    [baseline, current] = sansSample(now);
  saveSans(ctx, baseline);
  saveSans(ctx, current);
  expect(() => saveSans(ctx, { ...current, headache: 2 })).toThrow('Conflicting snapshot');
  expect(
    calculateSans(ctx, current, [
      baseline,
      { ...baseline, nearLines: 11, recordedAt: '2026-11-12T12:00:00Z' },
    ]),
  ).toMatchObject({ signals: { nearVisionChangeLines: null }, conflicting: true });
});
