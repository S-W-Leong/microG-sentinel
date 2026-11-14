import { describe, expect, it } from 'vitest';
import type { AnyRiskSignalRecord, RiskId } from '../risks/types';
import { catalogue, validateRecord } from './validation';

const now = Date.parse('2026-11-14T11:00:00.000Z');
function record(risk: RiskId, field: string, value: unknown): AnyRiskSignalRecord {
  const signals = Object.fromEntries(
    Object.keys(catalogue[risk]).map((key) => [key, null as unknown]),
  );
  if (risk === 'cardio') signals.workloadW = 0;
  if (risk === 'bone') signals.site = 'total-hip';
  if (risk === 'sans') signals.eye = 'left-eye';
  signals[field] = value;
  return {
    crewId: 'SIM-CDR',
    source: 'simulated-crew',
    simulated: true,
    recordedAt: new Date(now).toISOString(),
    risk,
    signals,
  } as unknown as AnyRiskSignalRecord;
}

const bounds: [RiskId, string, number, number, boolean?, boolean?][] = [
  ['cardio', 'workloadW', 0, 2000],
  ['cardio', 'hrDeltaBpmAtWorkload', -300, 300],
  ['cardio', 'vo2PeakPctBaseline', 0, Infinity],
  ['cardio', 'exerciseLoadPct', 0, 500],
  ['cardio', 'restingHrBpm', 0, 300, false, true],
  ['cardio', 'borgRpe', 6, 20, true],
  ['cardio', 'missingReadingsCount', 0, Infinity, true],
  ['sleep', 'sleepHours', 0, 24],
  ['sleep', 'sleepEfficiencyPct', 0, 100],
  ['sleep', 'sleepDebtHours', 0, 24],
  ['sleep', 'sleepinessKarolinska', 1, 9, true],
  ['sleep', 'fatigueSamnPerelli', 1, 7, true],
  ['sleep', 'bodyClockShiftHours', -12, 12, false, true],
  ['immune', 'hivesPatternPct', 0, 100],
  ['immune', 'whealCountBand', 0, 3, true],
  ['immune', 'itch', 0, 3, true],
  ['immune', 'bodyAreasCount', 0, 6, true],
  ['bone', 'bmdChangePctPerMonth', -Infinity, Infinity],
  ['bone', 'resistanceLoadPct', 0, 500],
  ['bone', 'daysInFlight', 0, 10000, true],
  ['balance', 'swayAreaEyesOpenDeg2', 0, 32400],
  ['balance', 'swayAreaEyesClosedDeg2', 0, 32400],
  ['balance', 'swayRatioEyesClosed', 0, Infinity],
  ['balance', 'dizziness', 0, 10, true],
  ['balance', 'motionSickness', 0, 20, true],
  ['balance', 'headMovementTolerance', 0, 3, true],
  ['microbiome', 'bristolType', 1, 7, true],
  ['microbiome', 'bloating', 0, 3, true],
  ['microbiome', 'abdominalPain', 0, 3, true],
  ['microbiome', 'appetite', 0, 3, true],
  ['microbiome', 'skinInfectionSigns', 0, 3, true],
  ['microbiome', 'gutChangeDays', 0, 365, true],
  ['sans', 'amslerDistortion', 0, 3, true],
  ['sans', 'nearVisionChangeLines', -20, 20],
  ['sans', 'headache', 0, 10, true],
  ['sans', 'octThicknessChangeUm', -1000, 1000],
  ['sans', 'cabinCo2MmHg', 0, 20],
  ['food', 'energyPctOfNeed', 0, 500],
  ['food', 'proteinGPerKg', 0, 20],
  ['food', 'sodiumMg', 0, 30000],
  ['food', 'calciumMg', 0, 10000],
  ['food', 'vitaminDIu', 0, 100000],
  ['food', 'fibreG', 0, 200],
  ['food', 'bodyMassKg', 0, 500, false, true],
  ['food', 'bodyMassChangeKg', -500, 500],
  ['mood', 'mood', 0, 10, true],
  ['mood', 'stress', 0, 10, true],
  ['mood', 'workload', 0, 10, true],
  ['mood', 'isolation', 0, 10, true],
];

describe('complete signal catalogue', () => {
  it.each(bounds)(
    '%s.%s enforces inclusive/exclusive ranges and numeric type',
    (risk, field, min, max, integer = false, exclusive = false) => {
      const lower = Number.isFinite(min) ? min + (exclusive ? 0.1 : 0) : -100;
      for (const value of [null, lower, Number.isFinite(max) ? max : 100000])
        expect(() => validateRecord(record(risk, field, value), now)).not.toThrow();
      const invalid: unknown[] = [NaN, Infinity, -Infinity, undefined, '1', false];
      if (Number.isFinite(min)) invalid.push(exclusive ? min : min - 1);
      if (Number.isFinite(max)) invalid.push(max + 1);
      if (integer) invalid.push(min + 0.5);
      for (const value of invalid)
        expect(() => validateRecord(record(risk, field, value), now)).toThrow();
    },
  );
  it.each([
    ['immune', 'rashActive'],
    ['immune', 'raised'],
    ['immune', 'clearEdges'],
    ['immune', 'paleCentre'],
    ['immune', 'fadesWithin24h'],
    ['microbiome', 'antibiotics14d'],
    ['mood', 'crewConflict'],
  ] as [RiskId, string][])('%s.%s preserves booleans and null', (risk, field) => {
    for (const value of [true, false, null])
      expect(() => validateRecord(record(risk, field, value), now)).not.toThrow();
    for (const value of [0, 1, 'true', undefined])
      expect(() => validateRecord(record(risk, field, value), now)).toThrow();
  });
  it.each([
    ['bone', 'site', ['lumbar-spine', 'total-hip', 'femoral-neck']],
    ['sans', 'eye', ['left-eye', 'right-eye']],
  ] as [RiskId, string, string[]][])('%s.%s validates enums', (risk, field, values) => {
    for (const value of [...values, null])
      expect(() => validateRecord(record(risk, field, value), now)).not.toThrow();
    for (const value of ['other', 0, undefined])
      expect(() => validateRecord(record(risk, field, value), now)).toThrow();
  });
  it('rejects malformed events rather than inventing or silently dropping values', () => {
    for (const event of [
      null,
      {},
      { mealId: 'meal', allergen: '', eatenAt: new Date(now).toISOString() },
      { mealId: '', allergen: 'milk', eatenAt: new Date(now).toISOString() },
      { mealId: 'meal', allergen: 'milk', eatenAt: new Date(now).toISOString(), extra: 1 },
    ]) {
      expect(() => validateRecord(record('food', 'allergensEaten', [event]), now)).toThrow();
    }
  });
});
