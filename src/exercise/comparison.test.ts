import { it, expect } from 'vitest';
import { nasaExercise } from './data/nasa';
import { compareSession } from './comparison';
it('describes NASA changes while refusing strict prospective interpretation', () => {
  const ids = nasaExercise.sessions.slice(0, 2).map((s) => s.id);
  const target = nasaExercise.sessions[2].id;
  const result = compareSession(nasaExercise, target, ids, 'research-descriptive-v1');
  expect(result.stages[1]).toMatchObject({
    baselineMeanBpm: 124.5,
    baselineRangeBpm: [124, 125],
    currentBpm: 166,
    deltaBpm: 41.5,
    basis: 'qualified-research',
  });
  expect(
    compareSession(nasaExercise, target, ids, 'crew-demo-v1').stages.every(
      (s) => s.deltaBpm === null,
    ),
  ).toBe(true);
});
it('does not schedule replacement HR as a repair for absent baseline history', async () => {
  const { createCrewScenario } = await import('./data/scenarios');
  const s = createCrewScenario('missing-hr');
  const result = compareSession(s.dataset, s.targetSessionId, [], 'crew-demo-v1');
  expect(result.gaps.every((g) => g.kind !== 'new-observation')).toBe(true);
});
