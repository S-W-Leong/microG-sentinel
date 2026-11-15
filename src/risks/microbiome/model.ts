import type {
  MicrobiomeSignals,
  Rating03,
  RiskEvaluation,
  RiskEvaluationContext,
  RiskSignalRecord,
  SignalRef,
} from '../types';
import {
  booleanInput,
  crew,
  day,
  inputStore,
  instant,
  numberIn,
  observationTime,
  reviewEscalation,
  validDate,
} from '../cardio/support';

export interface AntibioticCourse {
  name: string;
  start: string;
  end: string | null;
  ongoing: boolean;
}
export interface MicrobiomeInput {
  recordedAt: string;
  changed: boolean | null;
  bristolType: number | null;
  bloating: Rating03 | null;
  abdominalPain: Rating03 | null;
  appetite: Rating03 | null;
  antibiotics14d: boolean | null;
  antibiotics: AntibioticCourse[];
  skin: { redness: boolean | null; warmth: boolean | null; discharge: boolean | null };
  photo: { name: string; url: string } | null;
  flags: { blood: boolean | null; feverPain: boolean | null; fluids24h: boolean | null };
  missionStart: string;
  fibreTargetG: number | null;
  targetNote: string;
}
export interface FibreSnapshot {
  grams: number | null;
  ref: SignalRef | null;
  origin: 'food-vector' | 'simulated-fixture';
}
export interface GutEntry extends MicrobiomeInput {
  fibre: FibreSnapshot;
}

export const gutStore = inputStore<GutEntry>();
export const flagQuestions = [
  ['blood', 'Blood in stool'],
  ['feverPain', 'Fever with abdominal pain'],
  ['fluids24h', 'Unable to keep fluids down for 24 h'],
] as const;
export const dateOf = (value: string) => new Date(instant(value)).toISOString().slice(0, 10);

export function emptyInput(recordedAt: string): MicrobiomeInput {
  return {
    recordedAt,
    changed: null,
    bristolType: null,
    bloating: null,
    abdominalPain: null,
    appetite: null,
    antibiotics14d: null,
    antibiotics: [],
    skin: { redness: null, warmth: null, discharge: null },
    photo: null,
    flags: { blood: null, feverPain: null, fluids24h: null },
    missionStart: '',
    fibreTargetG: null,
    targetNote: '',
  };
}

export function antibioticActive(course: AntibioticCourse, date: string) {
  return course.start <= date && (course.ongoing || (course.end !== null && course.end >= date));
}

export function validateInput(input: MicrobiomeInput) {
  const time = instant(input.recordedAt);
  numberIn(input.bristolType, 'Bristol type', 1, 7, true);
  for (const key of ['bloating', 'abdominalPain', 'appetite'] as const)
    numberIn(input[key], key, 0, 3, true);
  for (const [key, value] of Object.entries({
    changed: input.changed,
    antibiotics: input.antibiotics14d,
    ...input.skin,
    ...input.flags,
  }))
    booleanInput(value, key);
  numberIn(input.fibreTargetG, 'Personal fibre target', 0, 200);
  if (
    input.missionStart &&
    (!validDate(input.missionStart) || input.missionStart > dateOf(input.recordedAt))
  )
    throw new Error('Mission start must be on or before this check-in.');
  for (const course of input.antibiotics) {
    if (
      !course.name.trim() ||
      !validDate(course.start) ||
      course.start > dateOf(input.recordedAt) ||
      (!course.ongoing &&
        (!course.end ||
          !validDate(course.end) ||
          course.end < course.start ||
          course.end > dateOf(input.recordedAt))) ||
      (course.ongoing && course.end !== null)
    )
      throw new Error('Complete the antibiotic name and date interval.');
    const end = course.ongoing ? time : Date.parse(`${course.end}T23:59:59.999Z`);
    if (input.antibiotics14d === false && end > time - 14 * day)
      throw new Error('Antibiotic dates conflict with the 14-day answer.');
  }
}

function daily(history: MicrobiomeInput[]) {
  const days = new Map<string, MicrobiomeInput>();
  for (const entry of [...history].sort(
    (left, right) => instant(left.recordedAt) - instant(right.recordedAt),
  ))
    days.set(dateOf(entry.recordedAt), entry);
  return [...days.values()];
}

export function gutChangeDays(history: MicrobiomeInput[]): number | null {
  const entries = daily(history);
  if (!entries.length) return null;
  let count = 0;
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    if (
      index < entries.length - 1 &&
      Date.parse(dateOf(entries[index + 1].recordedAt)) - Date.parse(dateOf(entry.recordedAt)) !==
        day
    )
      return null;
    if (entry.changed === null) return null;
    if (!entry.changed) return count;
    count++;
    if (count > 365) return null;
  }
  return count;
}

export function readFibre(ctx: RiskEvaluationContext, recordedAt: string): FibreSnapshot {
  const person = crew(ctx);
  const exposures = ctx.vector.getExposures(ctx.crewId, 24);
  const ref = exposures?.refs.fibreG ?? null;
  const grams = exposures?.fibreG ?? null;
  const matches =
    ref?.risk === 'food' &&
    ref.signal === 'fibreG' &&
    ref.source === person.source &&
    ref.simulated === person.simulated &&
    dateOf(ref.recordedAt) === dateOf(recordedAt) &&
    instant(ref.recordedAt) <= instant(recordedAt);
  return {
    grams:
      matches && grams !== null && Number.isFinite(grams) && grams >= 0 && grams <= 200
        ? grams
        : null,
    ref: matches && grams !== null ? ref : null,
    origin: 'food-vector',
  };
}

