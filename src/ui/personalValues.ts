import type { AssessmentResult } from '../types';
import { parseManualEntry } from '../logic/manualEntry';

export type ReportDraft = {
  date: string;
  value: string;
  metric: string;
  unit: string;
  method: string;
  modality: string;
  protocol: string;
  phase: string;
  bodyMassKg: string;
  notes: string;
};
export type ValuesDraft = {
  subject: string;
  seriesId: string;
  baselineId: string;
  laterId: string;
  baseline: ReportDraft;
  later: ReportDraft;
  baselineSaved: boolean;
  laterSaved: boolean;
  laterChecked: boolean;
  laterStarted: boolean;
};

export function createValuesDraft(id: string): ValuesDraft {
  const report = (): ReportDraft => ({
    date: '',
    value: '',
    metric: '',
    unit: '',
    method: '',
    modality: '',
    protocol: '',
    phase: 'not-applicable',
    bodyMassKg: '',
    notes: '',
  });
  return {
    subject: 'Me',
    seriesId: `guided-${id}`,
    baselineId: `USER-${id}-BASE`,
    laterId: `USER-${id}-LATER`,
    baseline: report(),
    later: report(),
    baselineSaved: false,
    laterSaved: false,
    laterChecked: false,
    laterStarted: false,
  };
}

export function parseGuidedReport(draft: ValuesDraft, role: 'baseline' | 'later') {
  const report = draft[role];
  const fail = (error: string) => ({ record: null, error });
  if (role === 'later' && !draft.baselineSaved) return fail('Save your baseline first.');
  if (!report.date) return fail('Enter the date printed on this report.');
  if (!report.value.trim())
    return fail('Enter the capacity printed on this report. A blank value is not zero.');
  if (!report.metric || !report.unit)
    return fail('Choose the metric and units printed on the report, or select Not listed.');
  if (role === 'baseline' && Number(report.value) <= 0)
    return fail('Your baseline capacity must be greater than zero.');
  if (role === 'later' && !draft.laterChecked)
    return fail('Check the copied test details against your later report before continuing.');
  const form = new FormData();
  for (const [key, value] of Object.entries(report)) form.set(key, value);
  form.set('metric', report.metric === 'unknown' ? '' : report.metric);
  form.set('unit', report.unit === 'unknown' ? '' : report.unit);
  form.set('subjectId', draft.subject.trim() || 'Me');
  form.set('group', draft.seriesId);
  if (role === 'baseline') form.set('baseline', 'on');
  const parsed = parseManualEntry(form, role === 'baseline' ? draft.baselineId : draft.laterId);
  if (!parsed.record) return parsed;
  if (role === 'later' && report.date < draft.baseline.date)
    return fail('The later report cannot be dated before your baseline. Check both dates.');
  return parsed;
}

export function explainPersonalResult(result: AssessmentResult) {
  const c = result.calculation;
  if (!c)
    return {
      headline: 'These reports cannot be compared yet.',
      meaning:
        'Check the report details below. Missing or incompatible information is not treated as zero.',
    };
  return {
    headline:
      c.changePct === 0
        ? 'Your recorded capacity is unchanged.'
        : `Your recorded capacity is ${Math.abs(c.changePct).toFixed(1)}% ${c.changePct > 0 ? 'higher' : 'lower'}.`,
    meaning: `${c.retainedPct.toFixed(1)}% of baseline means the later measurement is ${c.retainedPct.toFixed(1)}% of your starting value. 100% would mean the same value; this is not a fitness score out of 100.`,
  };
}
