import type { RiskEvaluation, RiskId, VectorApi } from '../../risks/types';
import { signalLinks, type SignalLink } from './links';

export const signalLabels: Record<string, string> = {
  exerciseLoadPct: 'Exercise load',
  sleepHours: 'Sleep',
  sleepDebtHours: 'Sleep debt',
  fatigueSamnPerelli: 'Fatigue',
  resistanceLoadPct: 'Resistance load',
  daysInFlight: 'Flight days',
  appetite: 'Appetite',
  skinInfectionSigns: 'Skin signs',
  foodsEaten: 'Meals',
  allergensEaten: 'Allergens',
  energyPctOfNeed: 'Energy',
  proteinGPerKg: 'Protein',
  sodiumMg: 'Sodium',
  calciumMg: 'Calcium',
  vitaminDIu: 'Vitamin D',
  fibreG: 'Fibre',
  bodyMassKg: 'Body mass',
  stress: 'Stress',
  workload: 'Workload',
};
export const number = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('en', { maximumFractionDigits }).format(value);
export function age(at: string, asOf: string) {
  const hours = (Date.parse(asOf) - Date.parse(at)) / 3600000;
  return hours < 1 ? `${Math.floor(hours * 60)} min ago` : `${number(hours)} h ago`;
}
export interface Connection extends SignalLink {
  active: boolean;
  value: string;
  reason: string | null;
}
export function readConnections(
  vector: VectorApi,
  crewId: string,
  evaluations: Partial<Record<RiskId, RiskEvaluation>> = {},
): Connection[] {
  const asOf = vector.getVector(crewId)?.exposures.asOf;
  const snapshots = new Map(
    signalLinks.map((link) => [link.producer, vector.getSignals(link.producer, crewId, 24)]),
  );
  return signalLinks.map((link) => {
    const record = snapshots.get(link.producer);
    let value: unknown = record
      ? (record.signals as unknown as Record<string, unknown>)[link.field]
      : null;
    if (Array.isArray(value) && asOf) {
      value = value.filter(
        (event) =>
          Date.parse(event.eatenAt) > Date.parse(asOf) - 86400000 &&
          Date.parse(event.eatenAt) <= Date.parse(asOf),
      );
    }
    const active = value !== null && value !== undefined;
    let display = 'Not recorded';
    if (active) {
      if (Array.isArray(value))
        display =
          value.length === 0
            ? 'None recorded'
            : value
                .map(
                  (event) =>
                    `${event.allergen ?? event.foodName} ${asOf ? age(event.eatenAt, asOf) : ''}`,
                )
                .join('; ');
      else if (typeof value === 'number') display = `${number(value)} ${link.unit}`;
      else display = value === true ? 'Yes' : value === false ? 'No' : String(value);
    }
    const evaluation = evaluations[link.consumer];
    const reason =
      active && evaluation?.value !== null && evaluation?.escalation?.level !== 'urgent'
        ? (evaluation?.reasons.find(
            (reason) => reason.signal === link.signal && reason.sourceRisk === link.producer,
          )?.text ?? null)
        : null;
    return { ...link, active, value: display, reason };
  });
}
