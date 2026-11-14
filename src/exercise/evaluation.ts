import type { PlanInput } from './types';
import { planObservations, evaluateOpportunitySelection } from './planner';
export type SoftwareCase = {
  id: string;
  input: PlanInput;
  fixedChecklistOpportunityIds: readonly string[];
};
export function evaluateSoftwareCases(cases: readonly SoftwareCase[]) {
  return cases.map((c) => {
    const p = planObservations(c.input);
    const bypass = ['review', 'research-only'].includes(p.state);
    const evaluate = (ids: readonly string[]) => {
      const r = evaluateOpportunitySelection(c.input, ids);
      const feasible = !bypass && r.eligible && !r.unmetGapIds.length;
      return {
        feasible,
        uncoveredGapIds: r.unmetGapIds,
        additionalCrewActions: feasible ? r.totalAdditionalCrewActions : null,
        bypassed: bypass,
      };
    };
    const planner = evaluate(p.selectedIds);
    const fixedChecklist = evaluate(c.fixedChecklistOpportunityIds);
    return {
      caseId: c.id,
      planner,
      fixedChecklist,
      comparable: planner.feasible && fixedChecklist.feasible,
    };
  });
}
