import { evaluateWorkspace, type ExerciseWorkspace } from '../exercise/store';
import { buildStageReadings } from './exercisePresentation';

export const walkthroughSteps = [
  { id: 'read', label: 'Explore readings' },
  { id: 'plan', label: 'Try a follow-up' },
  { id: 'compare', label: 'See what changed' },
  { id: 'review', label: 'Save your review' },
] as const;
export type WalkthroughStep = (typeof walkthroughSteps)[number]['id'];

export function getWalkthroughStep(hash: string): WalkthroughStep {
  const id = hash.split('/')[2];
  return walkthroughSteps.find((step) => step.id === id)?.id ?? 'read';
}

export function getObservationChanges(w: ExerciseWorkspace) {
  const originalId = w.history[0];
  const originalStages = w.data.stages.filter((stage) => stage.sessionId === originalId);
  const readings = buildStageReadings(w.data, evaluateWorkspace(w).comparison);
  return {
    hasFollowUp: originalId !== w.activeSessionId,
    rows: readings.map((row) => ({
      ...row,
      beforeBpm:
        originalStages.find((stage) => stage.context.workloadW === row.workloadW)?.hrBpm ?? null,
    })),
  };
}
