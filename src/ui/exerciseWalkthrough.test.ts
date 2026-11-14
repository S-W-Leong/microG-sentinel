import { describe, expect, it } from 'vitest';
import { createExerciseStore } from '../exercise/store';
import { getWalkthroughStep, getObservationChanges } from './exerciseWalkthrough';

describe('walkthrough navigation', () => {
  it('opens read by default and preserves valid deep links', () => {
    expect(getWalkthroughStep('#/')).toBe('read');
    expect(getWalkthroughStep('#/exercise')).toBe('read');
    expect(getWalkthroughStep('#/exercise/unknown')).toBe('read');
    expect(getWalkthroughStep('#/exercise/compare')).toBe('compare');
    expect(getWalkthroughStep('#/exercise/review')).toBe('review');
  });
});

describe('before and after observation evidence', () => {
  it('does not manufacture a follow-up before one is linked', () => {
    const w = createExerciseStore(null).getSnapshot();
    const changes = getObservationChanges(w);
    expect(changes.hasFollowUp).toBe(false);
    expect(changes.rows.find((r) => r.workloadW === 100)?.beforeBpm).toBeNull();
    expect(changes.rows.find((r) => r.workloadW === 100)?.currentBpm).toBeNull();
  });
  it('keeps original missing values and baseline alongside actual synthetic follow-up readings', () => {
    const store = createExerciseStore(null);
    store.accept(store.getSnapshot().revision);
    store.capture(store.getSnapshot().revision);
    const changes = getObservationChanges(store.getSnapshot());
    expect(changes.hasFollowUp).toBe(true);
    expect(changes.rows.find((r) => r.workloadW === 100)).toMatchObject({
      beforeBpm: null,
      currentBpm: 145,
      baselineMean: 125.5,
      deltaBpm: 19.5,
    });
    expect(changes.rows.find((r) => r.workloadW === 50)?.beforeBpm).toBe(107);
  });
  it('keeps incompatible comparisons withheld', () => {
    const store = createExerciseStore(null);
    store.selectScenario('mismatch');
    expect(
      getObservationChanges(store.getSnapshot()).rows.every(
        (r) => r.deltaBpm === null && r.state === 'incompatible',
      ),
    ).toBe(true);
  });
});
