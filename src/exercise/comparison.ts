import type {
  ExerciseDataset,
  ComparisonPolicy,
  SessionComparison,
  StageContext,
  StageComparison,
  EvidenceGap,
  ExerciseScope,
} from './types';
export const sameScope = (a: ExerciseScope, b: ExerciseScope) =>
  a.source === b.source && a.subjectId === b.subjectId && a.seriesId === b.seriesId;
export const sameContext = (a: StageContext, b: StageContext) =>
  a.deviceId === b.deviceId &&
  a.protocolId === b.protocolId &&
  a.posture === b.posture &&
  a.stageIndex === b.stageIndex &&
  a.workloadW === b.workloadW &&
  a.durationSec === b.durationSec &&
  JSON.stringify(a.precedingStages) === JSON.stringify(b.precedingStages);
export const completeContext = (c: StageContext) =>
  !!c.deviceId &&
  !!c.protocolId &&
  !!c.posture &&
  c.stageIndex !== null &&
  c.workloadW !== null &&
  c.workloadW > 0 &&
  c.durationSec !== null &&
  c.precedingStages !== null;
export function compareSession(
  data: ExerciseDataset,
  targetId: string,
  baselineIds: readonly string[],
  policy: ComparisonPolicy,
): SessionComparison {
  const target = data.sessions.find((s) => s.id === targetId);
  const scope = target?.scope ?? {
    source: 'simulated-crew',
    subjectId: 'unknown',
    seriesId: 'unknown',
  };
  const gaps: EvidenceGap[] = [];
  const stages = data.stages
    .filter((s) => s.sessionId === targetId && !s.duplicateOf)
    .map((s) => {
      const research =
        policy === 'research-descriptive-v1' &&
        scope.source === 'nasa-research-replay' &&
        !!target?.researchBasisId;
      const issues: string[] = [];
      const base = data.sessions.filter((b) => baselineIds.includes(b.id));
      const candidates = base.map((b) =>
        data.stages.find(
          (p) =>
            p.sessionId === b.id && !p.duplicateOf && p.context.workloadW === s.context.workloadW,
        ),
      );
      let incompatible = false;
      if (
        !target ||
        (!research && (scope.source !== 'simulated-crew' || policy !== 'crew-demo-v1'))
      )
        issues.push('Source and comparison policy do not permit this comparison');
      if (base.length !== new Set(baselineIds).size || base.length < 2)
        issues.push('Two independent baseline sessions required');
      for (const [i, b] of base.entries()) {
        const p = candidates[i];
        if (
          !sameScope(scope, b.scope) ||
          !b.isBaseline ||
          !b.date ||
          !target?.date ||
          b.date > target.date
        ) {
          issues.push('Baseline identity, series or timing is incompatible');
          incompatible = true;
        }
        if (!p) {
          issues.push('Missing matched baseline stage');
          continue;
        }
        for (const key of [
          'deviceId',
          'protocolId',
          'posture',
          'stageIndex',
          'workloadW',
          'durationSec',
          'precedingStages',
        ] as const) {
          if (
            p.context[key] !== null &&
            s.context[key] !== null &&
            JSON.stringify(p.context[key]) !== JSON.stringify(s.context[key])
          ) {
            issues.push(`Incompatible ${key}`);
            incompatible = true;
          }
        }
        if (!research && (!completeContext(p.context) || p.quality.state !== 'usable'))
          issues.push('Baseline metadata or quality needs review');
        if (p.hrBpm === null) issues.push('Missing baseline HR');
      }
      if (!s.context.workloadW || !s.context.durationSec)
        issues.push('Active workload and duration required');
      if (!research && (!completeContext(s.context) || s.quality.state !== 'usable'))
        issues.push('Current metadata or quality needs review');
      if (s.hrBpm === null) issues.push('Missing current HR');
      for (const original of [s, ...candidates.filter((p) => p !== undefined)])
        if (
          data.stages.some(
            (p) =>
              p.duplicateOf === original.id &&
              (p.hrBpm !== original.hrBpm || !sameContext(p.context, original.context)),
          )
        ) {
          issues.push('Conflicting alternative representation');
          incompatible = true;
        }
      const values = candidates
        .map((p) => p?.hrBpm)
        .filter((v): v is number => v !== null && v !== undefined);
      const allowed = issues.length === 0;
      const mean = allowed ? values.reduce((a, b) => a + b / values.length, 0) : null;
      const range: readonly [number, number] | null = allowed
        ? [Math.min(...values), Math.max(...values)]
        : null;
      const out: StageComparison = {
        targetStageId: s.id,
        state: incompatible
          ? 'incompatible'
          : !allowed
            ? 'insufficient'
            : s.hrBpm! < range![0] || s.hrBpm! > range![1]
              ? 'outside-baseline-range'
              : 'comparable',
        basis: research ? 'qualified-research' : 'strict',
        baselineSessionIds: base.map((b) => b.id),
        baselineValues: values,
        baselineMeanBpm: mean,
        baselineRangeBpm: range,
        currentBpm: s.hrBpm,
        deltaBpm: mean === null ? null : s.hrBpm! - mean,
        issues,
        limits: [
          'Observed baseline range is not a confidence interval or clinical threshold.',
          ...(research
            ? [
                'Qualified laboratory comparison; device/protocol/posture and signal quality remain incompletely documented.',
              ]
            : []),
        ],
      };
      if (issues.length)
        gaps.push({
          id: `gap-${s.id}`,
          kind: incompatible
            ? 'record-conflict'
            : completeContext(s.context) &&
                (s.hrBpm === null || s.quality.state === 'unusable') &&
                issues.every(
                  (issue) =>
                    issue === 'Missing current HR' ||
                    issue === 'Current metadata or quality needs review',
                )
              ? 'new-observation'
              : 'historical-metadata',
          recordId: s.id,
          requiredContext: completeContext(s.context) ? s.context : null,
          requiredFields: ['hrBpm'],
          reason: issues.join('; '),
        });
      return out;
    });
  if (!stages.length)
    gaps.push({
      id: `missing-${targetId}`,
      kind: 'historical-metadata',
      recordId: targetId,
      requiredContext: null,
      requiredFields: [],
      reason: 'No stage records available',
    });
  return {
    scope,
    targetSessionId: targetId,
    stages,
    gaps,
    symptoms: target?.symptoms ?? [],
    outsideRangeStageIds: stages
      .filter((s) => s.state === 'outside-baseline-range')
      .map((s) => s.targetStageId),
    independentFollowUpSessionIds: target && !target.isBaseline ? [target.id] : [],
  };
}
