import type { RiskEvaluationContext, VectorApi } from '../types';
import { baseEvaluation, buildRecord, emptyInput, type FoodInput } from './model';

export interface FoodState {
  input: FoodInput;
  history: { observedAt: string; bodyMassKg: number | null }[];
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
    history: [...previous.history, { observedAt: record.recordedAt, bodyMassKg: input.bodyMassKg }],
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
