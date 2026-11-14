import { expect, it } from 'vitest';
import { nasaExercise } from './nasa';
it('curates four occasions and twelve non-peak stages', () => {
  expect(nasaExercise.sessions).toHaveLength(4);
  expect(nasaExercise.stages).toHaveLength(12);
  expect(
    nasaExercise.stages.filter((s) => s.context.workloadW === 100).map((s) => s.hrBpm),
  ).toEqual([125, 124, 166, 139]);
  expect(nasaExercise.sessions[2].symptoms.join(' ')).toContain('dizziness');
});
