import type { Assessment } from '../../types';
import type { ExerciseScope } from '../../exercise/types';
import { evaluateWorkspace, type ExerciseWorkspace } from '../../exercise/store';
import { validateExerciseDataset } from '../../exercise/validation';
import { assess } from '../../logic/assess';
import type { CardioSignals, RiskEvaluationContext, VectorApi } from '../types';
import {
  booleanInput,
  crew,
  finish,
  inputStore,
  numberIn,
  observationTime,
  reviewEscalation,
  utc,
} from './support';

export const cardioFlags = {
  chest: 'Chest pain or pressure',
  fainting: 'Fainting or near-fainting',
  stopped: 'Test stopped for dizziness or breathlessness',
  palpitations: 'Palpitations at rest',
};
export interface CardioInput {
  recordedAt: string;
  view: 'exercise' | 'vo2';
  workspace: ExerciseWorkspace | null;
  stageId: string | null;
  exerciseObservedAt: string | null;
  assessments: Assessment[];
  assessmentId: string | null;
  vo2ObservedAt: string | null;
  restingHrBpm: number | null;
  restingPosture: 'seated' | 'supine' | null;
  completedMinutes: number | null;
  plannedMinutes: number | null;
  exerciseWindowComplete: boolean;
  flags: Record<keyof typeof cardioFlags, boolean | null>;
}
export const cardioStore = inputStore<CardioInput>();
const views = new WeakMap<VectorApi, Map<string, CardioInput['view']>>();
export function selectCardioView(ctx: RiskEvaluationContext, view: CardioInput['view']) {
  crew(ctx);
  let people = views.get(ctx.vector);
  if (!people) {
    people = new Map();
    views.set(ctx.vector, people);
  }
  people.set(ctx.crewId, view);
  cardioStore.notifySelection(ctx);
}
export function emptyCardio(recordedAt: string): CardioInput {
  return {
    recordedAt,
    view: 'exercise',
    workspace: null,
    stageId: null,
    exerciseObservedAt: null,
    assessments: [],
    assessmentId: null,
    vo2ObservedAt: null,
    restingHrBpm: null,
    restingPosture: null,
    completedMinutes: null,
    plannedMinutes: null,
    exerciseWindowComplete: false,
    flags: { chest: null, fainting: null, stopped: null, palpitations: null },
  };
}
export function cardioIdentity(
  scope: ExerciseScope | { source: Assessment['source']; subjectId: string; seriesId: string },
) {
  if (scope.source === 'nasa-research-replay')
    return `RESEARCH:MR080G:${scope.subjectId}:${scope.seriesId}`;
  if (scope.source === 'user-entered') return `USER:${scope.subjectId}:${scope.seriesId}`;
  return `${scope.subjectId.startsWith('SIM-') ? scope.subjectId : `SIM-${scope.subjectId}`}:${scope.seriesId}`;
}
export function adaptExercise(workspace: ExerciseWorkspace, stageId: string) {
  if (
    !validateExerciseDataset(workspace.data).ok ||
    !validateExerciseDataset(workspace.baseline).ok
  )
    throw new Error('Invalid exercise workspace');
  const { comparison, plan } = evaluateWorkspace(workspace);
  const target = workspace.data.stages.find(
    (x) => x.id === stageId && x.sessionId === workspace.activeSessionId,
  );
  const stage = comparison.stages.find((x) => x.targetStageId === stageId);
  const session = workspace.data.sessions.find((x) => x.id === workspace.activeSessionId);
  if (!target || !stage || !session) throw new Error('Select a stage from the active session');
  const delta =
    stage.state === 'comparable' || stage.state === 'outside-baseline-range'
      ? stage.deltaBpm
      : null;
  const workload = numberIn(target.context.workloadW, 'Workload', 0, 2000);
  numberIn(delta, 'HR delta', -300, 300);
  const rpe = target.rpeScale === 'borg-6-20' ? target.rpe : null;
  numberIn(rpe, 'Borg effort', 6, 20, true);
  const missingReadingsCount = workspace.data.stages
    .filter((x) => x.sessionId === session.id && !x.duplicateOf)
    .reduce((sum, x) => sum + Number(x.hrBpm === null) + Number(x.rpe === null), 0);
  const conflict =
    stage.state === 'incompatible' ||
    stage.issues.some((x) => /conflict|contradict|identity|mismatch/i.test(x));
  return {
    signals: {
      workloadW: workload,
      hrDeltaBpmAtWorkload: delta,
      borgRpe: rpe,
      missingReadingsCount,
    },
    evidence: conflict
      ? ('conflicting' as const)
      : delta === null
        ? ('insufficient' as const)
        : ('supported' as const),
    comparison,
    plan,
    session,
    stage,
  };
}
export function adaptVo2(records: Assessment[], assessmentId: string) {
  const record = records.find((x) => x.id === assessmentId);
  if (!record) throw new Error('Assessment not found');
  const result = assess(records, assessmentId);
  return {
    record,
    result,
    value:
      record.metric === 'VO2peak' && result.evidence === 'supported'
        ? (result.calculation?.retainedPct ?? null)
        : null,
  };
}
function calculateCardio(ctx: RiskEvaluationContext, input: CardioInput) {
  const person = crew(ctx),
    recordedAt = observationTime(person, input.recordedAt);
  if (!['exercise', 'vo2'].includes(input.view)) throw new Error('Choose exercise or VO2');
  for (const flag of Object.keys(cardioFlags) as (keyof typeof cardioFlags)[])
    booleanInput(input.flags[flag], flag);
  numberIn(input.restingHrBpm, 'Resting HR', Number.MIN_VALUE, 300);
  if (input.restingPosture !== null && !['seated', 'supine'].includes(input.restingPosture))
    throw new Error('Invalid resting posture');
  if (input.restingHrBpm !== null && input.restingPosture === null)
    throw new Error('Resting posture required');
  numberIn(input.completedMinutes, 'Completed minutes', 0, 1440);
  numberIn(input.plannedMinutes, 'Planned minutes', Number.MIN_VALUE, 1440);
  if (typeof input.exerciseWindowComplete !== 'boolean')
    throw new Error('Confirm exercise window coverage');
  const load =
    input.exerciseWindowComplete && input.completedMinutes !== null && input.plannedMinutes !== null
      ? (100 * input.completedMinutes) / input.plannedMinutes
      : null;
  numberIn(load, 'Exercise load', 0, 500);
  const exercise =
    input.workspace && input.stageId ? adaptExercise(input.workspace, input.stageId) : null;
  if (
    exercise &&
    (cardioIdentity(exercise.session.scope) !== ctx.crewId ||
      exercise.session.scope.source !== person.source)
  )
    throw new Error('Exercise identity/source does not match this registered series');
  if (!Array.isArray(input.assessments)) throw new Error('Assessments must be an array');
  const vo2 = input.assessmentId ? adaptVo2(input.assessments, input.assessmentId) : null;
  if (
    vo2 &&
    (cardioIdentity({ ...vo2.record, seriesId: vo2.record.comparisonGroupId ?? 'default' }) !==
      ctx.crewId ||
      vo2.record.source !== person.source)
  )
    throw new Error('VO2 identity/source does not match this registered series');
  for (const [time, date] of [
    [input.exerciseObservedAt, exercise?.session.date],
    [input.vo2ObservedAt, vo2?.record.date],
  ]) {
    if (time !== null && time !== undefined) {
      observationTime(person, time);
      if (!date || time.slice(0, 10) !== date)
        throw new Error('Documented observation time must match the source date');
    }
  }
  const sameExerciseTime =
    input.exerciseObservedAt !== null && utc(input.exerciseObservedAt) === recordedAt;
  const sameVo2Time = input.vo2ObservedAt !== null && utc(input.vo2ObservedAt) === recordedAt;
  const signals: CardioSignals = {
    workloadW: sameExerciseTime ? (exercise?.signals.workloadW ?? null) : null,
    hrDeltaBpmAtWorkload: sameExerciseTime
      ? (exercise?.signals.hrDeltaBpmAtWorkload ?? null)
      : null,
    vo2PeakPctBaseline: sameVo2Time ? (vo2?.value ?? null) : null,
    exerciseLoadPct: load,
    restingHrBpm: input.restingHrBpm,
    borgRpe: sameExerciseTime ? (exercise?.signals.borgRpe ?? null) : null,
    missingReadingsCount: sameExerciseTime
      ? (exercise?.signals.missingReadingsCount ?? null)
      : null,
  };
  return { signals, exercise, vo2 };
}
export function saveCardio(ctx: RiskEvaluationContext, input: CardioInput) {
  const person = crew(ctx),
    recordedAt = observationTime(person, input.recordedAt),
    { signals } = calculateCardio(ctx, input);
  cardioStore.save(
    ctx,
    { ...input, recordedAt },
    {
      risk: 'cardio',
      crewId: ctx.crewId,
      source: person.source,
      simulated: person.simulated,
      recordedAt,
      signals,
    },
  );
}
export function evaluateCardio(ctx: RiskEvaluationContext) {
  const person = crew(ctx),
    input = cardioStore.current(ctx),
    result = input ? calculateCardio(ctx, input) : null;
  const vo2View = (views.get(ctx.vector)?.get(ctx.crewId) ?? input?.view) === 'vo2';
  const value = vo2View
    ? (result?.vo2?.value ?? null)
    : (result?.exercise?.signals.hrDeltaBpmAtWorkload ?? null);
  const evidence =
    (vo2View ? result?.vo2?.result.evidence : result?.exercise?.evidence) ?? 'insufficient';
  const history = cardioStore
    .history(ctx)
    .filter((x) => !input || x.recordedAt <= input.recordedAt);
  const recent = history.slice(-3);
  const persistent =
    recent.length === 3 &&
    new Set(recent.map((x) => x.workspace?.activeSessionId)).size === 3 &&
    recent.every((x) => {
      const r = x.workspace && x.stageId ? adaptExercise(x.workspace, x.stageId) : null;
      return (
        r?.stage.state === 'outside-baseline-range' &&
        r.signals.workloadW === result?.exercise?.signals.workloadW
      );
    });
  const recordedStop =
    result?.exercise?.session.symptoms.some((x) =>
      /dizz|breathless|faint|chest|palpitation/i.test(x),
    ) ?? false;
  return finish(ctx, {
    risk: 'cardio',
    crewId: ctx.crewId,
    kind: 'change-vs-baseline',
    value,
    unit: vo2View ? '%' : 'bpm',
    label: vo2View ? 'VO2peak baseline retained' : 'HR change at workload',
    reasons: [],
    evidence:
      evidence === 'conflicting' ? 'conflicting' : value === null ? 'insufficient' : 'supported',
    simulated: person.simulated,
    escalation: reviewEscalation({
      urgent: (!!input && Object.values(input.flags).includes(true)) || recordedStop,
      conflicting: evidence === 'conflicting',
      incomplete:
        value === null ||
        [
          result?.exercise?.signals.borgRpe ?? null,
          result?.exercise?.signals.missingReadingsCount ?? null,
          input?.restingHrBpm ?? null,
          result?.vo2?.value ?? null,
        ].includes(null),
      checkIns: history.length,
      persistent,
      indicative: result?.vo2?.result.reference.state === 'below',
    }),
  });
}
