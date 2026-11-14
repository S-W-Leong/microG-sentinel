import type { MoodSignals, Rating03, RiskEvaluationContext, RiskSignalRecord } from '../types';
import {
  booleanInput,
  crew,
  day,
  finish,
  inputStore,
  instant,
  numberIn,
  observationTime,
  reviewEscalation,
  validDate,
} from '../cardio/support';

export interface MoodInput extends MoodSignals {
  recordedAt: string;
  selfHarm: boolean | null;
  phq9: (Rating03 | null)[];
  baselineStart: string;
  baselineEnd: string;
}

export const moodStore = inputStore<MoodInput>();
export const emptyMood = (recordedAt: string): MoodInput => ({
  recordedAt,
  mood: null,
  stress: null,
  workload: null,
  isolation: null,
  crewConflict: null,
  selfHarm: null,
  phq9: Array<null>(9).fill(null),
  baselineStart: '',
  baselineEnd: '',
});

export function phqTotal(items: MoodInput['phq9']): number | null {
  return items.length === 9 && items.every((item) => item !== null)
    ? items.reduce<number>((total, item) => total + (item ?? 0), 0)
    : null;
}

export function phqBand(total: number): string {
  numberIn(total, 'PHQ-9 total', 0, 27, true);
  return total < 5
    ? 'Minimal'
    : total < 10
      ? 'Mild'
      : total < 15
        ? 'Moderate'
        : total < 20
          ? 'Moderately severe'
          : 'Severe';
}

export function isUrgent(input: MoodInput): boolean {
  return input.selfHarm === true || (input.phq9[8] ?? 0) > 0;
}

export function dailyHistory(history: MoodInput[]): MoodInput[] {
  const days = new Map<string, MoodInput>();
  for (const input of [...history].sort((left, right) =>
    left.recordedAt.localeCompare(right.recordedAt),
  )) {
    days.set(input.recordedAt.slice(0, 10), input);
  }
  return [...days.values()];
}

export function moodBaseline(
  input: MoodInput,
  history: MoodInput[],
): { value: number; count: number; min: number; max: number } | null {
  if (
    !validDate(input.baselineStart) ||
    !validDate(input.baselineEnd) ||
    input.baselineStart > input.baselineEnd ||
    input.baselineEnd >= input.recordedAt.slice(0, 10)
  )
    return null;
  const values = dailyHistory(history)
    .filter((entry) => {
      const date = entry.recordedAt.slice(0, 10);
      return date >= input.baselineStart && date <= input.baselineEnd && !isUrgent(entry);
    })
    .map((entry) => entry.mood)
    .filter((value): value is number => value !== null);
  if (values.length < 3) return null;
  return {
    value: values.reduce((total, value) => total + value, 0) / values.length,
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function saveMood(ctx: RiskEvaluationContext, input: MoodInput): RiskSignalRecord<'mood'> {
  const person = crew(ctx);
  const saved = structuredClone(input);
  saved.recordedAt = observationTime(person, saved.recordedAt);
  for (const key of ['mood', 'stress', 'workload', 'isolation'] as const)
    numberIn(saved[key], key, 0, 10, true);
  booleanInput(saved.crewConflict, 'Crew conflict');
  booleanInput(saved.selfHarm, 'Self-harm');
  if (saved.phq9.length !== 9) throw new Error('Nine screener responses required');
  saved.phq9.forEach((value) => numberIn(value, 'Screener response', 0, 3, true));
  if (
    (saved.baselineStart || saved.baselineEnd) &&
    (!validDate(saved.baselineStart) ||
      !validDate(saved.baselineEnd) ||
      saved.baselineStart > saved.baselineEnd ||
      saved.baselineEnd >= saved.recordedAt.slice(0, 10))
  ) {
    throw new Error('Baseline window must end before this check-in');
  }
  const { mood, stress, workload, isolation, crewConflict } = saved;
  const record: RiskSignalRecord<'mood'> = {
    risk: 'mood',
    crewId: ctx.crewId,
    recordedAt: saved.recordedAt,
    source: person.source,
    simulated: person.simulated,
    signals: { mood, stress, workload, isolation, crewConflict },
  };
  moodStore.save(ctx, saved, record);
  return record;
}

export function sleepContext(ctx: RiskEvaluationContext) {
  const sleep = ctx.vector.getSignals('sleep', ctx.crewId, 24);
  const exposures = ctx.vector.getExposures(ctx.crewId, 24);
  return {
    debt: exposures?.sleepDebtHours ?? null,
    fatigue: sleep?.signals.fatigueSamnPerelli ?? null,
  };
}

export function evaluateMood(ctx: RiskEvaluationContext, draft?: MoodInput) {
  const person = crew(ctx);
  const input = draft ?? moodStore.current(ctx);
  const history = moodStore.history(ctx);
  const baseline = input ? moodBaseline(input, history) : null;
  const value = input?.mood != null && baseline ? input.mood - baseline.value : null;
  const total = input ? phqTotal(input.phq9) : null;
  const recent = input
    ? dailyHistory(history)
        .filter((entry) => entry.recordedAt <= input.recordedAt)
        .slice(-3)
    : [];
  const sleep = sleepContext(ctx);
  const persistent =
    baseline !== null &&
    recent.length === 3 &&
    recent.every(
      (entry) =>
        entry.mood !== null &&
        entry.recordedAt.slice(0, 10) > input!.baselineEnd &&
        (entry.mood < baseline.min || entry.mood > baseline.max),
    ) &&
    sleep.debt === null &&
    sleep.fatigue === null;
  return finish(ctx, {
    risk: 'mood',
    crewId: ctx.crewId,
    kind: 'change-vs-baseline',
    value,
    unit: 'score/10',
    label: 'Mood vs your baseline',
    reasons: [],
    evidence: value === null ? 'insufficient' : 'supported',
    simulated: person.simulated,
    escalation: reviewEscalation({
      urgent: input !== null && isUrgent(input),
      indicative: total !== null && total >= 10,
      persistent,
      incomplete:
        input !== null &&
        [input.mood, input.stress, input.workload, input.isolation, input.crewConflict].includes(
          null,
        ),
      checkIns: dailyHistory(history).length,
    }),
  });
}

export function moodSample(now: string): MoodInput[] {
  const end = instant(now) - 3_600_000;
  const start = new Date(end - 13 * day).toISOString().slice(0, 10);
  const baselineEnd = new Date(end - 7 * day).toISOString().slice(0, 10);
  return Array.from({ length: 14 }, (_, index) => ({
    ...emptyMood(new Date(end - (13 - index) * day).toISOString()),
    mood: index < 9 ? 7 : 7 - (index - 8),
    stress: index < 9 ? 2 : 7,
    workload: index < 9 ? 4 : 9,
    isolation: index < 9 ? 2 : 5,
    crewConflict: false,
    selfHarm: false,
    baselineStart: index >= 7 ? start : '',
    baselineEnd: index >= 7 ? baselineEnd : '',
  }));
}
