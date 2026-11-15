import type { BoneSignals, BoneSite, RiskEvaluationContext } from '../types';
import {
  booleanInput,
  crew,
  day,
  finish,
  inputStore,
  instant,
  numberIn,
  observationTime,
  rangeOutside,
  reviewEscalation,
  textInput,
  validDate,
} from '../cardio/support';

export const boneSites: BoneSite[] = ['lumbar-spine', 'total-hip', 'femoral-neck'];
export const siteLabel = {
  'lumbar-spine': 'Spine',
  'total-hip': 'Hip',
  'femoral-neck': 'Femoral neck',
};
export interface DxaScan {
  date: string;
  site: BoneSite;
  bmd: number | null;
  side: 'left' | 'right' | 'central' | null;
  scannerId: string | null;
  protocolId: string | null;
  region: string | null;
  isBaseline: boolean;
}
export interface ResistanceEntry {
  date: string;
  exerciseId: string;
  deviceId: string;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedKg: number | null;
  performedSets: number | null;
  performedReps: number | null;
  actualKg: number | null;
}
export interface BoneInput {
  recordedAt: string;
  site: BoneSite | null;
  baseline: DxaScan | null;
  current: DxaScan | null;
  resistance: ResistanceEntry[] | null;
  resistanceComplete: boolean;
  missionStart: string | null;
  suddenPain: boolean | null;
  calciumTargetMg: number | null;
  vitaminDTargetIu: number | null;
  sodiumTargetMg: number | null;
  observedBmdRange: [number, number] | null;
}
export const boneStore = inputStore<BoneInput>();
export function emptyBone(recordedAt: string): BoneInput {
  return {
    recordedAt,
    site: 'total-hip',
    baseline: null,
    current: null,
    resistance: null,
    resistanceComplete: false,
    missionStart: null,
    suddenPain: null,
    calciumTargetMg: null,
    vitaminDTargetIu: null,
    sodiumTargetMg: null,
    observedBmdRange: null,
  };
}
export function boneSample(): BoneInput {
  const baseline: DxaScan = {
    date: '2026-10-15',
    site: 'total-hip',
    bmd: 1,
    side: 'left',
    scannerId: 'SIM-DXA',
    protocolId: 'SIM-HIP',
    region: 'total-hip-left',
    isBaseline: true,
  };
  return {
    ...emptyBone('2026-11-14T11:00:00.000Z'),
    baseline,
    current: {
      ...baseline,
      date: '2026-11-14',
      bmd: 1 - (0.012 * 30) / 30.4375,
      isBaseline: false,
    },
    resistanceComplete: true,
    resistance: [
      {
        date: '2026-11-13',
        exerciseId: 'SIM-SQUAT',
        deviceId: 'SIM-ARED-v1',
        plannedSets: 2,
        plannedReps: 10,
        plannedKg: 50,
        performedSets: 2,
        performedReps: 10,
        actualKg: 35,
      },
    ],
    missionStart: '2026-11-01T11:00:00Z',
    suddenPain: false,
  };
}
function validateScan(scan: DxaScan, input: BoneInput) {
  if (!validDate(scan.date) || scan.date > input.recordedAt.slice(0, 10))
    throw new Error('DXA date is invalid or future');
  if (!boneSites.includes(scan.site)) throw new Error('Unknown DXA site');
  numberIn(scan.bmd, 'BMD', Number.MIN_VALUE);
  textInput(scan.scannerId, 'Scanner');
  textInput(scan.protocolId, 'Protocol');
  textInput(scan.region, 'Region');
  if (scan.side !== null && !['left', 'right', 'central'].includes(scan.side))
    throw new Error('Unknown DXA side');
  if (scan.site !== 'lumbar-spine' && scan.side === 'central')
    throw new Error('Hip and femoral neck require left or right side');
  if (scan.site === 'lumbar-spine' && scan.side !== null && scan.side !== 'central')
    throw new Error('Lumbar spine requires the central scan region');
  if (typeof scan.isBaseline !== 'boolean') throw new Error('Baseline designation required');
}
export function calculateBone(input: BoneInput) {
  const now = instant(input.recordedAt);
  if (input.site !== null && !boneSites.includes(input.site)) throw new Error('Unknown bone site');
  booleanInput(input.suddenPain, 'Sudden bone pain');
  if (typeof input.resistanceComplete !== 'boolean') throw new Error('Confirm resistance coverage');
  numberIn(input.calciumTargetMg, 'Calcium target', Number.MIN_VALUE, 10000);
  numberIn(input.vitaminDTargetIu, 'Vitamin D target', Number.MIN_VALUE, 100000);
  numberIn(input.sodiumTargetMg, 'Sodium target', Number.MIN_VALUE, 30000);
  if (input.baseline) validateScan(input.baseline, input);
  if (input.current) validateScan(input.current, input);
  const b = input.baseline,
    c = input.current;
  const elapsedDays = b && c ? (Date.parse(c.date) - Date.parse(b.date)) / day : null;
  const conflict =
    !!b &&
    !!c &&
    (b.site !== c.site ||
      b.site !== input.site ||
      b.scannerId !== c.scannerId ||
      b.protocolId !== c.protocolId ||
      b.side !== c.side ||
      b.region !== c.region ||
      !b.isBaseline ||
      c.isBaseline ||
      elapsedDays! <= 0);
  const compatible =
    b &&
    c &&
    !conflict &&
    b.bmd !== null &&
    c.bmd !== null &&
    b.scannerId &&
    b.protocolId &&
    b.side &&
    b.region;
  const change = compatible ? (100 * (c.bmd! / b.bmd! - 1)) / (elapsedDays! / 30.4375) : null;
  if (change !== null && !Number.isFinite(change))
    throw new Error('BMD comparison exceeds numerical range');
  let planned = 0,
    performed = 0;
  let complete = input.resistanceComplete && input.resistance !== null;
  const ids = new Set<string>();
  if (input.resistance !== null && !Array.isArray(input.resistance))
    throw new Error('Resistance log must be an array');
  if (new Set(input.resistance?.map((x) => x.deviceId) ?? []).size > 1)
    throw new Error('Resistance entries require the same supported device protocol');
  for (const log of input.resistance ?? []) {
    if (!validDate(log.date) || log.date > input.recordedAt.slice(0, 10))
      throw new Error('Invalid resistance date');
    // Date-only daily logs cover the seven calendar days ending on the observation day.
    if (Date.parse(log.date) < Date.parse(input.recordedAt.slice(0, 10)) - 6 * day)
      throw new Error('Resistance log outside seven-day set');
    if (!log.exerciseId?.trim() || !log.deviceId?.trim())
      throw new Error('Exercise and comparable device required');
    const key = `${log.date}:${log.exerciseId}`;
    if (ids.has(key)) throw new Error('Use unique exercise/set IDs');
    ids.add(key);
    for (const field of ['plannedSets', 'plannedReps'] as const)
      numberIn(log[field], field, 1, Number.MAX_SAFE_INTEGER, true);
    for (const field of ['performedSets', 'performedReps'] as const)
      numberIn(log[field], field, 0, Number.MAX_SAFE_INTEGER, true);
    numberIn(log.plannedKg, 'Planned load', Number.MIN_VALUE);
    numberIn(log.actualKg, 'Actual load', 0);
    if (
      [
        log.plannedSets,
        log.plannedReps,
        log.plannedKg,
        log.performedSets,
        log.performedReps,
        log.actualKg,
      ].includes(null)
    )
      complete = false;
    else {
      planned += log.plannedKg! * log.plannedSets! * log.plannedReps!;
      performed += log.actualKg! * log.performedSets! * log.performedReps!;
    }
  }
  const load = complete && planned > 0 ? (100 * performed) / planned : null;
  numberIn(load, 'Resistance load', 0, 500);
  const elapsed = input.missionStart !== null ? now - instant(input.missionStart) : null;
  const days = elapsed !== null && elapsed >= 0 ? Math.floor(elapsed / day) : null;
  numberIn(days, 'Flight days', 0, 10000, true);
  rangeOutside(c?.bmd ?? null, input.observedBmdRange);
  const signals: BoneSignals = {
    site: input.site,
    bmdChangePctPerMonth: change,
    resistanceLoadPct: load,
    daysInFlight: days,
  };
  return { signals, conflict, elapsedDays, preFlight: elapsed !== null && elapsed < 0 };
}
export function saveBone(ctx: RiskEvaluationContext, input: BoneInput) {
  const person = crew(ctx),
    recordedAt = observationTime(person, input.recordedAt),
    { signals } = calculateBone(input);
  boneStore.save(
    ctx,
    { ...input, recordedAt },
    {
      risk: 'bone',
      crewId: ctx.crewId,
      source: person.source,
      simulated: person.simulated,
      recordedAt,
      signals,
    },
  );
}
export function evaluateBone(ctx: RiskEvaluationContext) {
  const person = crew(ctx),
    input = boneStore.current(ctx),
    result = input ? calculateBone(input) : null;
  const value = result?.signals.bmdChangePctPerMonth ?? null;
  const history = boneStore.history(ctx).filter((x) => !input || x.recordedAt <= input.recordedAt);
  const recent = history.slice(-3);
  // Three distinct scans, rather than repeatedly saving the same DXA, are independent check-ins.
  const persistent =
    recent.length === 3 &&
    new Set(recent.map((x) => x.current?.date)).size === 3 &&
    recent.every(
      (x) => x.site === input?.site && rangeOutside(x.current?.bmd ?? null, x.observedBmdRange),
    );
  const exposures = person.exposures;
  return finish(ctx, {
    risk: 'bone',
    crewId: ctx.crewId,
    kind: 'change-vs-baseline',
    unit: '%/month',
    value,
    label: `${input?.site ? siteLabel[input.site] : 'BMD'} change per month`,
    reasons: [],
    simulated: person.simulated,
    evidence: result?.conflict ? 'conflicting' : value === null ? 'insufficient' : 'supported',
    escalation: reviewEscalation({
      urgent: input?.suddenPain === true,
      conflicting: result?.conflict,
      incomplete:
        value === null ||
        result?.signals.resistanceLoadPct === null ||
        result?.signals.daysInFlight === null ||
        exposures.calciumMg === null ||
        exposures.vitaminDIu === null ||
        exposures.sodiumMg === null,
      checkIns: history.length,
      // Raw nutrient/exercise context alone is not a confirmed explanation.
      persistent,
    }),
  });
}
