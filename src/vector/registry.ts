import type { BaselineEntry, BaselineMetric, BaselineUnits, CrewVector } from '../risks/types';
import { canonical, exactKeys, nonempty, normaliseAllergen, owns, timestamp } from './validation';

export type Registration = Omit<CrewVector, 'exposures'> & { comparisonGroupId: string };
const units: BaselineUnits = {
  hrAtWorkloadBpm: 'bpm',
  restingHrBpm: 'bpm',
  vo2PeakLPerMin: 'L/min',
  vo2PeakMlPerKgPerMin: 'mL/kg/min',
  sleepHours: 'h',
  bmdGPerCm2: 'g/cm²',
  swayAreaEyesOpenDeg2: 'deg²',
  swayAreaEyesClosedDeg2: 'deg²',
  nearVisionLines: 'lines',
  octThicknessUm: 'µm',
  bodyMassKg: 'kg',
  mood: 'score/10',
};

function validValue(metric: BaselineMetric, value: number | null): boolean {
  if (value === null || !Number.isFinite(value)) return false;
  if (metric === 'nearVisionLines') return value >= 0 && value <= 20;
  if (metric === 'sleepHours') return value >= 0 && value <= 24;
  if (metric === 'mood') return value >= 0 && value <= 10;
  return value > 0;
}

function validateBaseline(entry: BaselineEntry, registration: Registration): void {
  if (!owns(units, entry.metric) || entry.unit !== units[entry.metric])
    throw new Error('Invalid baseline metric/unit');
  if (
    entry.source !== registration.source ||
    entry.comparisonGroupId !== registration.comparisonGroupId
  )
    throw new Error('Baseline source/series mismatch');
  if (!nonempty(entry.methodId) || !nonempty(entry.contextKey))
    throw new Error('Missing baseline method/context');
  if (
    !Array.isArray(entry.sourceSessionIds) ||
    !entry.sourceSessionIds.every(nonempty) ||
    !Number.isInteger(entry.count) ||
    entry.count < 0 ||
    entry.count !== entry.sourceSessionIds.length ||
    new Set(entry.sourceSessionIds).size !== entry.count
  )
    throw new Error('Baseline count requires distinct independent session IDs');
  if (
    !['supported', 'insufficient', 'conflicting'].includes(entry.evidence) ||
    (entry.evidence === 'supported') !== (entry.value !== null)
  )
    throw new Error('Baseline evidence/value mismatch');
  if (
    entry.value !== null &&
    (!validValue(entry.metric, entry.value) ||
      entry.count < (entry.metric === 'hrAtWorkloadBpm' ? 2 : 1))
  )
    throw new Error('Invalid supported baseline');
  if (entry.recordedAt !== null) timestamp(entry.recordedAt);
  if (entry.metric === 'bmdGPerCm2') {
    if (!['lumbar-spine', 'total-hip', 'femoral-neck'].includes(entry.contextKey))
      throw new Error('BMD baseline requires bone site');
  } else if (entry.metric === 'nearVisionLines' || entry.metric === 'octThicknessUm') {
    if (!['left-eye', 'right-eye'].includes(entry.contextKey))
      throw new Error('Vision baseline requires eye');
  } else if (entry.metric === 'hrAtWorkloadBpm') {
    let context: unknown;
    try {
      context = JSON.parse(entry.contextKey);
    } catch {
      throw new Error('HR baseline requires stage context');
    }
    if (
      !Array.isArray(context) ||
      context.length !== 7 ||
      JSON.stringify(context) !== entry.contextKey
    )
      throw new Error('HR baseline requires canonical stage context');
    const [device, protocol, posture, stage, workload, duration, preceding] = context;
    if (
      ![device, protocol, posture].every(nonempty) ||
      !Number.isInteger(stage) ||
      stage < 0 ||
      !Number.isFinite(workload) ||
      workload < 0 ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Array.isArray(preceding) ||
      !preceding.every(
        (pair) =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          Number.isFinite(pair[0]) &&
          pair[0] >= 0 &&
          Number.isFinite(pair[1]) &&
          pair[1] > 0,
      )
    )
      throw new Error('Invalid HR stage context');
  } else if (
    !['swayAreaEyesOpenDeg2', 'swayAreaEyesClosedDeg2'].includes(entry.metric) &&
    entry.contextKey !== 'default'
  )
    throw new Error('Baseline requires default context');
}

