import { it, expect } from 'vitest';
import { evaluateSoftwareCases } from './evaluation';
import { createCrewScenario } from './data/scenarios';
import { compareSession } from './comparison';
it('compares equivalent coverage and does not reward unsafe bypass', () => {
  const s = createCrewScenario('missing-hr');
  const c = compareSession(s.dataset, s.targetSessionId, s.baselineSessionIds, 'crew-demo-v1');
  const input = {
    scope: c.scope,
    nowISO: s.nowISO,
    policy: 'crew-demo-v1' as const,
    gaps: c.gaps,
    opportunities: s.opportunities,
    symptomsReported: false,
    reviewRequested: false,
  };
  const [r, bypass] = evaluateSoftwareCases([
    { id: 'demo', input, fixedChecklistOpportunityIds: s.opportunities.map((o) => o.id) },
    {
      id: 'symptoms',
      input: { ...input, symptomsReported: true },
      fixedChecklistOpportunityIds: [],
    },
  ]);
  expect(r.comparable).toBe(true);
  expect(r.planner.additionalCrewActions).toBe(1);
  expect(r.fixedChecklist.additionalCrewActions).toBe(3);
  expect(bypass.comparable).toBe(false);
});
