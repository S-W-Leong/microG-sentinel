import type { PlanInput, ObservationPlan } from './types';
import { sameContext, sameScope, completeContext } from './comparison';
export function evaluateOpportunitySelection(input: PlanInput, selectedIds: readonly string[]) {
  const rejected: { opportunityId: string; reasons: string[] }[] = [];
  const covered = new Set<string>();
  let cost = 0;
  let completionAt: string | null = null;
  for (const id of selectedIds) {
    const o = input.opportunities.find((o) => o.id === id);
    const reasons: string[] = [];
    if (!o) {
      rejected.push({ opportunityId: id, reasons: ['Unknown opportunity'] });
      continue;
    }
    if (!sameScope(o.scope, input.scope) || !o.prescribed || !o.available)
      reasons.push('Opportunity is not available in this prescribed series');
    if (
      !Number.isFinite(Date.parse(o.scheduledAt)) ||
      Date.parse(o.scheduledAt) < Date.parse(input.nowISO)
    )
      reasons.push('Opportunity has expired or its date is invalid');
    if (
      !Number.isInteger(o.additionalCrewActions) ||
      o.additionalCrewActions < 0 ||
      !o.effortBasis.trim()
    )
      reasons.push('Effort must be explicitly documented');
    if (!o.segments.length || o.segments.some((s) => !completeContext(s.context)))
      reasons.push('Missing prescribed stage context');
    if (reasons.length) {
      rejected.push({ opportunityId: id, reasons });
      continue;
    }
    cost += o.additionalCrewActions;
    if (!completionAt || o.scheduledAt > completionAt) completionAt = o.scheduledAt;
    for (const g of input.gaps)
      if (
        g.kind === 'new-observation' &&
        g.requiredContext &&
        o.segments.some(
          (s) =>
            sameContext(s.context, g.requiredContext!) &&
            g.requiredFields.every((f) => s.provides.includes(f)),
        )
      )
        covered.add(g.id);
  }
  return {
    eligible: rejected.length === 0 && new Set(selectedIds).size === selectedIds.length,
    coveredGapIds: [...covered],
    unmetGapIds: input.gaps.filter((g) => !covered.has(g.id)).map((g) => g.id),
    rejected,
    totalAdditionalCrewActions: cost,
    completionAt,
  };
}
export function planObservations(input: PlanInput): ObservationPlan {
  const empty: ObservationPlan = {
    state: 'unresolved',
    selectedIds: [],
    coverage: [],
    unmetGapIds: input.gaps.map((g) => g.id),
    rejected: [],
    totalAdditionalCrewActions: 0,
    completionAt: null,
    reasons: [],
    policyVersion: 'exercise-demo-v1',
  };
  if (input.scope.source === 'nasa-research-replay')
    return {
      ...empty,
      state: 'research-only',
      reasons: ['Research replay has no prospective crew recommendation'],
    };
  if (input.symptomsReported || input.reviewRequested)
    return {
      ...empty,
      state: 'review',
      reasons: ['Review requested; collection optimization bypassed'],
    };
  if (
    input.policy !== 'crew-demo-v1' ||
    !Number.isFinite(Date.parse(input.nowISO)) ||
    input.opportunities.length > 16 ||
    input.gaps.length > 12 ||
    new Set(input.opportunities.map((o) => o.id)).size !== input.opportunities.length ||
    new Set(input.gaps.map((g) => g.id)).size !== input.gaps.length
  )
    return { ...empty, reasons: ['Invalid or over-limit planning input'] };
  if (!input.gaps.length)
    return {
      ...empty,
      state: 'none-needed',
      unmetGapIds: [],
      reasons: ['Existing evidence needs no additional collection'],
    };
  const eligible = input.opportunities
    .filter((o) => evaluateOpportunitySelection(input, [o.id]).eligible)
    .sort((a, b) => a.id.localeCompare(b.id));
  const rejected = input.opportunities.flatMap(
    (o) => evaluateOpportunitySelection(input, [o.id]).rejected,
  );
  let best: { ids: string[]; cost: number; completion: string | null } | null = null;
  for (let bits = 1; bits < 2 ** eligible.length; bits++) {
    const ids = eligible.filter((_, i) => bits & (1 << i)).map((o) => o.id);
    const r = evaluateOpportunitySelection(input, ids);
    if (r.unmetGapIds.length) continue;
    if (
      !best ||
      r.totalAdditionalCrewActions < best.cost ||
      (r.totalAdditionalCrewActions === best.cost &&
        (ids.length < best.ids.length ||
          (ids.length === best.ids.length &&
            ((r.completionAt ?? '') < (best.completion ?? '') ||
              (r.completionAt === best.completion && ids.join('\0') < best.ids.join('\0'))))))
    )
      best = { ids, cost: r.totalAdditionalCrewActions, completion: r.completionAt };
  }
  if (!best)
    return {
      ...empty,
      rejected,
      reasons: ['No eligible full cover. Unresolved records remain available for review.'],
    };
  const ids = best.ids;
  return {
    ...empty,
    state: 'planned',
    selectedIds: ids,
    unmetGapIds: [],
    totalAdditionalCrewActions: best.cost,
    completionAt: best.completion,
    rejected: [
      ...rejected,
      ...eligible
        .filter((o) => !ids.includes(o.id))
        .map((o) => ({
          opportunityId: o.id,
          reasons: ['Not needed by the minimum-action full cover'],
        })),
    ],
    coverage: input.gaps.map((g) => ({
      gapId: g.id,
      opportunityId: ids.find(
        (id) =>
          evaluateOpportunitySelection({ ...input, gaps: [g] }, [id]).unmetGapIds.length === 0,
      )!,
    })),
    reasons: ['Collect the missing measurements during an already prescribed cycling session.'],
  };
}
