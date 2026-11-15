import { nasaExercise } from '../../exercise/data/nasa';
import { compareSession } from '../../exercise/comparison';
import { getRecords } from '../../ui/dataSource';
import { trend } from '../../logic/assess';
import type { Unit } from '../../types';
import { adaptVo2 } from './model';

export const researchOccasions = nasaExercise.sessions.filter((s) => !s.isBaseline);
export const mr080gUrl =
  'https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS';

// Date-only archival records stay outside the timed crew vector and exercise store.
export function compareResearch(sessionId: string, workloadW: number, unit: Unit) {
  const session = researchOccasions.find((s) => s.id === sessionId);
  if (!session || !['L/min', 'mL/kg/min'].includes(unit))
    throw new Error('Select a bundled NASA occasion and VO2peak unit');
  const baselines = nasaExercise.sessions.filter((s) => s.isBaseline);
  const comparison = compareSession(
    nasaExercise,
    session.id,
    baselines.map((s) => s.id),
    'research-descriptive-v1',
  );
  const stage = nasaExercise.stages.find(
    (s) => s.sessionId === session.id && s.context.workloadW === workloadW,
  );
  const selected = comparison.stages.find((s) => s.targetStageId === stage?.id);
  if (!stage || !selected) throw new Error('Select a recorded NASA workload');
  const records = getRecords().filter(
    (r) =>
      r.source === session.scope.source &&
      r.subjectId === session.scope.subjectId &&
      r.metric === 'VO2peak' &&
      r.unit === unit,
  );
  const report = records.find((r) => r.date === session.date && !r.duplicateOf && !r.isBaseline);
  const vo2 = report ? adaptVo2(records, report.id) : null;
  return {
    source: 'nasa-research-replay' as const,
    simulated: false,
    datasetUrl: mr080gUrl,
    session,
    baselines,
    stage,
    currentStages: nasaExercise.stages.filter((s) => s.sessionId === session.id),
    selected,
    comparison,
    // The chart and exported inputs use the exact same unit-specific series.
    records,
    vo2,
    points: trend(records, session.scope.subjectId),
    baselineStages: nasaExercise.stages.filter((s) => baselines.some((b) => b.id === s.sessionId)),
    missingReadings: nasaExercise.stages
      .filter((s) => s.sessionId === session.id && !s.duplicateOf)
      .reduce((n, s) => n + Number(s.hrBpm === null) + Number(s.rpe === null), 0),
    limits: [
      'Descriptive bed-rest research comparison; no prospective crew recommendation.',
      'Two pre-bed-rest tests are averaged as a demonstration assumption, not a NASA-approved baseline rule.',
      'Exercise stages and VO2peak reports are separate source records; exact observation times are unknown.',
      ...selected.limits,
    ],
  };
}
