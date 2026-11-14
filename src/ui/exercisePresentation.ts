import type { ExerciseDataset, SessionComparison, StageComparison } from '../exercise/types';
import { evaluateWorkspace, type ExerciseWorkspace } from '../exercise/store';
import { renderExerciseReviewText } from '../exercise/reviewPacket';

export type StageReading = {
  id: string;
  workloadW: number | null;
  durationSec: number | null;
  baselineRange: readonly [number, number] | null;
  baselineMean: number | null;
  currentBpm: number | null;
  deltaBpm: number | null;
  state: StageComparison['state'];
  issues: readonly string[];
  limits: readonly string[];
};

export function buildStageReadings(
  data: ExerciseDataset,
  comparison: SessionComparison,
): StageReading[] {
  return comparison.stages.map((c) => {
    const stage = data.stages.find((s) => s.id === c.targetStageId);
    // The engine preserves the recorded baselines even when current HR is missing.
    // Expose those records only when that is the sole unresolved comparison issue.
    const missingOnly =
      c.issues.length > 0 &&
      c.issues.every((issue) => issue === 'Missing current HR') &&
      c.baselineValues.length >= 2;
    const range =
      c.baselineRangeBpm ??
      (missingOnly
        ? ([Math.min(...c.baselineValues), Math.max(...c.baselineValues)] as const)
        : null);
    return {
      id: c.targetStageId,
      workloadW: stage?.context.workloadW ?? null,
      durationSec: stage?.context.durationSec ?? null,
      baselineRange: range,
      baselineMean:
        c.baselineMeanBpm ??
        (missingOnly
          ? c.baselineValues.reduce((sum, n) => sum + n, 0) / c.baselineValues.length
          : null),
      currentBpm: c.currentBpm,
      deltaBpm: c.deltaBpm,
      state: c.state,
      issues: c.issues,
      limits: c.limits,
    };
  });
}

export function getPreparedReview(w: ExerciseWorkspace) {
  const json = w.reviews[w.reviews.length - 1];
  if (!json) return null;
  try {
    const text = renderExerciseReviewText(json);
    const packet = JSON.parse(json);
    const current =
      JSON.stringify(packet.baseline) === JSON.stringify(w.baseline) &&
      JSON.stringify(packet.observations) === JSON.stringify(w.data) &&
      JSON.stringify(packet.history) === JSON.stringify(w.history) &&
      JSON.stringify(packet.opportunities) === JSON.stringify(w.opportunities) &&
      JSON.stringify(packet.evaluation) === JSON.stringify(evaluateWorkspace(w));
    return { json, text, current, preparedAt: String(packet.exportedAt) };
  } catch {
    return null;
  }
}

export const evidenceLabel: Record<StageComparison['state'], string> = {
  comparable: 'Comparable observation',
  'outside-baseline-range': 'Outside observed range',
  insufficient: 'Evidence incomplete',
  incompatible: 'Comparison withheld',
};

export function getEpisodeProgress(
  w: ExerciseWorkspace,
): readonly ('complete' | 'current' | 'pending' | 'skipped')[] {
  const plan = evaluateWorkspace(w).plan;
  const collected = w.history.length > 1;
  const accepted = w.acceptedRevision === w.revision;
  const reviewing =
    plan.state === 'review' || ['prepared-for-transfer', 'response-recorded'].includes(w.status);
  const skipped = !collected && !accepted && plan.state !== 'planned';
  return [
    accepted || collected || reviewing ? 'complete' : 'current',
    collected ? 'complete' : accepted ? 'current' : skipped ? 'skipped' : 'pending',
    collected ? (reviewing ? 'complete' : 'current') : skipped ? 'skipped' : 'pending',
    reviewing ? 'current' : 'pending',
  ];
}

export function opportunityTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return `${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)} · ${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)} UTC`;
}
