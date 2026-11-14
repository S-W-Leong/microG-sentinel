import type {
  ExerciseDataset,
  ExerciseScope,
  ObservationOpportunity,
  StageContext,
} from '../types';
export type ScenarioVariant =
  'missing-hr' | 'complete' | 'mismatch' | 'no-opportunity' | 'symptoms';
export type CrewScenario = {
  id: string;
  dataset: ExerciseDataset;
  baselineSessionIds: readonly string[];
  targetSessionId: string;
  opportunities: readonly ObservationOpportunity[];
  nowISO: string;
};
export function createCrewScenario(variant: ScenarioVariant): CrewScenario {
  const scope: ExerciseScope = {
    source: 'simulated-crew',
    subjectId: 'DEMO-CREW',
    seriesId: variant,
  };
  const prefix = `DEMO-${variant}`;
  const refs = [{ path: 'synthetic', locator: variant, note: 'Fictional demonstration inputs' }];
  const sessions = [0, 1, 2].map((i) => ({
    id: `${prefix}-${i}`,
    scope,
    date: `2026-11-${10 + i}`,
    isBaseline: i < 2,
    researchBasisId: null,
    symptoms: i === 2 && variant === 'symptoms' ? ['Reported symptoms; request review'] : [],
    notes: [],
    sourceRefs: refs,
  }));
  const stages = sessions.flatMap((s, i) =>
    [50, 100, 150].map((w, j) => ({
      id: `${s.id}-S${j + 1}`,
      sessionId: s.id,
      context: {
        deviceId: 'DEMO-CYCLE',
        protocolId: i === 2 && variant === 'mismatch' ? 'OTHER' : 'DEMO-PROTOCOL',
        posture: 'seated' as const,
        stageIndex: j + 1,
        workloadW: w,
        durationSec: 180,
        precedingStages: [50, 100, 150]
          .slice(0, j)
          .map((workloadW) => ({ workloadW, durationSec: 180 })),
      },
      hrBpm:
        i === 2 &&
        j === 1 &&
        variant !== 'complete' &&
        variant !== 'symptoms' &&
        variant !== 'mismatch'
          ? null
          : [105, 125, 155][j] + i,
      rpe: 11,
      rpeScale: 'borg-6-20' as const,
      quality: { state: 'usable' as const, basis: 'Synthetic assertion' },
      duplicateOf: null,
      sourceRefs: refs,
    })),
  );
  const opportunities: ObservationOpportunity[] = [0, 1].map((i) => ({
    id: `${prefix}-op-${i}`,
    scope,
    plannedSessionId: `${prefix}-planned-${i}`,
    scheduledAt: `2026-11-${14 + i}T09:00:00Z`,
    prescribed: true,
    available: variant !== 'no-opportunity',
    segments: stages
      .filter((s) => s.sessionId === sessions[0].id)
      .map((s) => ({ context: s.context, provides: ['hrBpm', 'rpe'] })),
    additionalCrewActions: i + 1,
    effortBasis: 'Demonstration action count, not measured crew time',
  }));
  return {
    id: variant,
    dataset: { sessions, stages },
    baselineSessionIds: sessions.slice(0, 2).map((s) => s.id),
    targetSessionId: sessions[2].id,
    opportunities,
    nowISO: '2026-11-14T08:00:00Z',
  };
}
export function createDemoCapture(
  opportunity: ObservationOpportunity,
  captureId: string,
): ExerciseDataset {
  if (
    opportunity.scope.source !== 'simulated-crew' ||
    !opportunity.available ||
    !opportunity.prescribed
  )
    throw new Error('Only an available prescribed demonstration opportunity can be captured');
  const refs = [
    { path: 'synthetic', locator: opportunity.id, note: 'Generated demonstration data' },
  ];
  return {
    sessions: [
      {
        id: captureId,
        scope: opportunity.scope,
        date: opportunity.scheduledAt.slice(0, 10),
        isBaseline: false,
        researchBasisId: null,
        symptoms: [],
        notes: [],
        sourceRefs: refs,
      },
    ],
    stages: opportunity.segments.map(({ context }, i) => {
      const hr = ({ 50: 120, 100: 145, 150: 165 } as Record<number, number>)[context.workloadW!];
      if (!hr) throw new Error('Unsupported demonstration workload');
      return {
        id: `${captureId}-S${i + 1}`,
        sessionId: captureId,
        context: structuredClone(context) as StageContext,
        hrBpm: hr,
        rpe: 11,
        rpeScale: 'borg-6-20',
        quality: { state: 'usable', basis: 'Generated demonstration data' },
        duplicateOf: null,
        sourceRefs: refs,
      };
    }),
  };
}
