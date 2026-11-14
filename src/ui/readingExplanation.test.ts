import { describe, expect, it } from 'vitest';
import { explainReading } from './readingExplanation';
import type { StageReading } from './exercisePresentation';

const reading: StageReading = {
  id: 'example',
  workloadW: 100,
  durationSec: 180,
  baselineRange: [125, 126],
  baselineMean: 125.5,
  currentBpm: 127,
  deltaBpm: 1.5,
  state: 'outside-baseline-range',
  issues: [],
  limits: [],
};

describe('plain-language reading explanations', () => {
  it('explains the size and direction of measured change without diagnosing it', () => {
    expect(explainReading(reading)).toBe('1.5 bpm higher than your baseline average.');
    expect(explainReading({ ...reading, deltaBpm: -2 })).toBe(
      '2 bpm lower than your baseline average.',
    );
    expect(explainReading({ ...reading, deltaBpm: 0 })).toBe('The same as your baseline average.');
  });
  it('does not interpret a missing reading as a change', () => {
    expect(
      explainReading({ ...reading, currentBpm: null, deltaBpm: null, state: 'insufficient' }),
    ).toBe('No reading recorded. There is no change to calculate yet.');
  });
  it('withholds interpretations of incompatible and insufficient evidence', () => {
    expect(explainReading({ ...reading, state: 'incompatible' })).toBe(
      'The test conditions do not match. These readings cannot be compared.',
    );
    expect(explainReading({ ...reading, state: 'insufficient', deltaBpm: null })).toBe(
      'More matching baseline evidence is needed before comparing.',
    );
  });
});