export function prepareRegistration(input: Registration): Registration {
  const registration = structuredClone(input);
  const { crewId, source, simulated, comparisonGroupId, traits } = registration;
  if (!nonempty(crewId) || !nonempty(comparisonGroupId) || typeof simulated !== 'boolean')
    throw new Error('Invalid registration identity');
  if (source === 'simulated-crew') {
    if (!/^SIM-[A-Z0-9-]+$/.test(crewId) || !simulated)
      throw new Error('Simulated registration namespace/flag mismatch');
  } else if (source === 'nasa-research-replay' || source === 'user-entered') {
    const prefix = source === 'nasa-research-replay' ? 'RESEARCH:MR080G:' : 'USER:';
    const parts = crewId.startsWith(prefix) ? crewId.slice(prefix.length).split(':') : [];
    if (
      parts.length !== 2 ||
      !parts.every(nonempty) ||
      parts[1] !== comparisonGroupId ||
      (source === 'nasa-research-replay' && simulated)
    )
      throw new Error('Registration source/flag/series mismatch');
  } else throw new Error('Unknown registration source');
  exactKeys(traits, ['allergies', 'motionSicknessHistory', 'chronotype', 'geneticFlags'], 'Traits');
  for (const key of ['allergies', 'geneticFlags'] as const) {
    const values = traits[key];
    if (values !== null && (!Array.isArray(values) || !values.every(nonempty)))
      throw new Error('Invalid trait ' + key);
  }
  if (traits.motionSicknessHistory !== null && ![0, 1, 2, 3].includes(traits.motionSicknessHistory))
    throw new Error('Invalid motion sickness history');
  if (
    traits.chronotype !== null &&
    !['morning', 'intermediate', 'evening'].includes(traits.chronotype)
  )
    throw new Error('Invalid chronotype');
  traits.allergies =
    traits.allergies === null ? null : [...new Set(traits.allergies.map(normaliseAllergen))];
  const keys = new Map<string, string>();
  const entries: BaselineEntry[] = [];
  for (const entry of registration.baselines.entries) {
    validateBaseline(entry, registration);
    const key = canonical([
      entry.metric,
      entry.comparisonGroupId,
      entry.methodId,
      entry.contextKey,
    ]);
    if (keys.has(key)) {
      if (keys.get(key) !== canonical(entry)) throw new Error('Conflicting baseline entry');
    } else {
      keys.set(key, canonical(entry));
      entries.push(entry);
    }
  }
  registration.baselines.entries = entries;
  return registration;
}

type BaselineSession = Pick<
  BaselineEntry,
  'value' | 'unit' | 'source' | 'comparisonGroupId' | 'methodId' | 'contextKey' | 'recordedAt'
> & {
  sessionId: string;
  crewId: string;
  preExposure: boolean;
  comparisonUsable: boolean;
};

export function buildBaseline(
  registration: Registration,
  key: Pick<BaselineEntry, 'metric' | 'unit' | 'methodId' | 'contextKey'>,
  sessions: BaselineSession[],
): BaselineEntry {
  const unique = new Map<string, BaselineSession>();
  let conflicting = false;
  let invalid = false;
  let latest: number | null = null;
  for (const session of sessions) {
    if (!nonempty(session.sessionId)) throw new Error('Baseline session requires ID');
    if (
      unique.has(session.sessionId) &&
      canonical(unique.get(session.sessionId)) !== canonical(session)
    )
      conflicting = true;
    unique.set(session.sessionId, session);
    if (
      !validValue(key.metric, session.value) ||
      session.unit !== key.unit ||
      session.source !== registration.source ||
      session.crewId !== registration.crewId ||
      session.comparisonGroupId !== registration.comparisonGroupId ||
      session.methodId !== key.methodId ||
      session.contextKey !== key.contextKey ||
      session.preExposure !== true ||
      session.comparisonUsable !== true
    )
      invalid = true;
    if (session.recordedAt !== null) {
      const observed = timestamp(session.recordedAt);
      latest = latest === null ? observed : Math.max(latest, observed);
    }
  }
  const enough = unique.size >= (key.metric === 'hrAtWorkloadBpm' ? 2 : 1);
  const evidence = conflicting ? 'conflicting' : invalid || !enough ? 'insufficient' : 'supported';
  const entry = {
    ...key,
    source: registration.source,
    comparisonGroupId: registration.comparisonGroupId,
    sourceSessionIds: [...unique.keys()],
    count: unique.size,
    recordedAt: latest === null ? null : new Date(latest).toISOString(),
    evidence,
    value:
      evidence === 'supported'
        ? [...unique.values()].reduce((total, session) => total + session.value! / unique.size, 0)
        : null,
  } as BaselineEntry;
  validateBaseline(entry, registration);
  return entry;
}

export const demoRegistrations: Registration[] = [
  {
    crewId: 'SIM-CDR',
    source: 'simulated-crew',
    simulated: true,
    comparisonGroupId: 'SIM-CDR-MISSION-01',
    traits: {
      allergies: ['shellfish'],
      motionSicknessHistory: 1,
      chronotype: 'morning',
      geneticFlags: [],
    },
    baselines: {
      entries: [
        {
          metric: 'bodyMassKg',
          value: 72,
          unit: 'kg',
          sourceSessionIds: ['SIM-CDR-MASS-01', 'SIM-CDR-MASS-02'],
          count: 2,
          source: 'simulated-crew',
          comparisonGroupId: 'SIM-CDR-MISSION-01',
          methodId: 'same-scale-morning-v1',
          contextKey: 'default',
          recordedAt: '2026-11-01T00:00:00.000Z',
          evidence: 'supported',
        },
      ],
    },
  },
  {
    crewId: 'SIM-PLT',
    source: 'simulated-crew',
    simulated: true,
    comparisonGroupId: 'SIM-PLT-MISSION-01',
    traits: {
      allergies: [],
      motionSicknessHistory: 3,
      chronotype: 'evening',
      geneticFlags: ['one-carbon-risk'],
    },
    baselines: { entries: [] },
  },
  {
    crewId: 'SIM-MS1',
    source: 'simulated-crew',
    simulated: true,
    comparisonGroupId: 'SIM-MS1-MISSION-01',
    traits: {
      allergies: ['peanuts'],
      motionSicknessHistory: 0,
      chronotype: 'intermediate',
      geneticFlags: [],
    },
    baselines: { entries: [] },
  },
];
