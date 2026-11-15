import { expect, it } from 'vitest';
import {
  buildLabResults,
  compareResult,
  labResults,
  sourceRecords,
  parseConcentration,
} from './replay';

const il6 = () => labResults.filter((r) => r.participant === 'C001' && r.marker === 'IL-6');
const post = () => il6().find((r) => r.timepoint === 'R+1')!;

it('uses three same-participant pre-flight concentrations, not supplied all-crew percentages', () => {
  const result = compareResult(post());
  expect(post().issues).toEqual([]);
  expect(result.evidence).toBe('supported');
  expect(result.baseline).toBeCloseTo(3.796666666666667);
  expect(result.delta).toBeCloseTo(3.0633333333333335);
  expect(result.changePct).toBeCloseTo(80.684811237928);
  expect(post().value).toBe(6.86);
  expect(compareResult(il6()[0]).delta).toBeNull();
});

it('never borrows another marker, person or panel to fill a missing baseline', () => {
  const results = labResults.filter(
    (r) => !(r.participant === 'C001' && r.marker === 'IL-6' && r.timepoint === 'L-44'),
  );
  expect(compareResult(post(), results)).toMatchObject({ evidence: 'insufficient', delta: null });
  const wrongPanel = { ...post(), panel: 'HDCVD9' };
  expect(compareResult(wrongPanel)).toMatchObject({ evidence: 'insufficient', delta: null });
});

it('retains nulls and qualifiers while a measured zero remains numeric', () => {
  expect(parseConcentration('0')).toBe(0);
  for (const value of ['', 'NA', 'NaN', 'OOR<', '<0.1', '>1000', '-1', 'Infinity'])
    expect(parseConcentration(value)).toBeNull();
  const row = sourceRecords.find(
    (r) => r.raw.ID === 'C001' && r.raw.Analyte === 'IL-6' && r.raw.Timepoint === 'R+1',
  )!;
  const qualified = buildLabResults([
    { ...row, raw: { ...row.raw, Concentration: '<0.1' }, transformedRaw: '<0.1' },
  ]);
  expect(qualified[0].value).toBeNull();
  expect(qualified[0].source.raw.Concentration).toBe('<0.1');
  const zeroBaseline = il6().map((r) => (r.timepoint.startsWith('L-') ? { ...r, value: 0 } : r));
  expect(compareResult(post(), zeroBaseline)).toMatchObject({
    baseline: 0,
    delta: 6.86,
    changePct: null,
  });
});

it('blocks conflicting representations, duplicates, wrong units and sample identity mismatches', () => {
  const row = sourceRecords.find(
    (r) => r.raw.ID === 'C001' && r.raw.Analyte === 'IL-6' && r.raw.Timepoint === 'R+1',
  )!;
  for (const bad of [
    { ...row, transformedRaw: '999' },
    { ...row, raw: { ...row.raw, Unit: 'ng/ml' } },
    { ...row, transformedSample: 'C002_serum_R+1' },
  ]) {
    const r = buildLabResults([bad])[0];
    expect(compareResult(r)).toMatchObject({ evidence: 'conflicting', delta: null });
  }
  const duplicated = buildLabResults([...sourceRecords, row]);
  expect(
    compareResult(
      duplicated.find((r) => r.key === post().key)!,
      duplicated,
    ).evidence,
  ).toBe('conflicting');
});

it('cross-checks every HD71 result and preserves sample-relative timing and provenance', () => {
  expect(labResults).toHaveLength(1988);
  expect(new Set(labResults.map((r) => r.marker)).size).toBe(71);
  expect(new Set(labResults.map((r) => r.participant)).size).toBe(4);
  expect(labResults.every((r) => r.issues.length === 0 && r.value !== null)).toBe(true);
  expect(labResults.filter((r) => r.timepoint === 'R+194')).toHaveLength(284);
  expect(post().source.sourceRow).toBeGreaterThan(1);
  expect(post().source.transformedRow).toBeGreaterThan(1);
});
