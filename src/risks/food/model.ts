import type {
  BaselineValue,
  CrewVector,
  Escalation,
  RiskEvaluation,
  RiskSignalRecord,
} from '../types';
import { menu, type Nutrients } from './menu';

export interface Meal {
  id: string;
  itemId: string;
  grams: number;
  eatenAt: string;
  ingredients: string;
  allergens: string[] | null;
  confirmed: boolean;
}

export interface DailyTargets {
  energyKcal: number | null;
  proteinGPerKg: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
}

export interface FoodInput {
  observedAt: string;
  meals: Meal[];
  logComplete: boolean;
  bodyMassKg: number | null;
  baselineKey: string | null;
  targets: DailyTargets;
  unableToEatDrink24h: boolean | null;
  unplannedLossOver10Pct: boolean | null;
  heightCm: number | null;
  unplannedLossPct: number | null;
  acuteIllnessNoIntake5d: boolean | null;
  somethingElse: boolean;
}

export const emptyInput = (observedAt = new Date().toISOString()): FoodInput => ({
  observedAt,
  meals: [],
  logComplete: false,
  bodyMassKg: null,
  baselineKey: null,
  targets: {
    energyKcal: null,
    proteinGPerKg: null,
    sodiumMg: null,
    calciumMg: null,
    vitaminDIu: null,
  },
  unableToEatDrink24h: null,
  unplannedLossOver10Pct: null,
  heightCm: null,
  unplannedLossPct: null,
  acuteIllnessNoIntake5d: null,
  somethingElse: false,
});

export function utcTimestamp(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error('Enter a timestamp with Z or a UTC offset.');
  }
  const datePart = value.slice(0, 10);
  if (new Date(`${datePart}T00:00:00Z`).toISOString().slice(0, 10) !== datePart) {
    throw new Error('Enter a valid calendar date.');
  }
  return new Date(value).toISOString();
}

function checkNumber(
  value: number | null,
  min: number,
  max: number,
  label: string,
  exclusive = false,
) {
  if (
    value !== null &&
    (!Number.isFinite(value) || (exclusive ? value <= min : value < min) || value > max)
  ) {
    throw new Error(`${label} is outside the input range.`);
  }
}

export function validateInput(input: FoodInput): void {
  const end = Date.parse(utcTimestamp(input.observedAt));
  checkNumber(input.bodyMassKg, 0, 500, 'Body mass', true);
  checkNumber(input.heightCm, 0, 300, 'Height', true);
  checkNumber(input.unplannedLossPct, 0, 100, 'Weight loss');
  for (const value of Object.values(input.targets))
    checkNumber(value, 0, Number.MAX_VALUE, 'Daily target', true);
  const ids = new Set<string>();
  for (const meal of input.meals) {
    if (!meal.id.trim() || ids.has(meal.id)) throw new Error('Meal IDs must be unique.');
    ids.add(meal.id);
    if (!menu.some((item) => item.id === meal.itemId)) throw new Error('Select a menu item.');
    checkNumber(meal.grams, 0, Number.MAX_VALUE, 'Portion', true);
    if (Date.parse(utcTimestamp(meal.eatenAt)) > end)
      throw new Error('Consumed time follows observation time.');
    if (meal.confirmed && (!meal.ingredients.trim() || meal.allergens === null)) {
      throw new Error('Confirm ingredients and review allergen tags.');
    }
    if (meal.allergens?.some((tag) => !tag.trim())) throw new Error('Remove empty allergen tags.');
  }
}

export function windowMeals(input: FoodInput): Meal[] {
  const end = Date.parse(input.observedAt);
  return input.meals.filter(
    (meal) => Date.parse(meal.eatenAt) > end - 86_400_000 && Date.parse(meal.eatenAt) <= end,
  );
}

export function nutrientTotals(input: FoodInput): Nutrients {
  const meals = windowMeals(input);
  const keys: (keyof Nutrients)[] = [
    'energyKcal',
    'proteinG',
    'sodiumMg',
    'calciumMg',
    'vitaminDIu',
    'fibreG',
  ];
  return Object.fromEntries(
    keys.map((key) => {
      const values = meals.map((meal) =>
        meal.confirmed ? menu.find((item) => item.id === meal.itemId)?.per100g[key] : null,
      );
      const missing =
        (!meals.length && !input.logComplete) || values.some((value) => value == null);
      const total = values.reduce<number>(
        (sum, value, index) => sum + ((value ?? 0) * meals[index].grams) / 100,
        0,
      );
      return [key, missing || !Number.isFinite(total) ? null : total];
    }),
  ) as unknown as Nutrients;
}

