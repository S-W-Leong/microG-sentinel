import type { RiskEvaluationContext, VectorApi } from '../types';
import { baseEvaluation, buildRecord, emptyInput, nutrientTotals, type FoodInput } from './model';

export interface FoodState {
  input: FoodInput;
  history: {
    observedAt: string;
    bodyMassKg: number | null;
    energyKcal: number | null;
    energyTargetKcal: number | null;
    logComplete: boolean;
    sodiumMg: number | null;
    sodiumTargetMg: number | null;
  }[];
}

const stores = new WeakMap<VectorApi, Map<string, FoodState>>();
const listeners = new WeakMap<VectorApi, Map<string, Set<() => void>>>();

export function getFoodState({ crewId, vector }: RiskEvaluationContext): FoodState {
  return stores.get(vector)?.get(crewId) ?? emptyState;
}

const emptyState: FoodState = { input: emptyInput(''), history: [] };

export function subscribeFood(context: RiskEvaluationContext, listener: () => void): () => void {
  if (!listeners.has(context.vector)) listeners.set(context.vector, new Map());
  const crewListeners = listeners.get(context.vector)!;
  if (!crewListeners.has(context.crewId)) crewListeners.set(context.crewId, new Set());
  const group = crewListeners.get(context.crewId)!;
  group.add(listener);
  return () => {
    group.delete(listener);
  };
}

export function saveFood(context: RiskEvaluationContext, input: FoodInput) {
  const previous = getFoodState(context);
  const record = buildRecord(context.crewId, input, context.vector.getVector(context.crewId));
  if (
    previous.history.some((entry) => Date.parse(entry.observedAt) >= Date.parse(record.recordedAt))
  ) {
    throw new Error('Use an observation time after the last check-in.');
  }
  if (!stores.has(context.vector)) stores.set(context.vector, new Map());
  const savedInput = structuredClone(input);
  savedInput.observedAt = record.recordedAt;
  stores.get(context.vector)!.set(context.crewId, {
    input: savedInput,
    history: [
      ...previous.history,
      {
        observedAt: record.recordedAt,
        bodyMassKg: input.bodyMassKg,
        energyKcal: nutrientTotals(input).energyKcal,
        energyTargetKcal: input.targets.energyKcal,
        logComplete: input.logComplete,
        sodiumMg: record.signals.sodiumMg,
        sodiumTargetMg: input.targets.sodiumMg,
      },
    ],
  });
  try {
    context.vector.emitSignals(record);
  } catch (error) {
    stores.get(context.vector)!.set(context.crewId, previous);
    throw error;
  }
  listeners
    .get(context.vector)
    ?.get(context.crewId)
    ?.forEach((listener) => listener());
  return record;
}

export function evaluateFood(context: RiskEvaluationContext) {
  const state = getFoodState(context);
  const evaluation = baseEvaluation(
    context.crewId,
    state.input,
    state.history.length,
    context.vector.getVector(context.crewId),
  );
  if (evaluation.escalation?.level === 'urgent') return evaluation;
  const personalised = context.vector.personalise('food', context.crewId, evaluation);
  return { ...evaluation, reasons: personalised.reasons };
}

/** Five adjacent complete 24-hour logs; use the sum of targets, not a mean of percentages. */
export function lowEnergySummary(history: FoodState['history']): string | null {
  const days = history.slice(-5);
  if (
    days.length !== 5 ||
    days.some(
      (entry, index) =>
        !entry.logComplete ||
        entry.energyKcal === null ||
        entry.energyTargetKcal === null ||
        entry.energyTargetKcal <= 0 ||
        entry.energyKcal >= entry.energyTargetKcal ||
        (index > 0 &&
          Date.parse(entry.observedAt) - Date.parse(days[index - 1].observedAt) !== 86_400_000),
    )
  )
    return null;
  const energy = days.reduce((sum, entry) => sum + entry.energyKcal!, 0);
  const target = days.reduce((sum, entry) => sum + entry.energyTargetKcal!, 0);
  return `${Math.round((100 * energy) / target)}% of need for 5 days`;
}

export function highSodiumWeek(history: FoodState['history']): boolean {
  const days = history.slice(-7);
  return (
    days.length === 7 &&
    days.every(
      (entry, index) =>
        entry.logComplete &&
        entry.sodiumMg !== null &&
        entry.sodiumTargetMg !== null &&
        entry.sodiumMg > entry.sodiumTargetMg &&
        (index === 0 ||
          Date.parse(entry.observedAt) - Date.parse(days[index - 1].observedAt) === 86_400_000),
    )
  );
}
