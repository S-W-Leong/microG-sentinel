import { expect, it } from 'vitest';
import {
  parseValue,
  participants,
  researchTrials,
  selectTrials,
  showValue,
  summaryEvidence,
  visits,
} from './replay';

it('preserves measured zero, missing values and malformed evidence', () => {
  expect(parseValue('0')).toBe(0);
  expect(parseValue('NA')).toBeNull();
  expect(parseValue('')).toBeNull();
  expect(showValue(null)).toBe('Not recorded');
  expect(showValue(0)).toBe('0');
  for (const value of ['NaN', 'Infinity', '-1', '14 seconds', '1:20']) {
    expect(() => parseValue(value)).toThrow();
  }
});

it('retains the complete small trial export and its physical source rows', () => {
  expect(participants).toEqual(['C1G0001', 'C1G0002', 'C1G0003']);
  expect(visits).toHaveLength(18);
  expect(researchTrials).toHaveLength(108);
  expect(researchTrials[0]).toMatchObject({
    id: '1',
    participant: 'C1G0001',
    phase: 'PRE_TEST',
    studyDay: '10',
    seconds: 14.12,
    hits: 0,
    direction: 'CCW',
    sourceRow: 2,
  });
  expect(researchTrials[107].sourceRow).toBe(109);
  expect(researchTrials[0].raw['Portal 1']).toBe('NA');
  expect(researchTrials.some((trial) => trial.notes?.includes('took break'))).toBe(true);
  expect(researchTrials.every((trial) => !('timestamp' in trial) && !('recordedAt' in trial))).toBe(
    true,
  );
});

it('filters direction within the chosen participant and visit only', () => {
  const id = 'C1G0001:POST_TEST:0';
  expect(selectTrials('C1G0001', id)).toHaveLength(6);
  expect(selectTrials('C1G0001', id, 'CW').map((trial) => trial.seconds)).toEqual([
    32.96, 29.35, 25.82,
  ]);
  expect(selectTrials('C1G0001', id, 'CCW').map((trial) => trial.trial)).toEqual(['2', '5', '6']);
  expect(selectTrials('C1G0001', 'C1G0001:POST_TEST:11', 'CW')).toHaveLength(4);
  expect(selectTrials('C1G0001', 'C1G0001:POST_TEST:11', 'CCW')).toHaveLength(2);
  expect(selectTrials('C1G0002', id)).toEqual([]);
  expect(selectTrials('C1G0001', 'missing')).toEqual([]);
  for (const visit of visits) expect(selectTrials(visit.participant, visit.id)).toHaveLength(6);
});

it('exposes the published mean mismatch without repairing source trials or summary', () => {
  const evidence = summaryEvidence('C1G0001:POST_TEST:0');
  expect(evidence.publishedMean).toBe(25.29);
  expect(evidence.trialMean).toBeCloseTo(28.9983333333);
  expect(evidence.mismatch).toBe(true);
  expect(evidence.summaries[0].sourceRow).toBe(4);
  expect(evidence.summaries[0].row['Min. Time']).toBe('25.82');
  expect(evidence.trials[5].seconds).toBe(25.29);
  expect(summaryEvidence('C1G0001:PRE_TEST:10').mismatch).toBe(false);
  expect(summaryEvidence('missing')).toMatchObject({ trialMean: null, publishedMean: null });
});
