import { expect, it } from 'vitest';
import { testVector } from '../cardio/testVector';
import { immuneSample, immuneStore, saveImmune, evaluateImmune, scoreImmune } from './model';

it('saves the five-group 60% base snapshot and personalises once without feedback', () => {
  const { api, emitted, calls } = testVector();
  let adjustmentCalls = 0;
  api.personalise = (_risk, _crew, base) => {
    adjustmentCalls++;
    expect(base.value).toBe(60);
    return {
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
    };
  };
  saveImmune({ crewId: 'SIM-CDR', vector: api }, immuneSample());
  expect(emitted).toEqual([
    {
      risk: 'immune',
      crewId: 'SIM-CDR',
      source: 'simulated-crew',
      simulated: true,
      recordedAt: '2026-11-14T11:00:00.000Z',
      signals: {
        hivesPatternPct: 60,
        rashActive: true,
        whealCountBand: 2,
        itch: 2,
        raised: true,
        clearEdges: true,
        paleCentre: true,
        fadesWithin24h: null,
        bodyAreasCount: 2,
      },
    },
  ]);
  expect(calls()).toBe(0);
  const final = evaluateImmune({ crewId: 'SIM-CDR', vector: api });
  expect(final.value).toBe(80);
  expect(final.reasons).toHaveLength(2);
  expect(adjustmentCalls).toBe(1);
  expect(emitted).toHaveLength(1);
  expect(evaluateImmune({ crewId: 'SIM-CDR', vector: testVector().api }).value).toBeNull();
});

it('retains the first private observation when vector emission is rejected', () => {
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveImmune(ctx, { ...immuneSample(), recordedAt: '2026-11-14T10:00:00.000Z' });
  v.api.emitSignals = () => {
    throw new Error('Vector conflict');
  };
  expect(() => saveImmune(ctx, { ...immuneSample(), itch: 0 })).toThrow('Vector conflict');
  expect(evaluateImmune(ctx).value).toBe(60);
});

it('normalises explicit offsets and preserves user-entry simulation status', () => {
  const v = testVector('USER:person:series');
  v.person.source = 'user-entered';
  v.person.simulated = false;
  saveImmune(
    { crewId: 'USER:person:series', vector: v.api },
    { ...immuneSample(), recordedAt: '2026-11-14T19:00:00+08:00' },
  );
  expect(v.emitted[0]).toMatchObject({
    recordedAt: '2026-11-14T11:00:00.000Z',
    source: 'user-entered',
    simulated: false,
  });
});

it('counts an incomplete shape as unknown and requires three recorded groups', () => {
  const sample = immuneSample();
  expect(
    scoreImmune({ ...sample, raised: null, areas: null, itch: null }).signals.hivesPatternPct,
  ).toBeNull();
  expect(
    scoreImmune({
      ...sample,
      rashActive: false,
      whealCountBand: 0,
      itch: 0,
      raised: false,
      clearEdges: false,
      paleCentre: false,
      fadesWithin24h: false,
      areas: [],
    }).signals,
  ).toMatchObject({ hivesPatternPct: 0, rashActive: false, whealCountBand: 0, bodyAreasCount: 0 });
});

it.each(['breathing', 'throat', 'swelling', 'fainting'] as const)(
  'suppresses the result for %s before personalisation',
  (flag) => {
    const v = testVector();
    const sample = immuneSample();
    saveImmune(
      { crewId: 'SIM-CDR', vector: v.api },
      { ...sample, flags: { ...sample.flags, [flag]: true } },
    );
    expect(evaluateImmune({ crewId: 'SIM-CDR', vector: v.api })).toMatchObject({
      value: null,
      reasons: [],
      escalation: { level: 'urgent', trigger: 'red-flag' },
    });
    expect(v.calls()).toBe(0);
  },
);

it('rejects invalid groups, future observations and unknown crew before emitting', () => {
  const v = testVector();
  for (const bad of [
    { ...immuneSample(), itch: 4 },
    { ...immuneSample(), areas: ['trunk', 'trunk'] },
    { ...immuneSample(), recordedAt: '2026-11-15T11:00:00.000Z' },
  ])
    expect(() =>
      saveImmune({ crewId: 'SIM-CDR', vector: v.api }, bad as ReturnType<typeof immuneSample>),
    ).toThrow();
  expect(() => saveImmune({ crewId: 'SIM-OTHER', vector: v.api }, immuneSample())).toThrow();
  expect(v.emitted).toHaveLength(0);
});

it('escalates two incomplete check-ins without inventing a score', () => {
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  const input = {
    ...immuneSample(),
    whealCountBand: null,
    itch: null,
    areas: null,
    fadesWithin24h: null,
  };
  saveImmune(ctx, { ...input, recordedAt: '2026-11-14T10:00:00.000Z' });
  saveImmune(ctx, input);
  expect(evaluateImmune(ctx)).toMatchObject({
    value: null,
    escalation: { level: 'next-pmc', trigger: 'no-pattern' },
  });
});

it('does not apply current food context to a different selected observation', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveImmune(ctx, { ...immuneSample(), recordedAt: '2026-11-14T10:00:00.000Z' });
  saveImmune(ctx, { ...immuneSample(), itch: 0 });
  immuneStore.select(ctx, '2026-11-14T10:00:00.000Z');
  v.api.personalise = () => ({ adjustedPct: 80, reasons: [] });
  expect(evaluateImmune(ctx).value).toBe(60);
});

it('shares three observations outside a recorded personal range without a linked explanation', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  for (const time of ['09', '10', '11'])
    saveImmune(ctx, {
      ...immuneSample(),
      recordedAt: `2026-11-14T${time}:00:00.000Z`,
      observedItchRange: [0, 1],
    });
  expect(evaluateImmune(ctx).escalation).toMatchObject({
    level: 'next-pmc',
    trigger: 'persistent-change',
  });
});
