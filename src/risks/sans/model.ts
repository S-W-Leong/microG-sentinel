import type { RiskEvaluationContext, SansSignals } from '../types';
import {
  booleanInput,
  crew,
  finish,
  inputStore,
  instant,
  numberIn,
  observationTime,
  reviewEscalation,
  textInput,
} from '../cardio/support';

export type Eye = NonNullable<SansSignals['eye']>;
export interface Mark {
  x: number;
  y: number;
}
export interface SansInput {
  recordedAt: string;
  eye: Eye;
  marks: Mark[];
  amslerDistortion: SansSignals['amslerDistortion'];
  distanceCm: number | null;
  correction: boolean | null;
  calibration: string | null;
  chart: string | null;
  device: string | null;
  halfLines: boolean | null;
  nearLines: number | null;
  nearBaseline: boolean;
  comparisonGroupId: string | null;
  headache: number | null;
  octUm: number | null;
  octAt: string | null;
  octDevice: string | null;
  octProtocol: string | null;
  octBaseline: boolean;
  frisen: number | null;
  cabinCo2MmHg: number | null;
  flags: { visionLoss: boolean | null; blindSpot: boolean | null; severeHeadache: boolean | null };
}
export const sansFlags = {
  visionLoss: 'Sudden vision loss',
  blindSpot: 'New blind spot',
  severeHeadache: 'Severe or worst-ever headache',
};
export const sansStore = inputStore<SansInput>();
export function emptySans(recordedAt: string, eye: Eye = 'left-eye'): SansInput {
  return {
    recordedAt,
    eye,
    marks: [],
    amslerDistortion: null,
    distanceCm: null,
    correction: null,
    calibration: null,
    chart: null,
    device: null,
    halfLines: null,
    nearLines: null,
    nearBaseline: false,
    comparisonGroupId: null,
    headache: null,
    octUm: null,
    octAt: null,
    octDevice: null,
    octProtocol: null,
    octBaseline: false,
    frisen: null,
    cabinCo2MmHg: null,
    flags: { visionLoss: null, blindSpot: null, severeHeadache: null },
  };
}
export function visionMethod(input: SansInput): string | null {
  return [
    input.chart,
    input.device,
    input.distanceCm,
    input.correction,
    input.calibration,
    input.halfLines,
  ].some((value) => value === null)
    ? null
    : JSON.stringify([
        'near-vision-v1',
        input.chart,
        input.device,
        input.distanceCm,
        input.correction,
        input.calibration,
        input.halfLines,
      ]);
}
export function octMethod(input: SansInput): string | null {
  return input.octDevice && input.octProtocol
    ? JSON.stringify(['peripapillary-rnfl-v1', input.octDevice, input.octProtocol])
    : null;
}
export function validateSans(input: SansInput) {
  instant(input.recordedAt);
  if (!['left-eye', 'right-eye'].includes(input.eye)) throw new Error('Choose an eye');
  numberIn(input.amslerDistortion, 'Distortion', 0, 3, true);
  numberIn(input.distanceCm, 'Distance', Number.MIN_VALUE);
  numberIn(input.nearLines, 'Line', 0, 20);
  if (
    input.nearLines !== null &&
    (!Number.isInteger(input.nearLines * 2) ||
      (!Number.isInteger(input.nearLines) && input.halfLines !== true))
  )
    throw new Error('Half-lines require a supporting chart protocol');
  numberIn(input.headache, 'Headache', 0, 10, true);
  numberIn(input.octUm, 'RNFL thickness', Number.MIN_VALUE);
  numberIn(input.frisen, 'Frisen grade', 0, 5, true);
  numberIn(input.cabinCo2MmHg, 'Cabin CO2', 0, 20);
  for (const value of [
    input.correction,
    input.halfLines,
    input.nearBaseline,
    input.octBaseline,
    ...Object.values(input.flags),
  ])
    booleanInput(value, 'Check');
  for (const value of [
    input.calibration,
    input.chart,
    input.device,
    input.comparisonGroupId,
    input.octDevice,
    input.octProtocol,
  ])
    textInput(value, 'Protocol');
  if (input.octAt !== null && instant(input.octAt) > instant(input.recordedAt))
    throw new Error('OCT date follows check-in');
  for (const mark of input.marks) {
    if (typeof mark.x !== 'number' || typeof mark.y !== 'number')
      throw new Error('Invalid grid mark');
    numberIn(mark.x, 'Grid x', 0, 1);
    numberIn(mark.y, 'Grid y', 0, 1);
  }
}
function comparison(
  ctx: RiskEvaluationContext,
  input: SansInput,
  metric: 'nearVisionLines' | 'octThicknessUm',
  history: SansInput[],
) {
  const person = crew(ctx);
  const vision = metric === 'nearVisionLines';
  const method = vision ? visionMethod(input) : octMethod(input);
  const value = vision ? input.nearLines : input.octUm;
  const at = vision ? input.recordedAt : input.octAt;
  if (
    !method ||
    value === null ||
    !at ||
    !input.comparisonGroupId ||
    (vision ? input.nearBaseline : input.octBaseline)
  )
    return { value: null, conflicting: false };
  const vectorEntries = person.baselines.entries.filter(
    (entry) =>
      entry.metric === metric &&
      entry.contextKey === input.eye &&
      entry.methodId === method &&
      entry.comparisonGroupId === input.comparisonGroupId &&
      entry.source === person.source,
  );
  const local = history.filter(
    (entry) =>
      entry.eye === input.eye &&
      entry.comparisonGroupId === input.comparisonGroupId &&
      (vision ? entry.nearBaseline : entry.octBaseline) &&
      (vision ? visionMethod(entry) : octMethod(entry)) === method &&
      (vision ? entry.nearLines : entry.octUm) !== null &&
      (vision ? entry.recordedAt : entry.octAt) !== null &&
      instant(vision ? entry.recordedAt : entry.octAt!) < instant(at),
  );
  const candidates = vectorEntries
    .filter(
      (entry) =>
        entry.evidence === 'supported' &&
        entry.value !== null &&
        entry.recordedAt !== null &&
        instant(entry.recordedAt) < instant(at),
    )
    .map((entry) => entry.value!);
  candidates.push(...local.map((entry) => (vision ? entry.nearLines : entry.octUm)!));
  const conflicting =
    vectorEntries.some((entry) => entry.evidence === 'conflicting') || new Set(candidates).size > 1;
  if (conflicting || candidates.length === 0) return { value: null, conflicting };
  const delta = value - candidates[0];
  return { value: Math.abs(delta) <= (vision ? 20 : 1000) ? delta : null, conflicting: false };
}
export function calculateSans(
  ctx: RiskEvaluationContext,
  input: SansInput,
  history = sansStore.history(ctx),
) {
  validateSans(input);
  const near = comparison(ctx, input, 'nearVisionLines', history);
  const oct = comparison(ctx, input, 'octThicknessUm', history);
  const signals: SansSignals = {
    eye: input.eye,
    amslerDistortion: input.amslerDistortion,
    nearVisionChangeLines: near.value,
    headache: input.headache,
    octThicknessChangeUm: oct.value,
    cabinCo2MmHg: input.cabinCo2MmHg,
  };
  return { signals, conflicting: near.conflicting || oct.conflicting };
}
export function saveSans(ctx: RiskEvaluationContext, input: SansInput) {
  const person = crew(ctx);
  const saved = structuredClone(input);
  saved.recordedAt = observationTime(person, saved.recordedAt);
  const { signals } = calculateSans(ctx, saved);
  sansStore.save(ctx, saved, {
    risk: 'sans',
    crewId: ctx.crewId,
    recordedAt: saved.recordedAt,
    source: person.source,
    simulated: person.simulated,
    signals,
  });
}
export function evaluateSans(ctx: RiskEvaluationContext) {
  const person = crew(ctx),
    input = sansStore.current(ctx);
  const result = input ? calculateSans(ctx, input) : null;
  const value = result?.signals.nearVisionChangeLines ?? null;
  return finish(ctx, {
    risk: 'sans',
    crewId: ctx.crewId,
    kind: 'change-vs-baseline',
    value: result?.conflicting ? null : value,
    unit: 'lines',
    label: 'Near vision vs baseline',
    reasons: [],
    simulated: person.simulated,
    evidence: result?.conflicting ? 'conflicting' : value === null ? 'insufficient' : 'supported',
    escalation: reviewEscalation({
      urgent: input ? Object.values(input.flags).includes(true) : false,
      conflicting: result?.conflicting,
      noPattern:
        input !== null &&
        (value === null ||
          value !== 0 ||
          (input.amslerDistortion ?? 0) > 0 ||
          (input.headache ?? 0) > 0 ||
          (result?.signals.octThicknessChangeUm ?? 0) !== 0),
    }),
  });
}
export function sansSample(now: string): SansInput[] {
  const current = {
    ...emptySans(now),
    comparisonGroupId: 'SIM-CDR-MISSION-01',
    chart: 'DEMO near chart / half-line scoring',
    device: 'DEMO tablet',
    calibration: 'DEMO calibration',
    distanceCm: 40,
    correction: true,
    halfLines: true,
    nearLines: 9.5,
    amslerDistortion: 0 as const,
    headache: 0,
    flags: { visionLoss: false, blindSpot: false, severeHeadache: false },
  };
  return [
    {
      ...current,
      recordedAt: new Date(instant(now) - 86400000).toISOString(),
      nearLines: 10,
      nearBaseline: true,
    },
    current,
  ];
}
