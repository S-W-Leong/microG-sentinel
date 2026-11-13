import { allRecords } from '../data';
import { assess, trend } from '../logic/assess';
import type { AssessmentResult } from '../types';

// The only bridge between screens and the assessment logic. Screens import nothing else from data/ or logic/.
const results: AssessmentResult[] = allRecords
  .filter(record => !record.duplicateOf)
  .map(record => assess(allRecords, record.id));

export const getResults = () => results;
export const getRecords = () => allRecords;
export const getTrend = (subjectId: string) => trend(allRecords, subjectId);
export const getResult = (id: string) => results.find(result => result.assessmentId === id);
export const getRecord = (id: string) => allRecords.find(record => record.id === id);

const byDateDesc = (a: AssessmentResult, b: AssessmentResult) =>
  (getRecord(b.assessmentId)?.date ?? '').localeCompare(getRecord(a.assessmentId)?.date ?? '');

const nonBaseline = (result: AssessmentResult) => !getRecord(result.assessmentId)?.isBaseline;

export const getLatestResult = () =>
  results.filter(result => result.source === 'simulated-crew' && nonBaseline(result)).sort(byDateDesc)[0];

// Research replay opens on the earliest non-baseline assessment, the first change from baseline.
export const getReplayResult = () =>
  results
    .filter(result => result.source === 'nasa-research-replay' && nonBaseline(result))
    .sort((a, b) => byDateDesc(b, a))[0];
