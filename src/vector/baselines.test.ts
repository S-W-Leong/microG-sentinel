import { describe, expect, it } from 'vitest';
import { buildBaseline, demoRegistrations, prepareRegistration } from './registry';

const registration = demoRegistrations[0];
const baseline = registration.baselines.entries[0];
const key = {
  metric: baseline.metric,
  unit: baseline.unit,
  methodId: baseline.methodId,
  contextKey: baseline.contextKey,
};
const session = () => ({
  sessionId: 'mass-1',
  crewId: registration.crewId,
  value: 70,
  unit: baseline.unit,
  source: registration.source,
  comparisonGroupId: registration.comparisonGroupId,
  methodId: baseline.methodId,
  contextKey: baseline.contextKey,
  recordedAt: '2026-11-01T00:00:00.000Z',
  preExposure: true,
  comparisonUsable: true,
});

describe('baseline integration', () => {
  it('averages independent sessions once, preserving IDs, counts and latest time', () => {
    const result = buildBaseline(registration, key, [
      session(),
      session(),
      { ...session(), sessionId: 'mass-2', value: 74, recordedAt: '2026-11-02T00:00:00.000Z' },
    ]);
    expect(result).toMatchObject({
      value: 72,
      evidence: 'supported',
      sourceSessionIds: ['mass-1', 'mass-2'],
      count: 2,
      recordedAt: '2026-11-02T00:00:00.000Z',
    });
  });
  it('retains contradictory session identity as conflicting without averaging', () => {
    expect(
      buildBaseline(registration, key, [session(), { ...session(), value: 74 }]),
    ).toMatchObject({
      value: null,
      evidence: 'conflicting',
      sourceSessionIds: ['mass-1'],
      count: 1,
    });
  });
  it.each([
    { value: null },
    { value: 0 },
    { value: NaN },
    { unit: 'L/min' as const },
    { source: 'user-entered' as const },
    { crewId: 'SIM-PLT' },
    { comparisonGroupId: 'other' },
    { methodId: 'other' },
    { contextKey: 'other' },
    { preExposure: false },
    { comparisonUsable: false },
  ])('does not discard invalid included sessions %j', (changes) => {
    expect(
      buildBaseline(registration, key, [
        session(),
        { ...session(), ...changes, sessionId: 'mass-2' },
      ]),
    ).toMatchObject({ value: null, evidence: 'insufficient', count: 2 });
  });
  it('retains absent baseline and missing timestamp as unknown', () => {
    expect(buildBaseline(registration, key, [])).toMatchObject({
      value: null,
      evidence: 'insufficient',
      count: 0,
      recordedAt: null,
    });
    expect(
      buildBaseline(registration, key, [{ ...session(), recordedAt: null }]).recordedAt,
    ).toBeNull();
    expect(demoRegistrations[1].baselines.entries).toEqual([]);
  });
  it('keeps conflicting evidence above insufficient evidence', () => {
    expect(
      buildBaseline(registration, key, [session(), { ...session(), value: null }]).evidence,
    ).toBe('conflicting');
  });
  it('retains HR minimum two independent sessions and explicit comparator gate', () => {
    const hrKey = {
      metric: 'hrAtWorkloadBpm' as const,
      unit: 'bpm' as const,
      methodId: 'matched-stage',
      contextKey: JSON.stringify(['bike', 'protocol', 'seated', 0, 50, 180, []]),
    };
    const hrSession = { ...session(), ...hrKey, value: 120 };
    expect(buildBaseline(registration, hrKey, [hrSession, hrSession]).evidence).toBe(
      'insufficient',
    );
    expect(
      buildBaseline(registration, hrKey, [hrSession, { ...hrSession, sessionId: 'hr-2' }]).value,
    ).toBe(120);
    expect(
      buildBaseline(registration, hrKey, [
        hrSession,
        { ...hrSession, sessionId: 'hr-2', comparisonUsable: false },
      ]).value,
    ).toBeNull();
  });
  it('rejects duplicate or inconsistent baseline metadata at registration', () => {
    for (const changes of [
      { count: 1 },
      { sourceSessionIds: ['same', 'same'] },
      { unit: 'L/min' },
      { comparisonGroupId: 'other' },
      { evidence: 'conflicting' },
      { contextKey: 'left-eye' },
    ]) {
      const input = structuredClone(registration);
      Object.assign(input.baselines.entries[0], changes);
      expect(() => prepareRegistration(input)).toThrow();
    }
  });
  it('allows separate method keys and rejects conflicting entries at one key', () => {
    const input = structuredClone(registration);
    input.baselines.entries.push({ ...baseline, methodId: 'second-method' });
    expect(prepareRegistration(input).baselines.entries).toHaveLength(2);
    input.baselines.entries.push({ ...baseline, value: 74 });
    expect(() => prepareRegistration(input)).toThrow('Conflicting baseline');
  });
});
