import type {
  AnyRiskSignalRecord,
  BaselineEntry,
  CrewVector,
  RiskId,
  RiskSignalRecord,
  VectorApi,
} from '../types';

// A boundary double, not a replacement vector implementation: no exposure rules.
export function testVector(crewId = 'SIM-CDR', entries: BaselineEntry[] = []) {
  const emitted: AnyRiskSignalRecord[] = [];
  const person: CrewVector = {
    crewId,
    source: 'simulated-crew',
    simulated: true,
    traits: {
      allergies: ['shellfish'],
      chronotype: null,
      geneticFlags: null,
      motionSicknessHistory: null,
    },
    baselines: { entries },
    exposures: {
      asOf: '2026-11-14T11:00:00.000Z',
      sinceHours: 24,
      recentFoods: null,
      allergensEaten: null,
      foodRecordRefs: [],
      sleepDebtHours: null,
      exerciseLoadPct: null,
      resistanceLoadPct: null,
      daysInFlight: null,
      cabinCo2MmHg: null,
      sodiumMg: null,
      calciumMg: null,
      vitaminDIu: null,
      fibreG: null,
      energyPctOfNeed: null,
      bodyMassKg: null,
      refs: {
        sleepDebtHours: null,
        exerciseLoadPct: null,
        resistanceLoadPct: null,
        daysInFlight: null,
        cabinCo2MmHg: null,
        sodiumMg: null,
        calciumMg: null,
        vitaminDIu: null,
        fibreG: null,
        energyPctOfNeed: null,
        bodyMassKg: null,
      },
    },
  };
  let personalisationCalls = 0;
  const api: VectorApi = {
    getVector: (id) => (id === crewId ? structuredClone(person) : null),
    getExposures: (id) => (id === crewId ? structuredClone(person.exposures) : null),
    getSignals: <R extends RiskId>(risk: R, id: string) => {
      const matching = emitted
        .filter((x) => x.risk === risk && x.crewId === id)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      return structuredClone(matching[matching.length - 1] ?? null) as RiskSignalRecord<R> | null;
    },
    subscribe: () => () => {},
    emitSignals: (record) => {
      emitted.push(structuredClone(record));
    },
    personalise: (_risk, _crew, base) => {
      personalisationCalls++;
      return { adjustedPct: base.kind === 'pattern-match' ? base.value : null, reasons: [] };
    },
  };
  return { api, person, emitted, calls: () => personalisationCalls };
}
