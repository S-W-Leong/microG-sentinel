import { describe, expect, it } from 'vitest';
import { assess } from '../logic/assess';
import { createValuesDraft, parseGuidedReport, explainPersonalResult } from './personalValues';

function pair() {
  const draft = createValuesDraft('pair-a');
  draft.baseline = {
    ...draft.baseline,
    date: '2026-01-01',
    value: '3',
    metric: 'VO2peak',
    unit: 'L/min',
    method: 'Graded capacity test',
  };
  draft.baselineSaved = true;
  draft.later = { ...draft.baseline, date: '2026-02-01', value: '2.1' };
  draft.laterChecked = true;
  return draft;
}
function result(draft = pair()) {
  const baseline = parseGuidedReport(draft, 'baseline').record!;
  const later = parseGuidedReport(draft, 'later').record!;
  return assess([baseline, later], later.id);
}

describe('guided personal reports', () => {
  it('links the reports automatically and explains the actual supported comparison', () => {
    const draft = pair();
    const b = parseGuidedReport(draft, 'baseline').record!;
    const l = parseGuidedReport(draft, 'later').record!;
    expect(b.isBaseline).toBe(true);
    expect(l.isBaseline).toBe(false);
    expect(b.comparisonGroupId).toBe(l.comparisonGroupId);
    expect(result().calculation?.retainedPct).toBe(70);
    expect(explainPersonalResult(result()).headline).toBe('Your recorded capacity is 30.0% lower.');
  });
  it('describes increases, unchanged readings and a zero later result correctly', () => {
    const draft = pair();
    draft.later.value = '3.3';
    expect(explainPersonalResult(result(draft)).headline).toBe(
      'Your recorded capacity is 10.0% higher.',
    );
    draft.later.value = '3';
    expect(explainPersonalResult(result(draft)).headline).toBe(
      'Your recorded capacity is unchanged.',
    );
    draft.later.value = '0';
    expect(result(draft).calculation?.retainedPct).toBe(0);
  });
  it('blocks blank capacity, zero baseline, invalid dates and a later date before baseline', () => {
    const draft = pair();
    draft.baseline.value = '';
    expect(parseGuidedReport(draft, 'baseline').record).toBeNull();
    draft.baseline.value = '0';
    expect(parseGuidedReport(draft, 'baseline').record).toBeNull();
    draft.baseline.value = '3';
    draft.later.date = '2026-02-30';
    expect(parseGuidedReport(draft, 'later').record).toBeNull();
    draft.later.date = '2025-12-31';
    expect(parseGuidedReport(draft, 'later').error).toContain('before your baseline');
  });
  it('requires a saved baseline and checking the later report details', () => {
    const draft = pair();
    draft.baselineSaved = false;
    expect(parseGuidedReport(draft, 'later').record).toBeNull();
    draft.baselineSaved = true;
    draft.laterChecked = false;
    expect(parseGuidedReport(draft, 'later').record).toBeNull();
  });
  it('preserves missing methods and incompatible units instead of inventing a comparison', () => {
    const draft = pair();
    draft.baseline.method = '';
    draft.later.method = '';
    expect(result(draft).calculation).toBeNull();
    expect(explainPersonalResult(result(draft)).headline).toBe(
      'These reports cannot be compared yet.',
    );
    draft.baseline.method = draft.later.method = 'Graded capacity test';
    draft.later.unit = 'mL/kg/min';
    expect(result(draft).calculation).toBeNull();
  });
  it('keeps correction IDs stable and separate comparison pairs isolated', () => {
    const first = pair();
    const before = parseGuidedReport(first, 'baseline').record!;
    first.baseline.value = '4';
    const corrected = parseGuidedReport(first, 'baseline').record!;
    expect(corrected.id).toBe(before.id);
    const second = {
      ...pair(),
      ...createValuesDraft('pair-b'),
      baseline: pair().baseline,
      later: pair().later,
      baselineSaved: true,
      laterChecked: true,
    };
    const records = [
      corrected,
      parseGuidedReport(first, 'later').record!,
      parseGuidedReport(second, 'baseline').record!,
      parseGuidedReport(second, 'later').record!,
    ];
    expect(assess(records, records[1].id).calculation?.baseline.value).toBe(4);
    expect(assess(records, records[3].id).calculation?.baseline.value).toBe(3);
  });
});
