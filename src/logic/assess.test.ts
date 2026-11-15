import { describe, expect, it } from 'vitest';
import type { Assessment } from '../types';
import { assess, selectBaseline, trend } from './assess';
import { allRecords, researchReplay, simulatedCrew } from '../data';

// Synthetic test fixtures only: these are not curated NASA measurements.
function record(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'current', subjectId: 'SYNTHETIC-01', source: 'simulated-crew', date: '2026-02-01',
    phase: 'in-mission', metric: 'VO2peak', value: 2.4, unit: 'L/min', bodyMassKg: null,
    method: 'Graded cycle capacity test', modality: 'cycle ergometer', protocol: 'Synthetic protocol A',
    isBaseline: false, sourceNotes: ['Synthetic test fixture'], ...overrides,
  };
}
const baseline = (overrides: Partial<Assessment> = {}) => record({
  id: 'baseline', date: '2026-01-01', phase: 'pre-mission', value: 3, isBaseline: true, ...overrides,
});

describe('assessment calculations and reference', () => {
  it('calculates retained and change percentages independently', () => {
    const result = assess([baseline(), record()], 'current');
    expect(result.evidence).toBe('supported');
    expect(result.calculation?.retainedPct).toBeCloseTo(80);
    expect(result.calculation?.changePct).toBeCloseTo(-20);
    expect(result.reference.state).toBe('at-or-above');
    expect(result.followUp).toContain('Prepare the assessment and supporting evidence for specialist review');
  });

  it('reproduces the brief arithmetic with explicitly synthetic C3D-3985-like fixtures', () => {
    const records = [baseline({ value: 2.7 }), baseline({ id: 'baseline-2', value: 2.75 }),
      record({ value: 2.725 * 0.739 }), record({ id: 'recovery', value: 2.725 * 0.98 })];
    expect(selectBaseline(records, records[2])?.value).toBeCloseTo(2.725);
    expect(assess(records, 'current').calculation?.retainedPct.toFixed(1)).toBe('73.9');
    expect(assess(records, 'recovery').calculation?.retainedPct.toFixed(1)).toBe('98.0');
  });

  it('averages every matching baseline and states the included IDs', () => {
    const records = [baseline({ value: 2 }), baseline({ id: 'b2', value: 4 }), record()];
    const choice = selectBaseline(records, records[2]);
    expect(choice?.value).toBe(3);
    expect(choice?.recordIds).toEqual(['baseline', 'b2']);
    expect(choice?.rule).toContain('Arithmetic mean of 2');
    expect(choice?.rule).toContain('b2');
  });

  it('keeps absolute and mass-normalised series separate even with body mass', () => {
    const records = [baseline(), baseline({ id: 'mass-base', value: 40, unit: 'mL/kg/min', bodyMassKg: 75 }),
      record({ unit: 'mL/kg/min', value: 30, bodyMassKg: 80 })];
    expect(assess(records, 'current').calculation?.baseline.recordIds).toEqual(['mass-base']);
    expect(assess(records, 'current').calculation?.retainedPct).toBe(75);
  });

  it.each([1, 3, null])('never determines research compliance, value %s', value => {
    const records = [baseline({ source: 'nasa-research-replay', phase: 'pre-bed-rest' }),
      record({ source: 'nasa-research-replay', phase: 'post-bed-rest', value })];
    const result = assess(records, 'current');
    expect(result.reference.state).toBe('not-applicable');
    expect(result.reference.note).toContain('no compliance determination');
  });

  it('limits the crew reference to in-mission assessments', () => {
    expect(assess([baseline()], 'baseline').reference.state).toBe('not-applicable');
  });
});

