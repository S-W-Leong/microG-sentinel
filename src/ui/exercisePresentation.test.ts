import { describe, expect, it } from 'vitest';
import { createExerciseStore, evaluateWorkspace } from '../exercise/store';
import { buildStageReadings, getPreparedReview, getEpisodeProgress } from './exercisePresentation';

describe('exercise evidence presentation', () => {
  it('shows recorded baselines for a missing-only current value without inventing a comparison', () => {
    const store = createExerciseStore(null);
    const w = store.getSnapshot();
    const rows = buildStageReadings(w.data, evaluateWorkspace(w).comparison);
    const row = rows.find((r) => r.workloadW === 100)!;
    expect(row.baselineRange).toEqual([125, 126]);
    expect(row.baselineMean).toBe(125.5);
    expect(row.currentBpm).toBeNull();
    expect(row.deltaBpm).toBeNull();
    expect(row.state).toBe('insufficient');
  });

  it('withholds plotted baselines and differences when protocols are incompatible', () => {
    const store = createExerciseStore(null);
    store.selectScenario('mismatch');
    const w = store.getSnapshot();
    const rows = buildStageReadings(w.data, evaluateWorkspace(w).comparison);
    expect(rows.every((r) => r.baselineRange === null && r.baselineMean === null)).toBe(true);
    expect(rows.every((r) => r.deltaBpm === null && r.state === 'incompatible')).toBe(true);
    expect(rows.map((r) => r.currentBpm)).toEqual([107, 127, 157]);
  });
});

describe('prepared review presentation', () => {
  it('previews the actual frozen packet and marks it stale after schedule changes', () => {
    const store = createExerciseStore(null);
    expect(getPreparedReview(store.getSnapshot())).toBeNull();
    store.prepare();
    const review = getPreparedReview(store.getSnapshot())!;
    expect(review.current).toBe(true);
    expect(review.text).toContain('100 W: current missing bpm');
    expect(review.text).toContain('Prepared locally; no transmission or receipt claimed.');
    store.setAvailability('DEMO-missing-hr-op-0', false);
    const stale = getPreparedReview(store.getSnapshot())!;
    expect(stale.current).toBe(false);
    expect(stale.text).toBe(review.text);
    store.prepare();
    expect(getPreparedReview(store.getSnapshot())?.current).toBe(true);
  });

  it('keeps the evidence snapshot current when a human records a response', () => {
    const store = createExerciseStore(null);
    store.prepare();
    store.recordResponse('Synthetic review response');
    expect(getPreparedReview(store.getSnapshot())?.current).toBe(true);
  });

  it('handles an invalid stored packet without crashing the workspace', () => {
    const w = createExerciseStore(null).getSnapshot();
    expect(getPreparedReview({ ...w, reviews: ['not-json'] })).toBeNull();
    expect(getPreparedReview({ ...w, reviews: ['{}'] })).toBeNull();
  });
});

describe('episode progress', () => {
  it('does not mark collection complete when symptoms bypass it for review', () => {
    const store = createExerciseStore(null);
    store.selectScenario('symptoms');
    store.requestReview();
    store.prepare();
    expect(getEpisodeProgress(store.getSnapshot())).toEqual([
      'complete',
      'skipped',
      'skipped',
      'current',
    ]);
  });
  it('marks collection complete only after an actual linked observation', () => {
    const store = createExerciseStore(null);
    store.accept(store.getSnapshot().revision);
    expect(getEpisodeProgress(store.getSnapshot())).toEqual([
      'complete',
      'current',
      'pending',
      'pending',
    ]);
    store.capture(store.getSnapshot().revision);
    store.prepare();
    expect(getEpisodeProgress(store.getSnapshot())).toEqual([
      'complete',
      'complete',
      'complete',
      'current',
    ]);
  });
});
