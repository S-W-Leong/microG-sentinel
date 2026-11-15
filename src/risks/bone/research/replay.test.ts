import { expect, it } from 'vitest';
import { buildVisits, compareVisit, researchVisits, sourceRows } from './replay';

const hip = () =>
  researchVisits.filter(
    (v) => v.participant === 'C3A-224' && v.site === 'total-hip' && v.side === 'right',
  );

it('groups triplicates into one visit without counting repeated exports twice', () => {
  const visits = hip();
  expect(visits[0].date).toBe('2005-02-28');
  expect(visits[0].scans).toHaveLength(3);
  expect(visits[0].bmd).toBeCloseTo(1.1206666666666667);
  const rows = sourceRows.filter(
    (r) => r.file.includes('C3A_All_RH_Bone') && r.raw.SUBJECT === '224',
  );
  const repeated = buildVisits([...rows, ...rows]);
  const baseline = repeated.find((v) => v.site === 'total-hip' && v.phase === 'PRE_TEST')!;
  expect(baseline.scans).toHaveLength(3);
  expect(baseline.bmd).toBeCloseTo(1.1206666666666667);
  const duplicateId = { ...rows[0], raw: { ...rows[0].raw, ID: '999' } };
  const scanLinked = buildVisits([...rows, duplicateId]);
  expect(
    scanLinked.find((v) => v.site === 'total-hip' && v.phase === 'PRE_TEST')!.scans,
  ).toHaveLength(3);
});

it('calculates signed change across actual scan dates using the same side and site', () => {
  const result = compareVisit(
    hip().find((v) => v.phase === 'IN_TEST')!,
    researchVisits,
  );
  expect(result).toMatchObject({ evidence: 'supported', elapsedDays: 70, baselineCount: 1 });
  expect(result.changePct).toBeCloseTo(-2.706722189173124);
  expect(result.ratePctPerMonth).toBeCloseTo(-1.1769408090422342);
  expect(compareVisit(hip()[0], researchVisits).ratePctPerMonth).toBeNull();
});

it('does not borrow a baseline from another participant, site or side', () => {
  const current = hip().find((v) => v.phase === 'IN_TEST')!;
  const other = researchVisits.filter(
    (v) =>
      v.phase !== 'PRE_TEST' ||
      v.participant !== current.participant ||
      v.side !== current.side ||
      v.site !== current.site,
  );
  expect(compareVisit(current, other)).toMatchObject({
    evidence: 'insufficient',
    ratePctPerMonth: null,
  });
});

it('blocks missing metadata, changed analysis versions, unknown dates and conflicting copies', () => {
  const missing = researchVisits.find(
    (v) => v.participant === 'C3D-3985' && v.phase === 'IN_TEST',
  )!;
  expect(compareVisit(missing, researchVisits)).toMatchObject({
    evidence: 'insufficient',
    ratePctPerMonth: null,
  });
  const changed = hip().find((v) => v.phase === null)!;
  expect(compareVisit(changed, researchVisits).ratePctPerMonth).toBeNull();
  const unknown = researchVisits.find((v) => v.date === null)!;
  expect(compareVisit(unknown, researchVisits).ratePctPerMonth).toBeNull();
  const rows = sourceRows.filter(
    (r) => r.file.includes('C3A_All_RH_Bone') && r.raw.SUBJECT === '224',
  );
  const altered = { ...rows[3], raw: { ...rows[3].raw, HTOT_BMD: '0.5' } };
  const visits = buildVisits([...rows, altered]);
  expect(visits.find((v) => v.phase === 'IN_TEST' && v.site === 'total-hip')!.bmd).toBeNull();
  expect(
    compareVisit(
      visits.find((v) => v.phase === 'IN_TEST' && v.site === 'total-hip')!,
      visits,
    ),
  ).toMatchObject({ evidence: 'conflicting', ratePctPerMonth: null });
});

it('preserves missing BMD and calibration provenance without reapplying corrections', () => {
  const row = sourceRows.find(
    (r) => r.file.includes('C3C_7352_RH_Bone') && r.raw.TEST_PHASE === 'IN_TEST',
  )!;
  const visits = buildVisits([{ ...row, raw: { ...row.raw, HTOT_BMD: 'NA' } }]);
  expect(visits.find((v) => v.site === 'total-hip')!.bmd).toBeNull();
  const unconfirmed = buildVisits([{ ...row, raw: { ...row.raw, COMMENTS: 'NA' } }]);
  expect(unconfirmed[0].issues.join(' ')).toContain('Calibration');
});
