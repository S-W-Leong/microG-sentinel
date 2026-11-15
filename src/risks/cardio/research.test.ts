import { expect, it } from 'vitest';
import { compareResearch, researchOccasions } from './research';

it('runs real post-bed-rest records through the Cardio comparison and VO2 evaluators', () => {
  const r = compareResearch(researchOccasions[0].id, 100, 'mL/kg/min');
  expect(r.session.scope.subjectId).toBe('C3D-3985');
  expect(r.simulated).toBe(false);
  expect(r.stage.hrBpm).toBe(166);
  expect(r.selected.baselineMeanBpm).toBe(124.5);
  expect(r.selected.deltaBpm).toBe(41.5);
  expect(r.selected.basis).toBe('qualified-research');
  expect(r.vo2?.value).toBeCloseTo((100 * 22.1) / 29.9);
  expect(r.vo2?.result.reference.state).toBe('not-applicable');
  expect(r.session.symptoms.join(' ')).toContain('dizziness');
  expect(r.stage.sourceRefs.length).toBeGreaterThan(0);
  expect(r.baselines).toHaveLength(2);
  expect(r.records.every((x) => x.source === r.source && x.subjectId === 'C3D-3985')).toBe(true);
});

it('recalculates recovery, workloads and units without mixing representations', () => {
  const recovery = compareResearch(researchOccasions[1].id, 100, 'mL/kg/min');
  expect(recovery.selected.deltaBpm).toBe(14.5);
  expect(recovery.vo2?.value).toBeCloseTo((100 * 29.3) / 29.9);
  const absolute = compareResearch(researchOccasions[0].id, 50, 'L/min');
  expect(absolute.stage.context.workloadW).toBe(50);
  expect(absolute.vo2?.value).toBeCloseTo((100 * 2.04) / 2.725);
  expect(absolute.records.every((x) => x.unit === 'L/min')).toBe(true);
  expect(absolute.points).toHaveLength(4);
  expect(absolute.vo2?.record.sourceNotes.length).toBeGreaterThan(0);
  expect(() => compareResearch('SIM-CDR', 100, 'mL/kg/min')).toThrow();
  expect(() => compareResearch(researchOccasions[0].id, 999, 'mL/kg/min')).toThrow();
});
