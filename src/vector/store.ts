import type {
  AnyRiskSignalRecord,
  CrewExposures,
  ExposureScalars,
  RiskEvaluation,
  RiskId,
  RiskSignalRecord,
  SignalRef,
  VectorApi,
} from '../risks/types';
import { demoRegistrations, prepareRegistration } from './registry';
import type { Registration } from './registry';
import {
  canonical,
  catalogue,
  exactKeys,
  nonempty,
  normaliseAllergen,
  owns,
  timestamp,
  validateRecord,
} from './validation';

const hour = 3600000;
const scalarSources: Record<keyof ExposureScalars, RiskId> = {
  sleepDebtHours: 'sleep',
  exerciseLoadPct: 'cardio',
  resistanceLoadPct: 'bone',
  daysInFlight: 'bone',
  cabinCo2MmHg: 'sans',
  sodiumMg: 'food',
  calciumMg: 'food',
  vitaminDIu: 'food',
  fibreG: 'food',
  energyPctOfNeed: 'food',
  bodyMassKg: 'food',
};

function windowHours(hours: number): void {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 336)
    throw new RangeError('sinceHours must be finite, > 0 and <= 336');
}

function validateEvaluation(base: RiskEvaluation): void {
  exactKeys(
    base,
    [
      'risk',
      'crewId',
      'kind',
      'value',
      'unit',
      'label',
      'reasons',
      'evidence',
      'simulated',
      'escalation',
    ],
    'Evaluation',
  );
  if (!['pattern-match', 'change-vs-baseline'].includes(base.kind))
    throw new Error('Invalid evaluation kind');
  if (
    !['supported', 'insufficient', 'conflicting'].includes(base.evidence) ||
    (base.evidence === 'supported') !== (base.value !== null)
  )
    throw new Error('Evaluation evidence/value mismatch');
  if (base.value !== null && (typeof base.value !== 'number' || !Number.isFinite(base.value)))
    throw new Error('Invalid evaluation value');
  if (!['%', 'bpm', 'h', '%/month', 'ratio', 'lines', 'µm', 'kg', 'score/10'].includes(base.unit))
    throw new Error('Invalid evaluation unit');
  if (
    base.kind === 'pattern-match' &&
    (base.unit !== '%' || (base.value !== null && (base.value < 0 || base.value > 100)))
  )
    throw new Error('Pattern match requires 0-100 percent');
  if (!nonempty(base.label) || base.label.trim().split(/\s+/).length > 6)
    throw new Error('Evaluation label requires 1-6 words');
  if (!Array.isArray(base.reasons) || base.reasons.length !== 0)
    throw new Error('Personalisation requires an unpersonalised base with empty reasons');
  if (base.escalation !== null) {
    exactKeys(base.escalation, ['level', 'trigger', 'text'], 'Escalation');
    if (
      !['urgent', 'next-pmc'].includes(base.escalation.level) ||
      ![
        'red-flag',
        'no-pattern',
        'conflicting',
        'persistent-change',
        'something-else',
        'indicative-score',
      ].includes(base.escalation.trigger) ||
      !nonempty(base.escalation.text) ||
      base.escalation.text.trim().split(/\s+/).length > 12
    )
      throw new Error('Invalid escalation');
    if (base.escalation.level === 'urgent' && base.value !== null)
      throw new Error('Urgent escalation requires a null display value');
  }
}

