import type { AnyRiskSignalRecord, RiskId, RiskSignalsMap } from '../risks/types';

type Check = (value: unknown) => boolean;
const number =
  (min: number, max = Infinity, integer = false, exclusive = false): Check =>
  (value) =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (exclusive ? value > min : value >= min) &&
    value <= max &&
    (!integer || Number.isInteger(value));
const boolean: Check = (value) => typeof value === 'boolean';
const choice =
  (...values: string[]): Check =>
  (value) =>
    values.includes(value as string);
const rating = number(0, 3, true);
export const owns = (value: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

export const catalogue: { [R in RiskId]: Record<keyof RiskSignalsMap[R], Check> } = {
  cardio: {
    workloadW: number(0, 2000),
    hrDeltaBpmAtWorkload: number(-300, 300),
    vo2PeakPctBaseline: number(0),
    exerciseLoadPct: number(0, 500),
    restingHrBpm: number(0, 300, false, true),
    borgRpe: number(6, 20, true),
    missingReadingsCount: number(0, Infinity, true),
  },
  sleep: {
    sleepHours: number(0, 24),
    sleepEfficiencyPct: number(0, 100),
    sleepDebtHours: number(0, 24),
    sleepinessKarolinska: number(1, 9, true),
    fatigueSamnPerelli: number(1, 7, true),
    bodyClockShiftHours: number(-12, 12, false, true),
  },
  immune: {
    hivesPatternPct: number(0, 100),
    rashActive: boolean,
    whealCountBand: rating,
    itch: rating,
    raised: boolean,
    clearEdges: boolean,
    paleCentre: boolean,
    fadesWithin24h: boolean,
    bodyAreasCount: number(0, 6, true),
  },
  bone: {
    site: choice('lumbar-spine', 'total-hip', 'femoral-neck'),
    bmdChangePctPerMonth: number(-Infinity),
    resistanceLoadPct: number(0, 500),
    daysInFlight: number(0, 10000, true),
  },
  balance: {
    swayAreaEyesOpenDeg2: number(0, 32400),
    swayAreaEyesClosedDeg2: number(0, 32400),
    swayRatioEyesClosed: number(0),
    dizziness: number(0, 10, true),
    motionSickness: number(0, 20, true),
    headMovementTolerance: rating,
  },
  microbiome: {
    bristolType: number(1, 7, true),
    bloating: rating,
    abdominalPain: rating,
    appetite: rating,
    antibiotics14d: boolean,
    skinInfectionSigns: rating,
    gutChangeDays: number(0, 365, true),
  },
  sans: {
    eye: choice('left-eye', 'right-eye'),
    amslerDistortion: rating,
    nearVisionChangeLines: number(-20, 20),
    headache: number(0, 10, true),
    octThicknessChangeUm: number(-1000, 1000),
    cabinCo2MmHg: number(0, 20),
  },
  food: {
    foodsEaten: Array.isArray,
    allergensEaten: Array.isArray,
    energyPctOfNeed: number(0, 500),
    proteinGPerKg: number(0, 20),
    sodiumMg: number(0, 30000),
    calciumMg: number(0, 10000),
    vitaminDIu: number(0, 100000),
    fibreG: number(0, 200),
    bodyMassKg: number(0, 500, false, true),
    bodyMassChangeKg: number(-500, 500),
  },
  mood: {
    mood: number(0, 10, true),
    stress: number(0, 10, true),
    workload: number(0, 10, true),
    isolation: number(0, 10, true),
    crewConflict: boolean,
  },
};

export function exactKeys(
  value: unknown,
  keys: string[],
  name: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(name + ' must be an object');
  if (Object.keys(value).length !== keys.length || keys.some((key) => !owns(value, key))) {
    throw new Error(name + ' requires exactly: ' + keys.join(', '));
  }
}

export function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function timestamp(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    throw new Error('Timestamp requires a full ISO date-time with timezone');
  }
  const date = value.slice(0, 10);
  const time = Date.parse(value);
  if (
    !Number.isFinite(time) ||
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date ||
    Number(value.slice(11, 13)) > 23
  ) {
    throw new Error('Invalid timestamp');
  }
  return time;
}

export function normaliseAllergen(value: string): string {
  const normal = value.trim().normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    shrimp: 'shellfish',
    prawn: 'shellfish',
    prawns: 'shellfish',
    crab: 'shellfish',
    lobster: 'shellfish',
    clam: 'shellfish',
    mussel: 'shellfish',
    oyster: 'shellfish',
    scallop: 'shellfish',
    peanut: 'peanuts',
    egg: 'eggs',
    soya: 'soy',
    dairy: 'milk',
    'tree nut': 'tree-nuts',
  };
  return owns(aliases, normal) ? aliases[normal] : normal;
}

export function validateRecord(record: AnyRiskSignalRecord, now: number): void {
  exactKeys(record, ['risk', 'crewId', 'recordedAt', 'simulated', 'source', 'signals'], 'Record');
  if (!owns(catalogue, record.risk)) throw new Error('Unknown risk');
  const observed = timestamp(record.recordedAt);
  if (observed > now) throw new Error('Future recordedAt');
  const fields = catalogue[record.risk];
  exactKeys(record.signals, Object.keys(fields), record.risk + ' signals');
  for (const [key, check] of Object.entries(fields)) {
    const value = (record.signals as unknown as Record<string, unknown>)[key];
    if (value !== null && !check(value)) throw new Error('Invalid ' + record.risk + '.' + key);
  }
  if (
    record.risk === 'cardio' &&
    record.signals.hrDeltaBpmAtWorkload !== null &&
    record.signals.workloadW === null
  )
    throw new Error('HR delta requires workloadW');
  if (
    record.risk === 'bone' &&
    record.signals.bmdChangePctPerMonth !== null &&
    record.signals.site === null
  )
    throw new Error('BMD change requires site');
  if (
    record.risk === 'sans' &&
    (record.signals.nearVisionChangeLines !== null ||
      record.signals.octThicknessChangeUm !== null) &&
    record.signals.eye === null
  )
    throw new Error('Vision/OCT change requires eye');
  if (record.risk === 'food') {
    for (const field of ['foodsEaten', 'allergensEaten'] as const) {
      const name = field === 'foodsEaten' ? 'foodName' : 'allergen';
      for (const event of record.signals[field] ?? []) {
        exactKeys(event, ['mealId', name, 'eatenAt'], field);
        if (!nonempty(event.mealId) || !nonempty(event[name]))
          throw new Error('Invalid ' + field + ' identity/name');
        const eaten = timestamp(event.eatenAt);
        if (eaten <= observed - 24 * 3600000 || eaten > observed)
          throw new Error('Food event outside snapshot 24 h window');
      }
    }
  }
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return (
      '{' +
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => JSON.stringify(key) + ':' + canonical(entry))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}
