import { allRecords } from '../data';
import { assess, trend } from '../logic/assess';
import type { AssessmentResult, Metric, Unit } from '../types';

// The only bridge between screens and the assessment logic. Screens import nothing else from data/ or logic/.
const results: AssessmentResult[] = allRecords
  .filter((record) => !record.duplicateOf)
  .map((record) => assess(allRecords, record.id));

export const getResults = () => results;
export const getRecords = () => allRecords;
export const getTrend = (subjectId: string, metric: Metric | null, unit: Unit | null) =>
  trend(allRecords, subjectId).filter((point) => {
    const record = getRecord(point.assessmentId);
    return record?.metric === metric && record?.unit === unit;
  });
export const getResult = (id: string) => results.find((result) => result.assessmentId === id);
export const getRecord = (id: string) => allRecords.find((record) => record.id === id);

const byDateDesc = (a: AssessmentResult, b: AssessmentResult) =>
  (getRecord(b.assessmentId)?.date ?? '').localeCompare(getRecord(a.assessmentId)?.date ?? '');

const nonBaseline = (result: AssessmentResult) => !getRecord(result.assessmentId)?.isBaseline;

export const getLatestResult = () =>
  results
    .filter((result) => result.source === 'simulated-crew' && nonBaseline(result))
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