export function createVector(
  options: { clock?: () => number; registrations?: Registration[] } = {},
): VectorApi {
  const clock = options.clock ?? Date.now;
  const registry = new Map<string, Registration>();
  for (const input of options.registrations ?? demoRegistrations) {
    const registration = prepareRegistration(input);
    if (registry.has(registration.crewId)) throw new Error('Duplicate crew registration');
    registry.set(registration.crewId, registration);
  }
  const records = new Map<string, Map<RiskId, Map<number, AnyRiskSignalRecord>>>();
  const subscribers = new Map<string, Set<() => void>>();
  function now(): number {
    const value = clock();
    if (!Number.isFinite(value) || !Number.isFinite(new Date(value).getTime()))
      throw new Error('Invalid vector clock');
    return value;
  }
  function latest<R extends RiskId>(
    risk: R,
    crewId: string,
    hours: number,
    asOf: number,
  ): RiskSignalRecord<R> | null {
    let result: AnyRiskSignalRecord | null = null;
    let last = -Infinity;
    for (const [observed, record] of records.get(crewId)?.get(risk) ?? []) {
      if (observed > asOf - hours * hour && observed <= asOf && observed > last) {
        result = record;
        last = observed;
      }
    }
    return result as RiskSignalRecord<R> | null;
  }
  function ref(record: RiskSignalRecord, signal: string): SignalRef {
    return {
      risk: record.risk,
      signal,
      recordedAt: record.recordedAt,
      source: record.source,
      simulated: record.simulated,
    };
  }
  function exposures(crewId: string, hours: number, asOf: number): CrewExposures {
    const result = {
      asOf: new Date(asOf).toISOString(),
      sinceHours: hours,
      recentFoods: null,
      allergensEaten: null,
      refs: {},
      foodRecordRefs: [],
    } as unknown as CrewExposures;
    for (const key of Object.keys(scalarSources) as (keyof ExposureScalars)[]) {
      const record = latest(scalarSources[key], crewId, hours, asOf);
      const value = record ? (record.signals as unknown as ExposureScalars)[key] : null;
      result[key] = value;
      result.refs[key] = value !== null && record ? ref(record, key) : null;
    }
    const food = latest('food', crewId, hours, asOf);
    if (food) {
      for (const field of ['foodsEaten', 'allergensEaten'] as const) {
        const events = food.signals[field];
        if (events === null) continue;
        result.foodRecordRefs.push(ref(food, field));
        const filtered = events.filter(
          (event) =>
            timestamp(event.eatenAt) > asOf - hours * hour && timestamp(event.eatenAt) <= asOf,
        );
        if (field === 'foodsEaten') {
          const foods = filtered as NonNullable<typeof food.signals.foodsEaten>;
          result.recentFoods = [
            ...new Map(
              foods.map((event) => [
                canonical([event.mealId, event.foodName, timestamp(event.eatenAt)]),
                event,
              ]),
            ).values(),
          ];
        } else {
          const allergens = (filtered as NonNullable<typeof food.signals.allergensEaten>).map(
            (event) => ({ ...event, allergen: normaliseAllergen(event.allergen) }),
          );
          result.allergensEaten = [
            ...new Map(
              allergens.map((event) => [
                canonical([event.mealId, event.allergen, timestamp(event.eatenAt)]),
                event,
              ]),
            ).values(),
          ];
        }
      }
    }
    return result;
  }
  const api: VectorApi = {
    emitSignals(record) {
      validateRecord(record, now());
      const registration = registry.get(record.crewId);
      if (!registration) throw new Error('Unknown crew: ' + record.crewId);
      if (record.source !== registration.source || record.simulated !== registration.simulated)
        throw new Error('Signal source/simulated mismatch');
      const observed = timestamp(record.recordedAt);
      const existing = records.get(record.crewId)?.get(record.risk)?.get(observed);
      if (existing) {
        if (canonical(existing) !== canonical(record))
          throw new Error('Conflicting signal identity');
        return;
      }
      const stored = structuredClone(record);
      const crewRecords = records.get(record.crewId) ?? new Map();
      const riskRecords = crewRecords.get(record.risk) ?? new Map();
      riskRecords.set(observed, stored);
      crewRecords.set(record.risk, riskRecords);
      records.set(record.crewId, crewRecords);
      const failures: unknown[] = [];
      for (const listener of [...(subscribers.get(record.crewId) ?? [])]) {
        try {
          listener();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length)
        throw new Error('Signals stored; subscriber notification failed: ' + String(failures[0]));
    },
    getVector(crewId) {
      const registration = registry.get(crewId);
      if (!registration) return null;
      const { source, simulated, traits, baselines } = registration;
      return structuredClone({
        crewId,
        source,
        simulated,
        traits,
        baselines,
        exposures: exposures(crewId, 24, now()),
      });
    },
    getExposures(crewId, hours) {
      windowHours(hours);
      return registry.has(crewId) ? structuredClone(exposures(crewId, hours, now())) : null;
    },
    getSignals(risk, crewId, hours) {
      windowHours(hours);
      if (!owns(catalogue, risk)) throw new Error('Unknown risk');
      return registry.has(crewId) ? structuredClone(latest(risk, crewId, hours, now())) : null;
    },
    personalise(risk, crewId, base) {
      const registration = registry.get(crewId);
      if (!registration) throw new Error('Unknown crew: ' + crewId);
      if (
        !owns(catalogue, risk) ||
        base.risk !== risk ||
        base.crewId !== crewId ||
        base.simulated !== registration.simulated
      )
        throw new Error('Evaluation identity/simulated mismatch');
      validateEvaluation(base);
      if (
        base.value === null ||
        base.evidence !== 'supported' ||
        base.kind === 'change-vs-baseline'
      )
        return { adjustedPct: null, reasons: [] };
      const unchanged = { adjustedPct: base.value, reasons: [] };
      if (risk !== 'immune' || registration.source === 'nasa-research-replay') return unchanged;
      const asOf = now();
      const immune = latest('immune', crewId, 24, asOf);
      if (
        !immune ||
        immune.signals.rashActive !== true ||
        immune.signals.hivesPatternPct !== base.value
      )
        return unchanged;
      const context = exposures(crewId, 24, asOf);
      const matching = (context.allergensEaten ?? [])
        .filter(
          (event) =>
            timestamp(event.eatenAt) > asOf - 6 * hour &&
            timestamp(event.eatenAt) <= asOf &&
            registration.traits.allergies?.includes(event.allergen),
        )
        .map((event) => event.allergen)
        .sort();
      if (!matching.length) return unchanged;
      return {
        adjustedPct: Math.min(100, Math.max(0, base.value + 20)),
        reasons: [
          {
            direction: 'up',
            text: 'Known matching food allergy',
            sourceRisk: 'immune',
            signal: 'traits.allergies',
          },
          {
            direction: 'up',
            text: 'Matching allergen eaten within six hours',
            sourceRisk: 'food',
            signal: 'food.allergensEaten',
          },
        ],
      };
    },
    subscribe(crewId, listener) {
      if (!registry.has(crewId)) throw new Error('Unknown crew: ' + crewId);
      if (typeof listener !== 'function') throw new Error('Listener must be a function');
      const listeners = subscribers.get(crewId) ?? new Set();
      const subscription = () => listener();
      listeners.add(subscription);
      subscribers.set(crewId, listeners);
      return () => {
        listeners.delete(subscription);
      };
    },
  };
  return api;
}
