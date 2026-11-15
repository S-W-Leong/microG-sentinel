import { it, expect } from 'vitest';
import { createCrewScenario } from './data/scenarios';
import { compareSession } from './comparison';
import { planObservations } from './planner';
it('replans when availability changes and never schedules historical repair', () => {
  const s = createCrewScenario('missing-hr');
  const comparison = compareSession(
    s.dataset,
    s.targetSessionId,
    s.baselineSessionIds,
    'crew-demo-v1',
  );
  const input = {
    scope: comparison.scope,
    nowISO: s.nowISO,
    policy: 'crew-demo-v1' as const,
    gaps: comparison.gaps,
    opportunities: s.opportunities,
    symptomsReported: false,
    reviewRequested: false,
  };
  expect(planObservations(input).selectedIds).toEqual([s.opportunities[0].id]);
  expect(
    planObservations({
      ...input,
      opportunities: s.opportunities.map((o, i) => ({ ...o, available: i === 1 })),
    }).selectedIds,
  ).toEqual([s.opportunities[1].id]);
  expect(
    planObservations({
      ...input,
      gaps: comparison.gaps.map((g) => ({ ...g, kind: 'historical-metadata' as const })),
    }).state,
  ).toBe('unresolved');
  expect(planObservations({ ...input, symptomsReported: true }).state).toBe('review');
});
it('chooses the exact cheapest full cover rather than a greedy candidate', () => {
  const s = createCrewScenario('missing-hr');
  const scope = s.dataset.sessions[0].scope;
  const contexts = s.opportunities[0].segments.map((s) => s.context);
  const gaps = contexts.map((c, i) => ({
    id: String(i),
    kind: 'new-observation' as const,
    recordId: String(i),
    requiredContext: c,
    requiredFields: ['hrBpm' as const],
    reason: 'demo',
  }));
  const op = (id: string, indexes: number[], cost: number) => ({
    ...s.opportunities[0],
    id,
    additionalCrewActions: cost,
    segments: indexes.map((i) => ({ context: contexts[i], provides: ['hrBpm' as const] })),
  });
  const input = {
    scope,
    nowISO: s.nowISO,
    policy: 'crew-demo-v1' as const,
    gaps,
    opportunities: [op('X', [0, 1], 3), op('Y', [2], 1), op('Z', [0], 1), op('W', [1, 2], 1)],
    symptomsReported: false,
    reviewRequested: false,
  };
  expect(planObservations(input).selectedIds).toEqual(['W', 'Z']);
  expect(
    planObservations({ ...input, opportunities: [...input.opportunities].reverse() }).selectedIds,
  ).toEqual(['W', 'Z']);
  expect(planObservations({ ...input, nowISO: '2027-01-01T00:00:00Z' }).state).toBe('unresolved');
});
