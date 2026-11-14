import type { RiskId, RiskSignalsMap, SignalPath } from '../../risks/types';

type CatalogueRow = {
  [R in RiskId]: {
    producer: R;
    signal: Extract<keyof RiskSignalsMap[R], string>;
    unit: string;
    consumedBy: string;
  };
}[RiskId];

// Exact Signal catalogue rows, including self/vector readers (battleplan.md).
export const signalCatalogue = [
  { producer: 'cardio', signal: 'workloadW', unit: 'W', consumedBy: 'self' },
  { producer: 'cardio', signal: 'hrDeltaBpmAtWorkload', unit: 'bpm', consumedBy: 'self' },
  { producer: 'cardio', signal: 'vo2PeakPctBaseline', unit: '% baseline', consumedBy: 'self' },
  { producer: 'cardio', signal: 'exerciseLoadPct', unit: '% plan', consumedBy: 'bone, mood' },
  { producer: 'cardio', signal: 'restingHrBpm', unit: 'bpm', consumedBy: 'self' },
  { producer: 'cardio', signal: 'borgRpe', unit: 'Borg 6–20', consumedBy: 'self' },
  { producer: 'cardio', signal: 'missingReadingsCount', unit: 'readings', consumedBy: 'self' },
  { producer: 'sleep', signal: 'sleepHours', unit: 'h', consumedBy: 'mood, cardio' },
  { producer: 'sleep', signal: 'sleepEfficiencyPct', unit: '%', consumedBy: 'self' },
  { producer: 'sleep', signal: 'sleepDebtHours', unit: 'h', consumedBy: 'immune, mood, cardio' },
  { producer: 'sleep', signal: 'sleepinessKarolinska', unit: 'KSS', consumedBy: 'self' },
  {
    producer: 'sleep',
    signal: 'fatigueSamnPerelli',
    unit: 'Samn–Perelli',
    consumedBy: 'cardio, mood',
  },
  { producer: 'sleep', signal: 'bodyClockShiftHours', unit: 'h', consumedBy: 'self' },
  {
    producer: 'immune',
    signal: 'hivesPatternPct',
    unit: '% match',
    consumedBy: 'self; vector personalisation',
  },
  { producer: 'immune', signal: 'rashActive', unit: 'none', consumedBy: 'self' },
  { producer: 'immune', signal: 'whealCountBand', unit: 'category', consumedBy: 'self' },
  { producer: 'immune', signal: 'itch', unit: 'score', consumedBy: 'self' },
  { producer: 'immune', signal: 'raised', unit: 'none', consumedBy: 'self' },
  { producer: 'immune', signal: 'clearEdges', unit: 'none', consumedBy: 'self' },
  { producer: 'immune', signal: 'paleCentre', unit: 'none', consumedBy: 'self' },
  { producer: 'immune', signal: 'fadesWithin24h', unit: 'none', consumedBy: 'self' },
  { producer: 'immune', signal: 'bodyAreasCount', unit: 'areas', consumedBy: 'self' },
  { producer: 'bone', signal: 'site', unit: 'none', consumedBy: 'self' },
  { producer: 'bone', signal: 'bmdChangePctPerMonth', unit: '%/month', consumedBy: 'self' },
  { producer: 'bone', signal: 'resistanceLoadPct', unit: '% plan', consumedBy: 'cardio' },
  { producer: 'bone', signal: 'daysInFlight', unit: 'days', consumedBy: 'sans, cardio' },
  { producer: 'balance', signal: 'swayAreaEyesOpenDeg2', unit: 'deg²', consumedBy: 'self' },
  { producer: 'balance', signal: 'swayAreaEyesClosedDeg2', unit: 'deg²', consumedBy: 'self' },
  { producer: 'balance', signal: 'swayRatioEyesClosed', unit: 'ratio', consumedBy: 'self' },
  { producer: 'balance', signal: 'dizziness', unit: 'score/10', consumedBy: 'self' },
  { producer: 'balance', signal: 'motionSickness', unit: 'score/20', consumedBy: 'self' },
  { producer: 'balance', signal: 'headMovementTolerance', unit: 'score', consumedBy: 'self' },
  { producer: 'microbiome', signal: 'bristolType', unit: 'Bristol', consumedBy: 'self' },
  { producer: 'microbiome', signal: 'bloating', unit: 'score', consumedBy: 'self' },
  { producer: 'microbiome', signal: 'abdominalPain', unit: 'score', consumedBy: 'self' },
  { producer: 'microbiome', signal: 'appetite', unit: 'score', consumedBy: 'food' },
  { producer: 'microbiome', signal: 'antibiotics14d', unit: 'none', consumedBy: 'self' },
  { producer: 'microbiome', signal: 'skinInfectionSigns', unit: 'count', consumedBy: 'immune' },
  { producer: 'microbiome', signal: 'gutChangeDays', unit: 'days', consumedBy: 'self' },
  { producer: 'sans', signal: 'eye', unit: 'none', consumedBy: 'self' },
  { producer: 'sans', signal: 'amslerDistortion', unit: 'category', consumedBy: 'self' },
  { producer: 'sans', signal: 'nearVisionChangeLines', unit: 'lines', consumedBy: 'self' },
  { producer: 'sans', signal: 'headache', unit: 'score/10', consumedBy: 'self' },
  { producer: 'sans', signal: 'octThicknessChangeUm', unit: 'µm', consumedBy: 'self' },
  { producer: 'sans', signal: 'cabinCo2MmHg', unit: 'mmHg', consumedBy: 'self' },
  {
    producer: 'food',
    signal: 'foodsEaten',
    unit: 'events',
    consumedBy: 'vector recentFoods; immune',
  },
  { producer: 'food', signal: 'allergensEaten', unit: 'events', consumedBy: 'immune' },
  { producer: 'food', signal: 'energyPctOfNeed', unit: '% need', consumedBy: 'cardio' },
  { producer: 'food', signal: 'proteinGPerKg', unit: 'g/kg', consumedBy: 'bone' },
  { producer: 'food', signal: 'sodiumMg', unit: 'mg', consumedBy: 'bone, sans' },
  { producer: 'food', signal: 'calciumMg', unit: 'mg', consumedBy: 'bone' },
  { producer: 'food', signal: 'vitaminDIu', unit: 'IU', consumedBy: 'bone' },
  { producer: 'food', signal: 'fibreG', unit: 'g', consumedBy: 'microbiome' },
  { producer: 'food', signal: 'bodyMassKg', unit: 'kg', consumedBy: 'cardio' },
  { producer: 'food', signal: 'bodyMassChangeKg', unit: 'kg', consumedBy: 'self' },
  { producer: 'mood', signal: 'mood', unit: 'score/10', consumedBy: 'self' },
  { producer: 'mood', signal: 'stress', unit: 'score/10', consumedBy: 'sleep' },
  { producer: 'mood', signal: 'workload', unit: 'score/10', consumedBy: 'sleep' },
  { producer: 'mood', signal: 'isolation', unit: 'score/10', consumedBy: 'self' },
  { producer: 'mood', signal: 'crewConflict', unit: 'none', consumedBy: 'self' },
] as const satisfies readonly CatalogueRow[];

export interface SignalLink {
  producer: RiskId;
  consumer: RiskId;
  signal: SignalPath;
  field: string;
  unit: string;
}
const risks: readonly string[] = [
  'cardio',
  'sleep',
  'immune',
  'bone',
  'balance',
  'microbiome',
  'sans',
  'food',
  'mood',
];
export const signalLinks: SignalLink[] = signalCatalogue.flatMap((row) =>
  row.consumedBy
    .split(/[,;]/)
    .map((reader) => reader.trim())
    .filter((reader): reader is RiskId => risks.includes(reader))
    .map((consumer) => ({
      producer: row.producer,
      consumer,
      signal: `${row.producer}.${row.signal}` as SignalPath,
      field: row.signal,
      unit: row.unit,
    })),
);
