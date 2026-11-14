import type { ExerciseDataset, SessionComparison, ObservationPlan } from './types';
export function renderExerciseReviewText(json: string): string {
  const p = JSON.parse(json) as {
    transferState: string;
    source: string;
    exportedAt: string;
    baseline: ExerciseDataset;
    observations: ExerciseDataset;
    history: string[];
    evaluation: { comparison: SessionComparison; plan: ObservationPlan };
    limits: string[];
  };
  if (p.transferState !== 'prepared-locally' || !Array.isArray(p.evaluation?.comparison?.stages))
    throw new Error('Invalid prepared review');
  return [
    'MicroG Sentinel — Exercise review',
    'Prepared locally; no transmission or receipt claimed.',
    `Source: ${p.source}`,
    `Prepared: ${p.exportedAt}`,
    `Frozen baseline: ${p.baseline.sessions.map((s) => s.id).join(', ')}`,
    `Observation history: ${p.history.join(', ')}`,
    '',
    ...p.evaluation.comparison.stages.map((c) => {
      const stage = p.observations.stages.find((s) => s.id === c.targetStageId);
      return `${stage?.context.workloadW ?? 'Unknown'} W: current ${c.currentBpm ?? 'missing'} bpm; baseline ${c.baselineRangeBpm?.join('–') ?? 'unavailable'} bpm; difference ${c.deltaBpm ?? 'withheld'} bpm. Evidence: ${c.state}. ${c.issues.join('; ')}`;
    }),
    '',
    `Next step: ${p.evaluation.plan.reasons.join(' ')}`,
    ...p.evaluation.comparison.symptoms,
    ...p.limits,
  ].join('\n');
}