export function baselineKey(baseline: BaselineValue<'bodyMassKg'>): string {
  return JSON.stringify([
    baseline.comparisonGroupId,
    baseline.methodId,
    baseline.contextKey,
    baseline.recordedAt,
    baseline.sourceSessionIds,
  ]);
}

export function massBaseline(
  input: FoodInput,
  vector: CrewVector | null,
): BaselineValue<'bodyMassKg'> | null {
  const matches =
    vector?.baselines.entries.filter(
      (entry): entry is BaselineValue<'bodyMassKg'> =>
        entry.metric === 'bodyMassKg' && baselineKey(entry) === input.baselineKey,
    ) ?? [];
  if (matches.length !== 1) return null;
  const baseline = matches[0];
  return baseline.source === 'simulated-crew' &&
    vector?.simulated === true &&
    baseline.evidence === 'supported' &&
    baseline.unit === 'kg' &&
    baseline.value !== null &&
    Number.isFinite(baseline.value) &&
    baseline.value > 0 &&
    baseline.value <= 500 &&
    baseline.count >= 1 &&
    baseline.sourceSessionIds.length >= 1 &&
    baseline.recordedAt !== null &&
    Date.parse(baseline.recordedAt) < Date.parse(input.observedAt)
    ? baseline
    : null;
}

export function mustScore(input: FoodInput): number | null {
  if (
    input.bodyMassKg === null ||
    input.heightCm === null ||
    input.unplannedLossPct === null ||
    input.acuteIllnessNoIntake5d === null
  )
    return null;
  const bmi = input.bodyMassKg / (input.heightCm / 100) ** 2;
  return (
    (bmi > 20 ? 0 : bmi >= 18.5 ? 1 : 2) +
    (input.unplannedLossPct < 5 ? 0 : input.unplannedLossPct <= 10 ? 1 : 2) +
    (input.acuteIllnessNoIntake5d ? 2 : 0)
  );
}

export function foodEscalation(
  input: FoodInput,
  checkIns: number,
  vector: CrewVector | null,
): Escalation | null {
  if (input.unableToEatDrink24h)
    return { level: 'urgent', trigger: 'red-flag', text: 'Unable to eat or drink for 24 hours' };
  if (
    input.unplannedLossOver10Pct ||
    (input.unplannedLossPct !== null && input.unplannedLossPct > 10)
  ) {
    return { level: 'urgent', trigger: 'red-flag', text: 'Unplanned weight loss over 10%' };
  }
  if (
    vector?.baselines.entries.some(
      (entry) =>
        entry.metric === 'bodyMassKg' &&
        baselineKey(entry) === input.baselineKey &&
        entry.evidence === 'conflicting',
    )
  ) {
    return {
      level: 'next-pmc',
      trigger: 'conflicting',
      text: 'Body mass reference evidence conflicts',
    };
  }
  if (input.somethingElse)
    return { level: 'next-pmc', trigger: 'something-else', text: 'Another concern reported' };
  const score = mustScore(input);
  if (score !== null && score >= 2)
    return {
      level: 'next-pmc',
      trigger: 'indicative-score',
      text: 'MUST score meets the follow-up threshold',
    };
  const totals = nutrientTotals(input);
  if (
    checkIns >= 2 &&
    (!input.logComplete ||
      Object.values(totals).some((value) => value === null) ||
      Object.values(input.targets).some((value) => value === null) ||
      input.bodyMassKg === null ||
      input.unableToEatDrink24h === null ||
      input.unplannedLossOver10Pct === null)
  ) {
    return {
      level: 'next-pmc',
      trigger: 'no-pattern',
      text: 'Required observations missing after two check-ins',
    };
  }
  return null;
}

