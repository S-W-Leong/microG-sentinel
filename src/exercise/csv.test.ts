import { expect, it } from 'vitest';
import { parseExerciseCsv, exerciseCsvHeader } from './csv';
it('preserves blank HR and rejects malformed numeric input', () => {
  const row =
    's,p,g,2026-11-14,false,d,protocol,seated,stage,1,100,180,,11,borg-6-20,usable,Demo,,Note';
  expect(parseExerciseCsv(exerciseCsvHeader + '\n' + row).dataset.stages[0].hrBpm).toBeNull();
  expect(
    parseExerciseCsv(exerciseCsvHeader + '\n' + row.replace('100,180,', 'NaN,180,')).canCommit,
  ).toBe(false);
});
