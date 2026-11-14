import type { RiskEvaluationContext, SleepSignals } from '../types';
import {
  booleanInput,
  crew,
  day,
  finish,
  hour,
  inputStore,
  instant,
  numberIn,
  observationTime,
  rangeOutside,
  reviewEscalation,
  textInput,
} from '../cardio/support';

export interface Interval {
  start: string;
  end: string;
}
export type SleepStage = 'awake' | 'REM' | 'light' | 'deep' | 'unknown';
export interface StageInterval extends Interval {
  stage: SleepStage;
  movement: number | null;
}
export interface SleepInput {
  recordedAt: string;
  mode: 'manual' | 'wearable';
  start: string | null;
  end: string | null;
  latencyMinutes: number | null;
  awakeMinutes: number | null;
  naps: Interval[];
  complete: boolean;
  sleepinessKarolinska: number | null;
  fatigueSamnPerelli: number | null;
  planned: Interval | null;
  duty: Interval | null;
  baselineMidpointHourUtc: number | null;
  comparisonGroupId: string | null;
  observedSleepRange: [number, number] | null;
  criticalTaskSleep: boolean | null;
  deviceId: string | null;
  timezone: string | null;
  movementUnit: string | null;
  stages: StageInterval[];
}
export const sleepStore = inputStore<SleepInput>();
export function emptySleep(recordedAt: string): SleepInput {
  return {
    recordedAt,
    mode: 'manual',
    start: null,
    end: null,
    latencyMinutes: null,
    awakeMinutes: null,
    naps: [],
    complete: false,
    sleepinessKarolinska: null,
    fatigueSamnPerelli: null,
    planned: null,
    duty: null,
    baselineMidpointHourUtc: null,
    comparisonGroupId: null,
    observedSleepRange: null,
    criticalTaskSleep: null,
    deviceId: null,
    timezone: null,
    movementUnit: null,
    stages: [],
  };
}
export function sleepSample(): SleepInput[] {
  return [12, 13, 14].map((date, index) => ({
    ...emptySleep(`2026-11-${date}T11:00:00.000Z`),
    start: `2026-11-${date}T00:00:00Z`,
    end: `2026-11-${date}T08:00:00Z`,
    latencyMinutes: 30,
    awakeMinutes: index === 0 ? 120 : 90,
    complete: true,
    planned: { start: `2026-11-${date}T00:00:00Z`, end: `2026-11-${date}T08:00:00Z` },
    duty: { start: `2026-11-${date}T08:00:00Z`, end: `2026-11-${date}T16:00:00Z` },
    sleepinessKarolinska: 6,
    fatigueSamnPerelli: 5,
    criticalTaskSleep: false,
    comparisonGroupId: 'SIM-CDR-MISSION-01',
  }));
}
function interval(value: Interval, windowEnd?: number): [number, number] {
  const start = instant(value.start),
    end = instant(value.end);
  if (end <= start || end - start > day)
    throw new Error('Interval must be positive and at most 24 hours');
  if (windowEnd !== undefined && (start < windowEnd - day || end > windowEnd))
    throw new Error('Sleep interval is outside the 24-hour window');
  return [start, end];
}
function validateAndHours(input: SleepInput) {
  const time = instant(input.recordedAt);
  if (!['manual', 'wearable'].includes(input.mode)) throw new Error('Choose an input method');
  if (typeof input.complete !== 'boolean') throw new Error('Confirm window coverage');
  numberIn(input.sleepinessKarolinska, 'KSS', 1, 9, true);
  numberIn(input.fatigueSamnPerelli, 'Fatigue', 1, 7, true);
  numberIn(input.latencyMinutes, 'Sleep latency', 0, 1440);
  numberIn(input.awakeMinutes, 'Awake time', 0, 1440);
  numberIn(input.baselineMidpointHourUtc, 'Baseline midpoint', 0, 24 - Number.EPSILON * 24);
  booleanInput(input.criticalTaskSleep, 'Critical-task sleep');
  textInput(input.comparisonGroupId, 'Comparison series');
  if (!Array.isArray(input.naps) || !Array.isArray(input.stages))
    throw new Error('Intervals must be arrays');
  const main =
    input.start !== null && input.end !== null
      ? interval({ start: input.start, end: input.end }, time)
      : null;
  if (input.start !== null) instant(input.start);
  if (input.end !== null) instant(input.end);
  const naps = input.naps.map((x) => interval(x, time));
  const all = [...(main ? [main] : []), ...naps].sort((a, b) => a[0] - b[0]);
  if (all.some((x, i) => i > 0 && x[0] < all[i - 1][1]))
    throw new Error('Sleep episodes overlap; remove duplicate copies');
  const napHours = naps.reduce((sum, x) => sum + (x[1] - x[0]) / hour, 0);
  const inBed = main ? (main[1] - main[0]) / hour + napHours : null;
  let sleepHours: number | null = null;
  if (
    input.mode === 'manual' &&
    main &&
    input.latencyMinutes !== null &&
    input.awakeMinutes !== null
  ) {
    const losses = (input.latencyMinutes + input.awakeMinutes) / 60;
    if (losses > (main[1] - main[0]) / hour)
      throw new Error('Latency and awake time exceed time in bed');
    sleepHours = (main[1] - main[0]) / hour - losses + napHours;
  }
  if (input.mode === 'wearable') {
    if (!input.deviceId?.trim() || !input.timezone?.trim())
      throw new Error('Wearable device and timezone required');
    if (input.stages.some((x) => x.movement !== null) && !input.movementUnit?.trim())
      throw new Error('Movement units required');
    const spans = input.stages
      .map((x) => {
        const times = interval(x, time);
        if (!['awake', 'REM', 'light', 'deep', 'unknown'].includes(x.stage))
          throw new Error('Unknown stage label');
        numberIn(x.movement, 'Movement', 0);
        if (!main || times[0] < main[0] || times[1] > main[1])
          throw new Error('Stage outside main sleep episode');
        return { times, stage: x.stage };
      })
      .sort((a, b) => a.times[0] - b.times[0]);
    if (spans.some((x, i) => i > 0 && x.times[0] < spans[i - 1].times[1]))
      throw new Error('Wearable stages overlap');
    const covered =
      main &&
      spans.length > 0 &&
      spans[0].times[0] === main[0] &&
      spans[spans.length - 1].times[1] === main[1] &&
      spans.every(
        (x, i) => x.stage !== 'unknown' && (i === 0 || x.times[0] === spans[i - 1].times[1]),
      );
    if (covered)
      sleepHours = spans
        .filter((x) => x.stage !== 'awake')
        .reduce((sum, x) => sum + (x.times[1] - x.times[0]) / hour, napHours);
  } else if (input.stages.length) throw new Error('Manual entries cannot supply wearable stages');
  if (input.duty) interval(input.duty);
  let shift: number | null = null;
  if (input.planned) {
    const [start, end] = interval(input.planned);
    if (input.baselineMidpointHourUtc !== null) {
      const midpoint = ((start + (end - start) / 2) / hour) % 24;
      shift = ((((midpoint - input.baselineMidpointHourUtc + 12) % 24) + 24) % 24) - 12;
      if (shift === -12) shift = 12;
    }
  }
  rangeOutside(sleepHours, input.observedSleepRange);
  return {
    sleepHours,
    efficiency:
      sleepHours !== null && inBed !== null && inBed > 0 ? (100 * sleepHours) / inBed : null,
    shift,
  };
}
export function calculateSleep(input: SleepInput, history: SleepInput[]) {
  const current = validateAndHours(input);
  const end = instant(input.recordedAt);
  const all = [...history.filter((x) => instant(x.recordedAt) !== end), input];
  const windows = [2, 1, 0].map((offset) => {
    const binEnd = end - offset * day;
    // Complete rolling windows must align exactly; an arbitrary check-in cannot certify coverage.
    const observation = all.find((x) => instant(x.recordedAt) === binEnd && x.complete);
    return observation ? validateAndHours(observation).sleepHours : null;
  });
  const completeDays = windows.filter((x) => x !== null).length;
  const debt =
    completeDays === 3 ? windows.reduce<number>((sum, x) => sum + Math.max(0, 8 - x!), 0) : null;
  const signals: SleepSignals = {
    sleepHours: current.sleepHours,
    sleepEfficiencyPct: current.efficiency,
    sleepDebtHours: debt,
    sleepinessKarolinska: input.sleepinessKarolinska,
    fatigueSamnPerelli: input.fatigueSamnPerelli,
    bodyClockShiftHours: current.shift,
  };
  return { signals, completeDays };
}
export function saveSleep(ctx: RiskEvaluationContext, input: SleepInput) {
  const person = crew(ctx),
    recordedAt = observationTime(person, input.recordedAt);
  const { signals } = calculateSleep(input, sleepStore.history(ctx));
  sleepStore.save(
    ctx,
    { ...input, recordedAt },
    {
      risk: 'sleep',
      crewId: ctx.crewId,
      source: person.source,
      simulated: person.simulated,
      recordedAt,
      signals,
    },
  );
}
export function evaluateSleep(ctx: RiskEvaluationContext) {
  const person = crew(ctx),
    input = sleepStore.current(ctx),
    history = sleepStore.history(ctx);
  const raw = input ? calculateSleep(input, history).signals : null;
  const baselines = person.baselines.entries.filter(
    (x) =>
      x.metric === 'sleepHours' &&
      x.contextKey === 'default' &&
      x.methodId === `sleep-${input?.mode}-v1` &&
      x.comparisonGroupId === input?.comparisonGroupId &&
      x.source === person.source,
  );
  const baseline = baselines.length === 1 ? baselines[0] : null;
  const conflicting = baselines.length > 1 || baseline?.evidence === 'conflicting';
  const valid =
    baseline?.evidence === 'supported' &&
    baseline.value !== null &&
    Number.isFinite(baseline.value) &&
    baseline.value >= 0 &&
    baseline.value <= 24 &&
    baseline.count >= 1 &&
    baseline.count === new Set(baseline.sourceSessionIds).size &&
    baseline.unit === 'h' &&
    baseline.recordedAt !== null &&
    !!input &&
    instant(baseline.recordedAt) < instant(input.recordedAt);
  const value =
    !conflicting && valid && raw?.sleepHours !== null && raw?.sleepHours !== undefined
      ? raw.sleepHours - baseline!.value!
      : null;
  const recent = input ? history.filter((x) => x.recordedAt <= input.recordedAt).slice(-3) : [];
  const persistent =
    recent.length === 3 &&
    recent.every((x) => rangeOutside(validateAndHours(x).sleepHours, x.observedSleepRange));
  return finish(ctx, {
    risk: 'sleep',
    crewId: ctx.crewId,
    kind: 'change-vs-baseline',
    unit: 'h',
    value,
    label: 'Sleep change vs baseline',
    reasons: [],
    simulated: person.simulated,
    evidence: conflicting ? 'conflicting' : value === null ? 'insufficient' : 'supported',
    escalation: reviewEscalation({
      urgent: input?.criticalTaskSleep === true,
      conflicting,
      incomplete:
        !raw ||
        [
          raw.sleepHours,
          raw.sleepEfficiencyPct,
          raw.sleepinessKarolinska,
          raw.fatigueSamnPerelli,
          raw.bodyClockShiftHours,
        ].includes(null),
      checkIns: recent.length,
      persistent,
    }),
  });
}
