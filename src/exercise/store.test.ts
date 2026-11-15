import { it, expect } from 'vitest';
import { createExerciseStore } from './store';
it('keeps a stable snapshot, persists episodes and refuses stale acceptance', () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  const s = createExerciseStore(storage);
  expect(s.getSnapshot()).toBe(s.getSnapshot());
  const old = s.getSnapshot();
  s.setAvailability(old.opportunities[0].id, false);
  expect(() => s.accept(old.revision)).toThrow('stale');
  s.requestReview();
  expect(createExerciseStore(storage).getSnapshot().reviewRequested).toBe(true);
  expect(s.getSnapshot().baseline).toEqual(old.baseline);
});
it('preserves corrupt storage until explicit reset', () => {
  let raw = '{broken';
  const s = createExerciseStore({
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
    removeItem: () => {
      raw = '';
    },
  });
  expect(s.getSnapshot().notice).toContain('recovery');
  s.requestReview();
  expect(raw).toBe('{broken');
});
it('requires a current prepared review before recording a response', () => {
  const s = createExerciseStore(null);
  s.prepare();
  s.setAvailability(s.getSnapshot().opportunities[0].id, false);
  expect(() => s.recordResponse('Reviewed')).toThrow('current prepared review');
});
it('retains a prepared episode while switching demonstration series', () => {
  const s = createExerciseStore(null);
  s.prepare();
  const baseline = s.getSnapshot().baseline;
  s.selectScenario('complete');
  s.selectScenario('missing-hr');
  expect(s.getSnapshot().reviews).toHaveLength(1);
  expect(s.getSnapshot().baseline).toEqual(baseline);
});
