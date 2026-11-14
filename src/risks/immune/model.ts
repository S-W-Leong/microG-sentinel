import type { ImmuneSignals, Rating03, RiskEvaluation, RiskEvaluationContext } from '../types';
import {
  booleanInput,
  crew,
  finish,
  inputStore,
  instant,
  numberIn,
  observationTime,
  rangeOutside,
  reviewEscalation,
} from '../cardio/support';

export const bodyAreas = [
  'head-neck',
  'trunk',
  'left-arm',
  'right-arm',
  'left-leg',
  'right-leg',
] as const;
export type BodyArea = (typeof bodyAreas)[number];
export const immuneFlags = {
  breathing: 'Trouble breathing or wheezing',
  throat: 'Throat tightness or hoarse voice',
  swelling: 'Lip or tongue swelling',
  fainting: 'Dizziness or fainting',
};
export interface ImmuneInput {
  recordedAt: string;
  observedItchRange: [number, number] | null;
  rashActive: boolean | null;
  whealCountBand: Rating03 | null;
  itch: Rating03 | null;
  raised: boolean | null;
  clearEdges: boolean | null;
  paleCentre: boolean | null;
  fadesWithin24h: boolean | null;
  areas: BodyArea[] | null;
  onset: string | null;
  photoTime: string | null;
  photoArea: BodyArea | null;
  flags: Record<keyof typeof immuneFlags, boolean | null>;
}
export const immuneStore = inputStore<ImmuneInput>();
export function emptyImmune(recordedAt: string): ImmuneInput {
  return {
    recordedAt,
    observedItchRange: null,
    rashActive: null,
    whealCountBand: null,
    itch: null,
    raised: null,
    clearEdges: null,
    paleCentre: null,
    fadesWithin24h: null,
    areas: null,
    onset: null,
    photoTime: null,
    photoArea: null,
    flags: { breathing: null, throat: null, swelling: null, fainting: null },
  };
}
export function immuneSample(): ImmuneInput {
  return {
    ...emptyImmune('2026-11-14T11:00:00.000Z'),
    rashActive: true,
    whealCountBand: 2,
    itch: 2,
    raised: true,
    clearEdges: true,
    paleCentre: true,
    areas: ['trunk', 'left-arm'],
    flags: { breathing: false, throat: false, swelling: false, fainting: false },
  };
}
export function scoreImmune(input: ImmuneInput) {
  instant(input.recordedAt);
  numberIn(input.whealCountBand, 'Wheals', 0, 3, true);
  numberIn(input.itch, 'Itch', 0, 3, true);
  rangeOutside(input.itch, input.observedItchRange);
  if (input.observedItchRange !== null)
    input.observedItchRange.forEach((x) => numberIn(x, 'Observed itch range', 0, 3, true));
  for (const name of [
    'rashActive',
    'raised',
    'clearEdges',
    'paleCentre',
    'fadesWithin24h',
  ] as const)
    booleanInput(input[name], name);
  for (const name of Object.keys(immuneFlags) as (keyof typeof immuneFlags)[])
    booleanInput(input.flags[name], name);
  if (
    input.areas !== null &&
    (!Array.isArray(input.areas) ||
      new Set(input.areas).size !== input.areas.length ||
      input.areas.some((x) => !bodyAreas.includes(x)))
  )
    throw new Error('Choose unique body areas');
  for (const field of ['onset', 'photoTime'] as const)
    if (input[field] !== null && instant(input[field]) > instant(input.recordedAt))
      throw new Error(`${field} is after observation time`);
  if (input.photoArea !== null && !bodyAreas.includes(input.photoArea))
    throw new Error('Unknown photo area');
  const shapeKnown = [input.raised, input.clearEdges, input.paleCentre].every((x) => x !== null);
  const groups = [
    input.whealCountBand !== null,
    input.itch !== null,
    shapeKnown,
    input.fadesWithin24h !== null,
    input.areas !== null,
  ].filter(Boolean).length;
  // Explicit synthetic reference, demo-immune-v1. Exact groups only; unknowns do not match.
  const matches = [
    input.whealCountBand === 2,
    input.itch === 2,
    input.raised === true && input.clearEdges === true && input.paleCentre === true,
    input.fadesWithin24h === true,
    input.areas?.length === 1,
  ].filter(Boolean).length;
  const signals: ImmuneSignals = {
    hivesPatternPct: groups >= 3 ? matches * 20 : null,
    rashActive: input.rashActive,
    whealCountBand: input.whealCountBand,
    itch: input.itch,
    raised: input.raised,
    clearEdges: input.clearEdges,
    paleCentre: input.paleCentre,
    fadesWithin24h: input.fadesWithin24h,
    bodyAreasCount: input.areas?.length ?? null,
  };
  return { signals, groups };
}
export function saveImmune(ctx: RiskEvaluationContext, input: ImmuneInput) {
  const person = crew(ctx);
  const recordedAt = observationTime(person, input.recordedAt);
  const { signals } = scoreImmune(input);
  immuneStore.save(
    ctx,
    { ...input, recordedAt },
    {
      risk: 'immune',
      crewId: ctx.crewId,
      recordedAt,
      source: person.source,
      simulated: person.simulated,
      signals,
    },
  );
}
export function evaluateImmune(ctx: RiskEvaluationContext) {
  const person = crew(ctx);
  const input = immuneStore.current(ctx);
  const result = input ? scoreImmune(input) : null;
  const value = result?.signals.hivesPatternPct ?? null;
  const history = immuneStore
    .history(ctx)
    .filter((x) => !input || x.recordedAt <= input.recordedAt);
  const base: RiskEvaluation = {
    risk: 'immune',
    crewId: ctx.crewId,
    kind: 'pattern-match',
    value,
    unit: '%',
    label: 'Hives pattern',
    reasons: [],
    evidence: value === null ? 'insufficient' : 'supported',
    simulated: person.simulated,
    escalation: reviewEscalation({
      urgent: !!input && Object.values(input.flags).includes(true),
      incomplete: (result?.groups ?? 0) < 3,
      checkIns: history.length,
      noPattern: value !== null && value < 40,
    }),
  };
  const final = finish(ctx, base);
  const latest = ctx.vector.getSignals('immune', ctx.crewId, 24);
  // The envelope has no timestamp: only apply the vector's current adjustment to
  // the exact private observation represented by its current immune snapshot.
  const matching =
    input &&
    latest?.recordedAt === input.recordedAt &&
    latest.source === person.source &&
    latest.simulated === person.simulated;
  const selected = matching ? final : { ...final, value: base.value, reasons: [] };
  if (selected.escalation?.level === 'urgent') return { ...selected, value: null };
  const recent = history.slice(-3);
  if (
    !selected.escalation &&
    selected.reasons.length === 0 &&
    recent.length === 3 &&
    recent.every((x) => rangeOutside(x.itch, x.observedItchRange))
  )
    return { ...selected, escalation: reviewEscalation({ urgent: false, persistent: true }) };
  return selected;
}
