import type {
  AnyRiskSignalRecord,
  CrewVector,
  Escalation,
  RiskEvaluation,
  RiskEvaluationContext,
  VectorApi,
} from '../types';

export const hour = 3_600_000;
export const day = 24 * hour;
export const missing = 'Not recorded';

export function numberIn(
  value: number | null,
  name: string,
  min: number,
  max = Infinity,
  integer = false,
) {
  if (
    value !== null &&
    (typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value)))
  )
    throw new Error(`${name}: invalid value`);
  return value;
}
export function booleanInput(value: boolean | null, name: string) {
  if (value !== null && typeof value !== 'boolean')
    throw new Error(`${name}: choose yes, no or unknown`);
}
export function textInput(value: string | null, name: string) {
  if (value !== null && (typeof value !== 'string' || !value.trim()))
    throw new Error(`${name}: required text`);
}
export function instant(value: string): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    throw new Error('Time needs an explicit UTC offset');
  const time = Date.parse(value);
  // Reject JS date rollover, including February 30.
  if (!Number.isFinite(time) || !validDate(value.slice(0, 10)))
    throw new Error('Invalid observation time');
  return time;
}
export function utc(value: string) {
  return new Date(instant(value)).toISOString();
}
export function validDate(value: string) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function crew(context: RiskEvaluationContext): CrewVector {
  const person = context.vector.getVector(context.crewId);
  if (!person || person.crewId !== context.crewId) throw new Error('Crew registration required');
  if (
    (person.source === 'simulated-crew' && !person.simulated) ||
    (person.source === 'nasa-research-replay' && person.simulated)
  )
    throw new Error('Crew source conflicts with simulation status');
  return person;
}
export function observationTime(person: CrewVector, value: string) {
  const normalized = utc(value);
  if (instant(normalized) > instant(person.exposures.asOf))
    throw new Error('Observation time is in the future');
  return normalized;
}

// Session-local tab data. Neither vector storage nor the legacy exercise key is touched.
export function inputStore<T extends { recordedAt: string }>() {
  type State = {
    history: T[];
    selected: string | null;
    revision: number;
    listeners: Set<() => void>;
  };
  const scopes = new WeakMap<VectorApi, Map<string, State>>();
  function state(ctx: RiskEvaluationContext) {
    let people = scopes.get(ctx.vector);
    if (!people) {
      people = new Map();
      scopes.set(ctx.vector, people);
    }
    let s = people.get(ctx.crewId);
    if (!s) {
      s = { history: [], selected: null, revision: 0, listeners: new Set() };
      people.set(ctx.crewId, s);
    }
    return s;
  }
  return {
    history: (ctx: RiskEvaluationContext) => structuredClone(state(ctx).history),
    current: (ctx: RiskEvaluationContext) => {
      const s = state(ctx);
      if (s.selected === '') return null;
      return structuredClone(
        s.history.find((x) => x.recordedAt === s.selected) ??
          s.history[s.history.length - 1] ??
          null,
      );
    },
    revision: (ctx: RiskEvaluationContext) => state(ctx).revision,
    notifySelection: (ctx: RiskEvaluationContext) => {
      const s = state(ctx);
      s.revision++;
      s.listeners.forEach((fn) => fn());
    },
    subscribe: (ctx: RiskEvaluationContext, listener: () => void) => {
      state(ctx).listeners.add(listener);
      return () => {
        state(ctx).listeners.delete(listener);
      };
    },
    select: (ctx: RiskEvaluationContext, timestamp: string) => {
      const s = state(ctx);
      if (!s.history.some((x) => x.recordedAt === timestamp))
        throw new Error('Observation not found');
      s.selected = timestamp;
      s.revision++;
      s.listeners.forEach((fn) => fn());
    },
    clearSelection: (ctx: RiskEvaluationContext) => {
      const s = state(ctx);
      s.selected = '';
      s.revision++;
      s.listeners.forEach((fn) => fn());
    },
    save: (ctx: RiskEvaluationContext, input: T, record: AnyRiskSignalRecord) => {
      const s = state(ctx);
      const existing = s.history.find((x) => x.recordedAt === input.recordedAt);
      if (existing && JSON.stringify(existing) !== JSON.stringify(input))
        throw new Error('Conflicting snapshot; use a later observation time');
      const previous = s.history;
      if (!existing)
        s.history = [...previous, structuredClone(input)].sort((a, b) =>
          a.recordedAt.localeCompare(b.recordedAt),
        );
      try {
        ctx.vector.emitSignals(record);
      } catch (e) {
        s.history = previous;
        throw e;
      }
      if (!existing) {
        s.selected = null;
        s.revision++;
        s.listeners.forEach((fn) => fn());
      }
    },
  };
}

export function reviewEscalation(options: {
  urgent: boolean;
  conflicting?: boolean;
  incomplete?: boolean;
  checkIns?: number;
  noPattern?: boolean;
  persistent?: boolean;
  indicative?: boolean;
}): Escalation | null {
  if (options.urgent)
    return { level: 'urgent', trigger: 'red-flag', text: 'Serious symptom reported' };
  if (options.conflicting)
    return { level: 'next-pmc', trigger: 'conflicting', text: 'Conflicting comparison evidence' };
  if (options.noPattern)
    return { level: 'next-pmc', trigger: 'no-pattern', text: 'Pattern not recognised' };
  if (options.incomplete && (options.checkIns ?? 0) >= 2)
    return {
      level: 'next-pmc',
      trigger: 'no-pattern',
      text: 'Required observations missing after two check-ins',
    };
  if (options.persistent)
    return {
      level: 'next-pmc',
      trigger: 'persistent-change',
      text: 'Three check-ins outside your observed range',
    };
  if (options.indicative)
    return {
      level: 'next-pmc',
      trigger: 'indicative-score',
      text: 'Recorded value crosses the cited reference',
    };
  return null;
}
export function finish(ctx: RiskEvaluationContext, base: RiskEvaluation): RiskEvaluation {
  if (base.escalation?.level === 'urgent')
    return {
      ...base,
      value: null,
      reasons: [],
      evidence: base.evidence === 'conflicting' ? 'conflicting' : 'insufficient',
    };
  const adjusted = ctx.vector.personalise(base.risk, ctx.crewId, base);
  return base.kind === 'pattern-match' &&
    base.evidence === 'supported' &&
    adjusted.adjustedPct !== null
    ? { ...base, value: adjusted.adjustedPct, reasons: adjusted.reasons }
    : base;
}
export function rangeOutside(value: number | null, range: readonly [number, number] | null) {
  if (range !== null) {
    numberIn(range[0], 'Range minimum', -Number.MAX_VALUE);
    numberIn(range[1], 'Range maximum', range[0]);
  }
  return value !== null && range !== null && (value < range[0] || value > range[1]);
}
