import type { Assessment, AssessmentResult, TrendPoint } from '../types';

// UI fixtures only. Even the research-shaped records here are simulated, not source data.
const record = (id: string, date: string, value: number, extra: Partial<Assessment> = {}): Assessment => ({
  id, date, value, subjectId: 'SIM-CREW-01', source: 'simulated-crew', phase: 'in-mission',
  metric: 'VO2peak', unit: 'mL/kg/min', bodyMassKg: null, method: 'Graded cycle ergometer test',
  modality: 'Cycle ergometer', protocol: 'Simulated consistent ramp protocol', isBaseline: false,
  sourceNotes: ['Simulated UI fixture. Not an actual crew or research assessment.'], ...extra,
});
export const mockRecords: Assessment[] = [
  record('crew-base', '2026-06-01', 40, { phase: 'pre-mission', isBaseline: true }),
  record('crew-above', '2026-07-01', 36),
  record('crew-missing', '2026-08-01', 34, { method: null }),
  record('crew-conflict', '2026-09-01', 33, { sourceNotes: ['Simulated fixture: original identity fields disagree (SIM-CREW-01 / SIM-CREW-02).'] }),
  record('crew-below', '2026-10-01', 30),
  record('replay-base-a', '2026-01-01', 30, { subjectId: 'SIM-RESEARCH-01', source: 'nasa-research-replay', phase: 'pre-bed-rest', isBaseline: true }),
  record('replay-base-b', '2026-01-03', 29.8, { subjectId: 'SIM-RESEARCH-01', source: 'nasa-research-replay', phase: 'pre-bed-rest', isBaseline: true }),
  record('replay-post', '2026-02-01', 22.1, { subjectId: 'SIM-RESEARCH-01', source: 'nasa-research-replay', phase: 'post-bed-rest' }),
  record('replay-recovery', '2026-03-01', 29.3, { subjectId: 'SIM-RESEARCH-01', source: 'nasa-research-replay', phase: 'recovery' }),
];
const result = (assessmentId: string, evidence: AssessmentResult['evidence'] = 'supported'): AssessmentResult => {
  const assessment = mockRecords.find(item => item.id === assessmentId)!;
  const research = assessment.source === 'nasa-research-replay';
  const baseline = research ? 29.9 : 40;
  const current = assessment.value!;
  const retainedPct = current / baseline * 100;
  const issues: AssessmentResult['issues'] = evidence === 'insufficient'
    ? [{ code: 'method', message: 'The measurement method is missing; comparability cannot be established.', followUp: 'Obtain the original method documentation or request a comparable assessment through existing procedures.' }]
    : evidence === 'conflicting' ? [{ code: 'identity', message: 'The source identity fields disagree. This assessment cannot be linked confidently to the baseline.', followUp: 'Review the original records and resolve participant identity before comparing.' }] : [];
  return {
    assessmentId, source: assessment.source, evidence, issues,
    finding: evidence === 'supported' ? `${(100 - retainedPct).toFixed(1)}% measured decrease from the selected personal baseline.` : 'Comparison needs review. No numerical change is established.',
    calculation: evidence === 'supported' ? { current, unit: 'mL/kg/min', baseline: { rule: research ? 'Arithmetic mean of two simulated pre-bed-rest assessments' : 'Single simulated pre-mission assessment using the same documented method', recordIds: research ? ['replay-base-a', 'replay-base-b'] : ['crew-base'], value: baseline, unit: 'mL/kg/min' }, retainedPct, changePct: retainedPct - 100 } : null,
    reference: { label: 'NASA-STD-3001 V1 4003: in-mission aerobic capacity at or above 80% of pre-mission capacity', thresholdPct: 80, state: research || evidence !== 'supported' ? 'not-applicable' : retainedPct < 80 ? 'below' : 'at-or-above', note: research ? 'Analog research replay: reference shown for context only; no mission compliance determination.' : evidence !== 'supported' ? 'Reference comparison withheld until the evidence is resolved.' : 'Simulated crew comparison only. This relative reference does not establish task-specific EVA capability.' },
    limits: ['All displayed records are simulated fixtures for interface development.', 'VO2peak is preserved as recorded; it is not substituted for VO2max.', 'This comparison does not establish clinical status or task-specific capability.', ...(research ? ['Baseline averaging is a demonstration assumption, not a NASA-approved selection rule.'] : [])],
    followUp: issues.length ? issues.map(issue => issue.followUp) : ['Prepare this assessment and its supporting evidence for specialist review through existing procedures.'],
  };
};
export const mockResults: AssessmentResult[] = [result('crew-above'), result('crew-missing', 'insufficient'), result('crew-conflict', 'conflicting'), result('crew-below'), result('replay-post'), result('replay-recovery')];
export const mockTrend: TrendPoint[] = mockRecords.map(item => ({
  assessmentId: item.id, date: item.date!, isBaseline: item.isBaseline,
  evidence: mockResults.find(result => result.assessmentId === item.id)?.evidence ?? 'supported',
  retainedPct: item.isBaseline ? item.value! / (item.source === 'nasa-research-replay' ? 29.9 : 40) * 100 : mockResults.find(result => result.assessmentId === item.id)?.calculation?.retainedPct ?? null,
}));
