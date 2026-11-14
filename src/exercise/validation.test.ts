import { it, expect } from 'vitest';
import { validateExerciseDataset } from './validation';
import { nasaExercise } from './data/nasa';
it('validates source-backed stages and rejects orphan records', () => {
  expect(validateExerciseDataset(nasaExercise).ok).toBe(true);
  expect(validateExerciseDataset({ ...nasaExercise, sessions: [] }).ok).toBe(false);
});
it('rejects non-finite HR and duplicate IDs', () => {
  const first = nasaExercise.stages[0];
  expect(
    validateExerciseDataset({ ...nasaExercise, stages: [{ ...first, hrBpm: Infinity }] }).ok,
  ).toBe(false);
  expect(validateExerciseDataset({ ...nasaExercise, stages: [first, first] }).ok).toBe(false);
});
it('rejects malformed untrusted shapes', () => {
  for (const value of [null, {}, { sessions: [null], stages: [] }, { sessions: [], stages: [{}] }])
    expect(validateExerciseDataset(value).ok).toBe(false);
});
