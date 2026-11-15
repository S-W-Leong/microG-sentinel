import data from './mobility.json';

export const datasetUrl =
  'https://nlsp.nasa.gov/search/data/details/5fca791c-e1b8-5ee8-aba0-c6220789547e?dataType=DATASETS';
export const mainFile = 'BRSMFMT_Campaign_1_Functional_Mobility_Test_Obsv_All.csv';
export const summaryFile = 'BRSMFMT_Campaign_1_Functional_Mobility_Test_ Avgs_All.csv';
export const sourceFiles = data.files;

export function parseValue(raw: string): number | null {
  if (raw === 'NA' || raw.trim() === '') return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid source number: ${raw}`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Nonfinite source number: ${raw}`);
  return value;
}

type Phase = 'PRE_TEST' | 'POST_TEST';
export type Test = 'all' | 'CW' | 'CCW';
function phase(raw: string): Phase {
  if (raw !== 'PRE_TEST' && raw !== 'POST_TEST') throw new Error(`Unknown phase: ${raw}`);
  return raw;
}
function direction(raw: string): Exclude<Test, 'all'> {
  if (raw !== 'CW' && raw !== 'CCW') throw new Error(`Unknown direction: ${raw}`);
  return raw;
}

export const researchTrials = data.trials.map(({ row, sourceRow }) => ({
  id: row.ID,
  participant: row.Subject,
  phase: phase(row.Test_Phase),
  studyDay: row.BR_Day,
  visitId: `${row.Subject}:${row.Test_Phase}:${row.BR_Day}`,
  trial: row.Trial,
  direction: direction(row.Direction),
  seconds: parseValue(row.Time),
  hits: parseValue(row['Total Hits']),
  notes: row.Comments === 'NA' ? null : row.Comments,
  sourceRow,
  raw: row,
}));
export type ResearchTrial = (typeof researchTrials)[number];
export const participants = [...new Set(researchTrials.map((trial) => trial.participant))];
export const visits = [...new Set(researchTrials.map((trial) => trial.visitId))].map((id) => {
  const trial = researchTrials.find((item) => item.visitId === id)!;
  return {
    id,
    participant: trial.participant,
    phase: trial.phase,
    studyDay: trial.studyDay,
    label: `${trial.phase === 'PRE_TEST' ? 'Pre-test' : 'Post-test'} · day ${trial.studyDay}`,
  };
});

export function selectTrials(participant: string, visitId: string, test: Test = 'all') {
  return researchTrials.filter(
    (trial) =>
      trial.participant === participant &&
      trial.visitId === visitId &&
      (test === 'all' || trial.direction === test),
  );
}

/** Audit published summaries against all six source trials, without replacing either. */
export function summaryEvidence(visitId: string) {
  const trials = researchTrials.filter((trial) => trial.visitId === visitId);
  const summaries = data.summaries.filter(
    ({ row }) => `${row.Subject}:${row.Test_Phase}:${row.BR_Day}` === visitId,
  );
  const complete =
    trials.length === 6 &&
    new Set(trials.map((trial) => trial.trial)).size === 6 &&
    trials.every((trial) => trial.seconds !== null);
  const trialMean = complete ? trials.reduce((sum, trial) => sum + trial.seconds!, 0) / 6 : null;
  const publishedMean = summaries.length === 1 ? parseValue(summaries[0].row['Avg. Time']) : null;
  const mismatch =
    trialMean !== null && publishedMean !== null && Math.abs(trialMean - publishedMean) > 0.011;
  return { trials, summaries, trialMean, publishedMean, mismatch };
}

export function showValue(value: number | null, unit = '') {
  return value === null
    ? 'Not recorded'
    : `${value.toFixed(unit === 's' ? 2 : 0)}${unit ? ` ${unit}` : ''}`;
}
