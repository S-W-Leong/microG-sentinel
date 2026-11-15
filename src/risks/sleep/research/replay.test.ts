import { expect, it } from 'vitest';
import { compareNight, parseDuration, researchNights } from './replay';

it('reads source durations as sexagesimal hours, preserving zero and missing', () => {
  expect(parseDuration('7:44:00')).toBeCloseTo(7 + 44 / 60);
  expect(parseDuration('0:14')).toBeCloseTo(14 / 60);
  expect(parseDuration('0')).toBe(0);
  expect(parseDuration('NA')).toBeNull();
  for (const bad of ['6.56', '1:60', '-1:00', '25:00', '1:00:60'])
    expect(() => parseDuration(bad)).toThrow();
});

it('compares the first bed-rest night only with that participant’s two pre-tests', () => {
  const night = researchNights.find((n) => n.id === '3')!;
  expect(night).toMatchObject({ participant: 'C1G0001', date: '2004-09-09', latencyHours: 0 });
  const result = compareNight(night);
  expect(result.evidence).toBe('supported');
  expect(result.baselineHours).toBeCloseTo(7 + 47 / 60);
  expect(result.durationDeltaMinutes).toBeCloseTo(5);
  expect(result.efficiencyDeltaPoints).toBeCloseTo(-3.15);
  expect(compareNight(researchNights[0]).durationDeltaMinutes).toBeNull();
});

it('keeps absent pre-tests unavailable rather than borrowing another person’s baseline', () => {
  const night = researchNights.find((n) => n.id === '73')!;
  expect(night.participant).toBe('C1G0002');
  expect(night.durationHours).not.toBeNull();
  expect(compareNight(night)).toMatchObject({
    evidence: 'insufficient',
    baselineHours: null,
    durationDeltaMinutes: null,
  });
  expect(researchNights.find((n) => n.id === '70')!.durationHours).toBeNull();
});

it('retains query evidence and blocks mismatched or malformed source assertions', () => {
  const conflict = researchNights.find((n) => n.participant === 'C1G0003' && n.conflicts.length)!;
  expect(conflict.queryRows.length).toBeGreaterThan(0);
  expect(compareNight(conflict)).toMatchObject({
    evidence: 'conflicting',
    durationDeltaMinutes: null,
  });
  const malformed = researchNights.find((n) =>
    n.queryRows.some((q) => q.row['Sleep duration'] === '6.56'),
  )!;
  expect(malformed.conflicts.join(' ')).toContain('Malformed');
});

it('retains every main observation, notes, and physical row provenance', () => {
  expect(researchNights).toHaveLength(207);
  expect(researchNights.filter((n) => n.durationHours === null)).toHaveLength(17);
  expect(researchNights[0].sourceRow).toBe(2);
  expect(researchNights[206].sourceRow).toBe(208);
  expect(researchNights.some((n) => n.notes.includes('Ambien'))).toBe(true);
});