export function buildRecord(
  crewId: string,
  input: FoodInput,
  vector: CrewVector | null,
): RiskSignalRecord<'food'> {
  validateInput(input);
  if (
    !crewId.trim() ||
    (vector &&
      (vector.crewId !== crewId || !vector.simulated || vector.source !== 'simulated-crew'))
  ) {
    throw new Error('Use a simulated crew for this simulated menu.');
  }
  const meals = windowMeals(input).filter((meal) => meal.confirmed);
  const reviewed = meals.length > 0 || (input.logComplete && windowMeals(input).length === 0);
  const totals = nutrientTotals(input);
  const baseline = massBaseline(input, vector);
  const signals: RiskSignalRecord<'food'>['signals'] = {
    foodsEaten: reviewed
      ? meals.map((meal) => ({
          mealId: meal.id,
          foodName: menu.find((item) => item.id === meal.itemId)!.name,
          eatenAt: utcTimestamp(meal.eatenAt),
        }))
      : null,
    allergensEaten: reviewed
      ? meals.flatMap((meal) =>
          (meal.allergens ?? []).map((allergen) => ({
            mealId: meal.id,
            allergen: allergen.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' '),
            eatenAt: utcTimestamp(meal.eatenAt),
          })),
        )
      : null,
    energyPctOfNeed:
      totals.energyKcal !== null && input.targets.energyKcal !== null
        ? (100 * totals.energyKcal) / input.targets.energyKcal
        : null,
    proteinGPerKg:
      totals.proteinG !== null && input.bodyMassKg !== null
        ? totals.proteinG / input.bodyMassKg
        : null,
    sodiumMg: totals.sodiumMg,
    calciumMg: totals.calciumMg,
    vitaminDIu: totals.vitaminDIu,
    fibreG: totals.fibreG,
    bodyMassKg: input.bodyMassKg,
    bodyMassChangeKg:
      input.bodyMassKg !== null && baseline?.value != null
        ? input.bodyMassKg - baseline.value
        : null,
  };
  checkNumber(signals.energyPctOfNeed, 0, 500, 'Energy percentage');
  checkNumber(signals.proteinGPerKg, 0, 20, 'Protein per kg');
  checkNumber(signals.sodiumMg, 0, 30000, 'Sodium');
  checkNumber(signals.calciumMg, 0, 10000, 'Calcium');
  checkNumber(signals.vitaminDIu, 0, 100000, 'Vitamin D');
  checkNumber(signals.fibreG, 0, 200, 'Fibre');
  return {
    risk: 'food',
    crewId,
    recordedAt: utcTimestamp(input.observedAt),
    source: 'simulated-crew',
    simulated: true,
    signals,
  };
}

export function baseEvaluation(
  crewId: string,
  input: FoodInput,
  checkIns: number,
  vector: CrewVector | null,
): RiskEvaluation {
  const escalation = foodEscalation(input, checkIns, vector);
  const baseline = massBaseline(input, vector);
  const change =
    baseline?.value != null && input.bodyMassKg !== null ? input.bodyMassKg - baseline.value : null;
  const urgent = escalation?.level === 'urgent';
  return {
    risk: 'food',
    crewId,
    kind: 'change-vs-baseline',
    value: urgent ? null : change,
    unit: 'kg',
    label: urgent
      ? 'Contact the flight surgeon now'
      : change === null
        ? 'Baseline needed'
        : 'Body mass vs baseline',
    reasons: [],
    evidence:
      escalation?.trigger === 'conflicting'
        ? 'conflicting'
        : change === null
          ? 'insufficient'
          : 'supported',
    simulated: true,
    escalation,
  };
}

export function demoInput(): FoodInput {
  return {
    ...emptyInput('2026-11-14T11:00:00.000Z'),
    meals: [
      {
        id: 'sim-cdr-shrimp-20261114',
        itemId: 'sim-shrimp-rice',
        grams: 250,
        eatenAt: '2026-11-14T08:00:00.000Z',
        ingredients: menu[0].ingredients,
        allergens: ['shellfish'],
        confirmed: true,
      },
    ],
    bodyMassKg: 70,
    unableToEatDrink24h: false,
    unplannedLossOver10Pct: false,
    targets: {
      energyKcal: 2500,
      proteinGPerKg: 1.2,
      sodiumMg: 2300,
      calciumMg: 1000,
      vitaminDIu: 600,
    },
  };
}