export function buildRecord(
  ctx: RiskEvaluationContext,
  input: MicrobiomeInput,
  history: MicrobiomeInput[],
): RiskSignalRecord<'microbiome'> {
  validateInput(input);
  const person = crew(ctx);
  const recordedAt = observationTime(person, input.recordedAt);
  const signs = Object.values(input.skin);
  const signals: MicrobiomeSignals = {
    bristolType: input.bristolType,
    bloating: input.bloating,
    abdominalPain: input.abdominalPain,
    appetite: input.appetite,
    antibiotics14d: input.antibiotics14d,
    skinInfectionSigns: signs.includes(null) ? null : (signs.filter(Boolean).length as Rating03),
    gutChangeDays: gutChangeDays([
      ...history.filter((entry) => instant(entry.recordedAt) < instant(recordedAt)),
      input,
    ]),
  };
  return {
    risk: 'microbiome',
    crewId: ctx.crewId,
    recordedAt,
    source: person.source,
    simulated: person.simulated,
    signals,
  };
}

export function saveMicrobiome(ctx: RiskEvaluationContext, input: MicrobiomeInput) {
  const history = gutStore.history(ctx);
  if (history.some((entry) => instant(entry.recordedAt) >= instant(input.recordedAt)))
    throw new Error('Use a time after your last saved check-in.');
  const record = buildRecord(ctx, input, history);
  gutStore.save(
    ctx,
    { ...input, recordedAt: record.recordedAt, fibre: readFibre(ctx, record.recordedAt) },
    record,
  );
}

export function lowFibreSince(history: GutEntry[]): number | null {
  const count = gutChangeDays(history);
  if (count === null || count === 0) return null;
  const dates = daily(history)
    .slice(-count)
    .map((entry) => dateOf(entry.recordedAt));
  const latest = history.slice(-1)[0];
  if (!latest?.missionStart || latest.fibreTargetG === null || !latest.targetNote.trim())
    return null;
  for (const date of dates) {
    const entry = history.filter((item) => dateOf(item.recordedAt) === date).slice(-1)[0];
    if (
      !entry ||
      entry.fibre.grams === null ||
      entry.fibreTargetG !== latest.fibreTargetG ||
      entry.missionStart !== latest.missionStart ||
      !entry.targetNote.trim() ||
      entry.fibre.grams >= latest.fibreTargetG
    )
      return null;
  }
  return Math.round((Date.parse(dates[0]) - Date.parse(latest.missionStart)) / day) + 1;
}

export function gutSummary(history: GutEntry[]) {
  const count = gutChangeDays(history);
  if (count === null) return 'Continuity not established';
  if (count === 0) return '0 days · no change reported';
  const since = lowFibreSince(history);
  return `Gut pattern changed ${count} days${since === null ? '' : ` · low fibre since day ${since}`}`;
}

export function evaluateMicrobiome(
  ctx: RiskEvaluationContext,
  draft?: MicrobiomeInput,
): RiskEvaluation {
  const person = crew(ctx);
  const history = gutStore.history(ctx);
  const input = history.slice(-1)[0];
  const count = gutChangeDays(history);
  const urgent = [input, draft].some((entry) => entry && Object.values(entry.flags).includes(true));
  const incomplete =
    !input ||
    [
      input.changed,
      input.bloating,
      input.abdominalPain,
      input.appetite,
      input.antibiotics14d,
      ...Object.values(input.flags),
    ].includes(null) ||
    count === null;
  const escalation = reviewEscalation({
    urgent,
    incomplete,
    checkIns: history.length,
    persistent: count !== null && count >= 3 && lowFibreSince(history) === null,
  });
  return {
    risk: 'microbiome',
    crewId: ctx.crewId,
    kind: 'pattern-match',
    value: null,
    unit: '%',
    label: 'Gut observations',
    reasons: [],
    evidence: incomplete ? 'insufficient' : 'supported',
    simulated: person.simulated,
    escalation,
  };
}

export function demoHistory(asOf: string): GutEntry[] {
  const end = instant(asOf) - 3_600_000;
  const missionStart = dateOf(new Date(end - 14 * day).toISOString());
  return [0, 1, 2, 3, 4].map((index) => ({
    ...emptyInput(new Date(end - (4 - index) * day).toISOString()),
    missionStart,
    fibreTargetG: 25,
    targetNote: 'Simulated personal target; not a clinical threshold',
    changed: index > 0,
    bristolType: index === 0 ? 4 : index === 4 ? 2 : 1,
    bloating: index === 0 ? 0 : 2,
    abdominalPain: index === 0 ? 0 : 1,
    appetite: 2,
    antibiotics14d: true,
    antibiotics: [
      {
        name: 'Simulated course',
        start: dateOf(new Date(end - 3 * day).toISOString()),
        end: dateOf(new Date(end - day).toISOString()),
        ongoing: false,
      },
    ].filter(() => index === 4),
    skin: { redness: false, warmth: false, discharge: false },
    flags: { blood: false, feverPain: false, fluids24h: false },
    fibre: { grams: [28, 15, 17, 14, 18][index], ref: null, origin: 'simulated-fixture' },
  }));
}

export function loadDemo(ctx: RiskEvaluationContext) {
  const person = crew(ctx);
  if (ctx.crewId !== 'SIM-CDR' || !person.simulated || person.source !== 'simulated-crew')
    throw new Error('This fixture is only for SIM-CDR.');
  if (gutStore.history(ctx).length) throw new Error('Demo requires an empty session history.');
  for (const entry of demoHistory(person.exposures.asOf))
    gutStore.save(ctx, entry, buildRecord(ctx, entry, gutStore.history(ctx)));
}
