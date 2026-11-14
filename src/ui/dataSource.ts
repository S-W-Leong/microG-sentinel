import { allRecords } from '../data';
import { assess, trend } from '../logic/assess';
import type { AssessmentResult, Metric, Unit } from '../types';

// The only bridge between screens and the assessment logic. Screens import nothing else from data/ or logic/.
let activeScope = { source: 'simulated-crew', subject: '', group: '' };
export const getActiveScope = () => activeScope;
export const setActiveScope = (subject: string, group: string) => {
  activeScope = { source: 'user-entered', subject, group };
  window.dispatchEvent(new Event('assessmentschange'));
};
export const selectDemo = () => {
  activeScope = { source: 'simulated-crew', subject: '', group: '' };
  window.dispatchEvent(new Event('assessmentschange'));
};
let userRecords: import('../types').Assessment[] = [];
export const saveUserRecord = (record: import('../types').Assessment) => {
  if (record.source !== 'user-entered' || !record.id.startsWith('USER-'))
    throw new Error('Only user entries can be changed');
  if (
    record.duplicateOf &&
    !userRecords.some((r) => r.id === record.duplicateOf && !r.duplicateOf && r.id !== record.id)
  )
    throw new Error(
      'Alternative representation must link to an existing independent user assessment',
    );
  userRecords = [...userRecords.filter((r) => r.id !== record.id), record];
  window.dispatchEvent(new Event('assessmentschange'));
};
export const resetUserRecords = () => {
  userRecords = [];
  selectDemo();
  window.dispatchEvent(new Event('assessmentschange'));
};
const records = () => [...allRecords, ...userRecords];
const results = (): AssessmentResult[] =>
  records()
    .filter((record) => !record.duplicateOf)
    .map((record) => assess(records(), record.id));

export const getResults = () => results();
export const getRecords = () => records();
export const getTrend = (
  subjectId: string,
  metric: Metric | null,
  unit: Unit | null,
  source?: string,
  group?: string,
) =>
  trend(records(), subjectId).filter((point) => {
    const record = getRecord(point.assessmentId);
    return (
      record?.metric === metric &&
      record?.unit === unit &&
      (!source || record.source === source) &&
      record.comparisonGroupId === group
    );
  });
export const getResult = (id: string) =>
  records().some((r) => r.id === id) ? assess(records(), id) : undefined;
export const getRecord = (id: string) => records().find((record) => record.id === id);

const byDateDesc = (a: AssessmentResult, b: AssessmentResult) =>
  (getRecord(b.assessmentId)?.date ?? '').localeCompare(getRecord(a.assessmentId)?.date ?? '');

const nonBaseline = (result: AssessmentResult) => !getRecord(result.assessmentId)?.isBaseline;

export const getLatestResult = (
  source = activeScope.source,
  subject = activeScope.subject,
  group: string | undefined = activeScope.group || undefined,
) =>
  results()
    .filter(
      (result) =>
        result.source === source &&
        (!subject || getRecord(result.assessmentId)?.subjectId === subject) &&
        getRecord(result.assessmentId)?.comparisonGroupId === group &&
        nonBaseline(result),
    )
    .sort(byDateDesc)[0];

// Curated navigation targets keep the decline/recovery story and both conflicts reachable.
export const getReplayExamples = () =>
  [
    { id: 'MR080G-3985-070506-REL', label: 'C3D-3985 · Measured decrease after bed rest' },
    { id: 'MR080G-3985-070517-REL', label: 'C3D-3985 · Recovery assessment' },
    {
      id: 'MR080G-0224-050303-REL',
      label: 'C3A-0224 · Conflicting campaign and participant fields',
    },
    { id: 'MR080G-5580-090609-REL', label: 'C3G-5580 · Conflicting dates' },
  ].filter((example) => getResult(example.id)?.source === 'nasa-research-replay');

export const getReplayResult = () => getResult(getReplayExamples()[0]?.id ?? '');