describe('evidence checks', () => {
  it.each([null, NaN, Infinity, -1])('rejects missing or invalid current values (%s), never replacing with zero', value => {
    const result = assess([baseline(), record({ value })], 'current');
    expect(result.evidence).toBe('insufficient');
    expect(result.calculation).toBeNull();
    expect(result.reference.state).toBe('not-applicable');
  });
  it('preserves an explicitly recorded zero', () => {
    expect(assess([baseline(), record({ value: 0 })], 'current').calculation?.retainedPct).toBe(0);
  });
  it.each([0, -1, NaN, Infinity, null])('rejects a non-positive or missing baseline (%s) without dropping it', value => {
    const records = [baseline(), baseline({ id: 'bad-base', value }), record()];
    expect(selectBaseline(records, records[2])).toBeNull();
    expect(assess(records, 'current').evidence).toBe('insufficient');
    expect(assess(records, 'current').calculation).toBeNull();
  });
  it('does not borrow a baseline from another person or source', () => {
    const result = assess([baseline({ subjectId: 'OTHER' }), baseline({ id: 'research', source: 'nasa-research-replay' }), record()], 'current');
    expect(result.evidence).toBe('insufficient');
    expect(result.issues.some(issue => issue.code === 'baseline')).toBe(true);
    expect(result.calculation).toBeNull();
  });
  it('marks a missing baseline insufficient', () => {
    const result = assess([record()], 'current');
    expect(result.evidence).toBe('insufficient');
    expect(result.followUp).toContain('Obtain or select an appropriate baseline assessment');
  });
  it('treats missing baseline phase as insufficient rather than contradictory', () => {
    const result = assess([baseline({ phase: null }), record()], 'current');
    expect(result.evidence).toBe('insufficient');
    expect(result.calculation).toBeNull();
  });
  it('blocks conflicting identities linked to the same assessment', () => {
    const result = assess([baseline(), record(), record({ id: 'copy', duplicateOf: 'current', subjectId: 'OTHER' })], 'current');
    expect(result.evidence).toBe('conflicting');
    expect(result.issues.some(issue => issue.code === 'identity')).toBe(true);
    expect(result.calculation).toBeNull();
  });
  it('blocks conflicts in baseline identities too', () => {
    expect(assess([baseline(), baseline({ subjectId: 'OTHER' }), record()], 'current').evidence).toBe('conflicting');
  });
  it('does not count duplicate representations or repeated IDs in the mean or timeline', () => {
    const records = [baseline(), baseline(), baseline({ id: 'copy', duplicateOf: 'baseline', value: 99 }), record()];
    expect(selectBaseline(records, records[3])?.value).toBe(3);
    expect(selectBaseline(records, records[3])?.recordIds).toEqual(['baseline']);
    expect(trend(records, 'SYNTHETIC-01')).toHaveLength(2);
    expect(assess(records, 'copy').issues.some(issue => issue.code === 'duplicate')).toBe(true);
  });
  it.each([
    { metric: 'VO2max' as const }, { method: null }, { method: 'Different capacity test' },
    { unit: 'mL/kg/min' as const }, { unit: null }, { metric: null },
    { modality: 'treadmill' }, { protocol: 'Other protocol' }, { method: 'Ordinary workout heart rate' },
  ])('withholds incompatible or incomplete comparisons: %j', overrides => {
    const result = assess([baseline(), record(overrides)], 'current');
    expect(result.evidence).toBe('insufficient');
    expect(result.calculation).toBeNull();
  });
  it('specifically flags VO2peak versus VO2max', () => {
    const result = assess([baseline(), record({ metric: 'VO2max' })], 'current');
    expect(result.issues.some(issue => issue.code === 'metric' && issue.message.includes('never substituted'))).toBe(true);
  });
  it.each([
    [baseline(), record(), record({ date: '2026-02-02' })],
    [baseline({ date: '2026-03-01' }), record()],
    [baseline({ phase: 'in-mission' }), record()],
    [baseline(), record({ date: '2026-02-30' })],
  ])('withholds contradictory timing', (...records) => {
    const result = assess(records, 'current');
    expect(result.evidence).toBe('conflicting');
    expect(result.calculation).toBeNull();
    expect(result.followUp).toContain('Review the original records');
  });
  it('skips undated records and sorts trend points, keeping insufficient evidence separate', () => {
    const records = [record({ id: 'later', date: '2026-03-01', method: null }), record({ id: 'undated', date: null }), record(), baseline()];
    const points = trend(records, 'SYNTHETIC-01');
    expect(points.map(point => point.assessmentId)).toEqual(['baseline', 'current', 'later', 'undated']);
    expect(points[0].isBaseline).toBe(true);
    expect(points[2]).toMatchObject({ evidence: 'insufficient', retainedPct: null });
  });
  it('withholds conflicting-date timeline values', () => {
    const records = [baseline(), record(), record({ id: 'copy', duplicateOf: 'current', date: '2026-02-02' })];
    expect(trend(records, 'SYNTHETIC-01')[1]).toMatchObject({ evidence: 'conflicting', retainedPct: null });
  });
  it('throws a clear error for an unknown ID', () => {
    expect(() => assess([], 'absent')).toThrow('Assessment not found: absent');
  });
});

describe('bundled demonstration', () => {
  it('bundles curated NASA replay separately and labels every simulated record', () => {
    expect(researchReplay.length).toBeGreaterThan(0);
    expect(allRecords).toEqual([...simulatedCrew, ...researchReplay]);
    expect(simulatedCrew.every(item => item.sourceNotes.includes('Simulated for demonstration'))).toBe(true);
  });
  it('exercises a supported decline below 80% and a missing-method result offline', () => {
    const result = assess(allRecords, 'SIM-FLIGHT-03');
    expect(result.evidence).toBe('supported');
    expect(result.reference.state).toBe('below');
    expect(result.finding).toContain('Measured decrease');
    expect(result.finding).toContain('Below the displayed reference');
    expect(assess(allRecords, 'SIM-FLIGHT-MISSING').evidence).toBe('insufficient');
    expect(trend(allRecords, 'SIM-CREW-01')).toHaveLength(6);
  });
});
