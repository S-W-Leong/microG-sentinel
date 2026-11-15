import type { BalanceSignals, RiskEvaluation, RiskEvaluationContext, Rating03 } from '../types';
import {
  booleanInput,
  crew,
  inputStore,
  instant,
  numberIn,
  observationTime,
  rangeOutside,
  reviewEscalation,
} from '../cardio/support';

export type Condition = 'eyes-open' | 'eyes-closed';
export interface Sample {
  seconds: number;
  pitch: number;
  roll: number;
}
export interface StandTest {
  condition: Condition;
  mode: 'live' | 'replay';
  acquisition: 'orientation' | 'gravity' | 'synthetic';
  permission: 'granted' | 'denied' | 'unavailable';
  deviceId: string;
  protocolId: string;
  posture: 'standing-chest';
  gravity: 'ground' | 'partial-gravity';
  duration: number;
  complete: boolean;
  samples: Sample[];
}
export const balanceFlags = {
  headStrike: 'Fall with head strike',
  persistentVertigo: 'Vertigo that does not settle at rest',
  weakness: 'New weakness or numbness',
};
export interface BalanceInput {
  recordedAt: string;
  comparisonGroupId: string;
  tests: Partial<Record<Condition, StandTest>>;
  dizziness: number | null;
  motionSickness: number | null;
  misc: number | null;
  headMovementTolerance: Rating03 | null;
  flags: Record<keyof typeof balanceFlags, boolean | null>;
  observedClosedRange: [number, number] | null;
  demoBaseline: boolean;
}
export const balanceStore = inputStore<BalanceInput>();
export function emptyBalance(recordedAt: string): BalanceInput {
  return {
    recordedAt,
    comparisonGroupId: '',
    tests: {},
    dizziness: null,
    motionSickness: null,
    misc: null,
    headMovementTolerance: null,
    flags: { headStrike: null, persistentVertigo: null, weakness: null },
    observedClosedRange: null,
    demoBaseline: false,
  };
}
export function centredSamples(samples: Sample[]): Sample[] {
  const unwrapped: Sample[] = [];
  samples.forEach((sample, index) => {
    numberIn(sample.seconds, 'Sample time', 0);
    numberIn(sample.pitch, 'Pitch', -180, 180);
    numberIn(sample.roll, 'Roll', -180, 180);
    if (index && sample.seconds <= samples[index - 1].seconds)
      throw new Error('Sample times must increase');
    const previous = unwrapped[index - 1];
    const unwrap = (angle: number, prior: number) =>
      prior + (((((angle - prior) % 360) + 540) % 360) - 180);
    unwrapped.push({
      ...sample,
      pitch: previous ? unwrap(sample.pitch, previous.pitch) : sample.pitch,
      roll: previous ? unwrap(sample.roll, previous.roll) : sample.roll,
    });
  });
  const mean = (key: 'pitch' | 'roll') =>
    unwrapped.reduce((sum, sample) => sum + sample[key], 0) / (samples.length || 1);
  const pitch = mean('pitch'),
    roll = mean('roll');
  return unwrapped.map((sample) => ({
    ...sample,
    pitch: sample.pitch - pitch,
    roll: sample.roll - roll,
  }));
}
export function ellipse(samples: Sample[]) {
  const points = centredSamples(samples);
  if (points.length < 3) return null;
  const variance = (first: 'pitch' | 'roll', second: 'pitch' | 'roll') =>
    points.reduce((sum, point) => sum + point[first] * point[second], 0) / (points.length - 1);
  const xx = variance('roll', 'roll'),
    yy = variance('pitch', 'pitch'),
    xy = variance('roll', 'pitch');
  const spread = Math.sqrt((xx - yy) ** 2 + 4 * xy ** 2);
  return {
    area: Math.PI * 5.991 * Math.sqrt(Math.max(0, xx * yy - xy * xy)),
    major: Math.sqrt(5.991 * Math.max(0, (xx + yy + spread) / 2)),
    minor: Math.sqrt(5.991 * Math.max(0, (xx + yy - spread) / 2)),
    angle: (Math.atan2(2 * xy, xx - yy) * 90) / Math.PI,
    points,
  };
}
export function contextKey(test: StandTest) {
  return JSON.stringify({
    device: test.deviceId,
    orientation: 'portrait',
    posture: test.posture,
    protocol: test.protocolId,
    gravity: test.gravity,
    acquisition: test.acquisition,
  });
}
export function testArea(test: StandTest | undefined) {
  if (!test) return null;
  numberIn(test.duration, 'Duration', 0, 30);
  const shape = ellipse(test.samples);
  if (test.samples.some((sample) => sample.seconds > test.duration))
    throw new Error('Sample outside test duration');
  if (!test.complete || test.duration !== 30 || test.samples.length < 3) return null;
  const area = shape!.area;
  return Number.isFinite(area) && area <= 32400 ? area : null;
}
export function replayTest(
  condition: Condition,
  area = condition === 'eyes-closed' ? 4.2 : 1.4,
): StandTest {
  const samples = Array.from({ length: 301 }, (_, index) => ({
    seconds: index / 10,
    pitch: Math.sin((index * Math.PI) / 15),
    roll: Math.cos((index * Math.PI) / 15) * 1.4,
  }));
  const scale = Math.sqrt(area / ellipse(samples)!.area);
  return {
    condition,
    mode: 'replay',
    acquisition: 'synthetic',
    permission: 'unavailable',
    deviceId: 'demo-tablet',
    protocolId: 'stand-30-v1',
    posture: 'standing-chest',
    gravity: 'ground',
    duration: 30,
    complete: true,
    samples: samples.map((sample) => ({
      ...sample,
      pitch: sample.pitch * scale,
      roll: sample.roll * scale,
    })),
  };
}
export function balanceSample(recordedAt = '2026-11-14T11:00:00.000Z'): BalanceInput {
  return {
    ...emptyBalance(recordedAt),
    comparisonGroupId: 'SIM-CDR-MISSION-01',
    tests: { 'eyes-open': replayTest('eyes-open'), 'eyes-closed': replayTest('eyes-closed') },
    dizziness: 3,
    motionSickness: 4,
    misc: 2,
    headMovementTolerance: 2,
    flags: { headStrike: false, persistentVertigo: false, weakness: false },
    demoBaseline: true,
  };
}
export function baselineFor(ctx: RiskEvaluationContext, input: BalanceInput, condition: Condition) {
  const person = crew(ctx),
    test = input.tests[condition];
  if (!test) return { value: null, conflicting: false, demo: false };
  const metric = condition === 'eyes-open' ? 'swayAreaEyesOpenDeg2' : 'swayAreaEyesClosedDeg2';
  const candidates = person.baselines.entries.filter(
    (entry) =>
      entry.metric === metric &&
      entry.comparisonGroupId === input.comparisonGroupId &&
      entry.contextKey === contextKey(test) &&
      entry.methodId === 'covariance-95-v1' &&
      entry.source === person.source,
  );
  const baseline = candidates[0];
  const conflicting = candidates.length > 1 || baseline?.evidence === 'conflicting';
  const valid =
    !conflicting &&
    baseline?.evidence === 'supported' &&
    baseline.value !== null &&
    Number.isFinite(baseline.value) &&
    baseline.value > 0 &&
    baseline.value <= 32400 &&
    baseline.unit === 'deg²' &&
    baseline.count > 0 &&
    baseline.count === new Set(baseline.sourceSessionIds).size &&
    baseline.recordedAt !== null &&
    instant(baseline.recordedAt) < instant(input.recordedAt);
  const demo =
    candidates.length === 0 &&
    input.demoBaseline &&
    ctx.crewId === 'SIM-CDR' &&
    person.source === 'simulated-crew' &&
    test.mode === 'replay' &&
    input.comparisonGroupId === 'SIM-CDR-MISSION-01' &&
    contextKey(test) === contextKey(replayTest(condition));
  return {
    value: valid ? baseline!.value : demo ? (condition === 'eyes-closed' ? 2 : 1) : null,
    conflicting,
    demo,
  };
}
export function calculateBalance(ctx: RiskEvaluationContext, input: BalanceInput): BalanceSignals {
  instant(input.recordedAt);
  numberIn(input.dizziness, 'Dizziness', 0, 10, true);
  numberIn(input.motionSickness, 'Motion sickness', 0, 20, true);
  numberIn(input.misc, 'MISC', 0, 10, true);
  numberIn(input.headMovementTolerance, 'Tolerance', 0, 3, true);
  Object.keys(balanceFlags).forEach((key) =>
    booleanInput(input.flags[key as keyof typeof balanceFlags], key),
  );
  for (const condition of ['eyes-open', 'eyes-closed'] as const) {
    const test = input.tests[condition];
    if (
      test &&
      (test.condition !== condition ||
        !test.deviceId.trim() ||
        !test.protocolId.trim() ||
        (test.mode === 'live' &&
          (test.acquisition === 'synthetic' || test.permission !== 'granted')) ||
        (test.mode === 'replay' && test.acquisition !== 'synthetic'))
    )
      throw new Error('Conflicting acquisition metadata');
  }
  const open = testArea(input.tests['eyes-open']),
    closed = testArea(input.tests['eyes-closed']);
  rangeOutside(closed, input.observedClosedRange);
  const baseline = baselineFor(ctx, input, 'eyes-closed');
  const ratio = closed !== null && baseline.value !== null ? closed / baseline.value : null;
  return {
    swayAreaEyesOpenDeg2: open,
    swayAreaEyesClosedDeg2: closed,
    swayRatioEyesClosed: ratio !== null && Number.isFinite(ratio) ? ratio : null,
    dizziness: input.dizziness,
    motionSickness: input.motionSickness,
    headMovementTolerance: input.headMovementTolerance,
  };
}
export function saveBalance(ctx: RiskEvaluationContext, input: BalanceInput) {
  const person = crew(ctx);
  const saved = structuredClone({
    ...input,
    recordedAt: observationTime(person, input.recordedAt),
  });
  if (Object.values(saved.tests).some((test) => test.mode === 'replay') && !person.simulated)
    throw new Error('Simulated replay cannot be saved to a measured crew record');
  const signals = calculateBalance(ctx, saved);
  balanceStore.save(ctx, saved, {
    risk: 'balance',
    crewId: ctx.crewId,
    recordedAt: saved.recordedAt,
    source: person.source,
    simulated: person.simulated,
    signals,
  });
}
export function evaluateBalance(ctx: RiskEvaluationContext, draft?: BalanceInput): RiskEvaluation {
  const person = crew(ctx),
    input = draft ?? balanceStore.current(ctx);
  const signals = input ? calculateBalance(ctx, input) : null;
  const recent = input
    ? balanceStore
        .history(ctx)
        .filter((entry) => entry.recordedAt <= input.recordedAt)
        .slice(-3)
    : [];
  const conflicting = input ? baselineFor(ctx, input, 'eyes-closed').conflicting : false;
  const escalation = reviewEscalation({
    urgent: !!input && Object.values(input.flags).includes(true),
    conflicting,
    incomplete: !signals || Object.values(signals).includes(null),
    checkIns: recent.length,
    indicative: input?.misc !== null && input?.misc !== undefined && input.misc >= 6,
    persistent:
      recent.length === 3 &&
      recent.every((entry) =>
        rangeOutside(testArea(entry.tests['eyes-closed']), entry.observedClosedRange),
      ),
  });
  const value = escalation?.level === 'urgent' ? null : (signals?.swayRatioEyesClosed ?? null);
  return {
    risk: 'balance',
    crewId: ctx.crewId,
    kind: 'change-vs-baseline',
    unit: 'ratio',
    value,
    label:
      escalation?.level === 'urgent'
        ? 'Comparison withheld'
        : value === null
          ? input?.tests['eyes-closed'] && !input.tests['eyes-closed'].complete
            ? 'Test incomplete · no comparison'
            : 'Eyes-closed sway · comparison unavailable'
          : `Eyes-closed sway ${value.toFixed(1)}× your baseline`,
    reasons: [],
    simulated: person.simulated,
    evidence: conflicting ? 'conflicting' : value === null ? 'insufficient' : 'supported',
    escalation,
  };
}
