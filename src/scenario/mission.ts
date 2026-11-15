import type { CrewTraits, RiskEvaluationContext } from '../risks/types';

// One fictional episode, not records from NASA research participants.
export const missionTime = '2026-11-14T11:00:00.000Z';
export const missionDay = 100;
export const missionStart = '2026-08-07'; // Day 1; inclusive mission-day counting.
export const dayMs = 86_400_000;
export const atDay = (daysAgo: number, hour = 11) =>
  new Date(Date.parse(missionTime) - daysAgo * dayMs + (hour - 11) * 3_600_000).toISOString();

export interface CrewStory {
  crewId: 'SIM-CDR' | 'SIM-PLT' | 'SIM-MS1';
  label: 'Simulated';
  role: string;
  summary: string;
  traits: CrewTraits;
  food: { baselineKg: number; currentKg: number; days: number; energyTargetKcal: number };
  sleep: { hours: [number, number, number]; kss: number; fatigue: number };
  balance: { openArea: number; closedArea: number; closedBaseline: number; sickness: number };
  sansChangeLines: number;
  mood: { lastFive: [number, number, number, number, number]; stress: number; workload: number };
  gut: { changedDays: number; bristol: number; bloating: 0 | 1; appetite: 1 | 2 };
  cardio: { deltaBpm: number; restingBpm: number; borg: number; loadPct: number };
  bone: { monthlyChangePct: number; loadPct: number };
  immune: { rashActive: boolean; basePct: number; adjustedPct: number };
  radiation: {
    missionDoseMsv: number;
    dailyDoseMsv: number;
    missionDays: number;
    neutronShare: number;
  };
}

// Plausibility, not clinical thresholds: Barger et al., Lancet Neurol. 2014,
// doi:10.1016/S1474-4422(14)70122-X reports ISS sleep around six hours.
// NASA Human Research Program, Nutritional Biochemistry of Space Flight (2014):
// sodium, energy intake and skeletal health motivate the meal storyline.
// (title is the reference; menu values and personal targets below are invented).
// NASA radiation protection brief: ISS exposure is of order 0.5–1 mSv/day;
// https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
// Dose totals assume these illustrative rates over 100 days, not dosimeter data.
// All other values are modest fictional personal changes; no causal/diagnostic claim.
export const missionCrew: readonly CrewStory[] = [
  {
    crewId: 'SIM-CDR',
    label: 'Simulated',
    role: 'Commander',
    summary:
      'Short sleep, falling mood and high workload; shellfish meal precedes hives by three hours; high sodium and low fibre provide context.',
    traits: {
      allergies: ['shellfish'],
      motionSicknessHistory: 1,
      chronotype: 'morning',
      geneticFlags: [],
    },
    food: { baselineKg: 72, currentKg: 71.4, days: 7, energyTargetKcal: 2400 },
    sleep: { hours: [5.5, 6, 6], kss: 7, fatigue: 5 },
    balance: { openArea: 1, closedArea: 2, closedBaseline: 2, sickness: 0 },
    sansChangeLines: -0.5,
    mood: { lastFive: [6, 5, 4, 3, 2], stress: 7, workload: 9 },
    gut: { changedDays: 2, bristol: 3, bloating: 1, appetite: 2 },
    cardio: { deltaBpm: 41, restingBpm: 68, borg: 14, loadPct: 80 },
    bone: { monthlyChangePct: -1.2, loadPct: 70 },
    immune: { rashActive: true, basePct: 60, adjustedPct: 80 },
    radiation: { missionDoseMsv: 64, dailyDoseMsv: 0.64, missionDays: 100, neutronShare: 0.3 },
  },
  {
    crewId: 'SIM-PLT',
    label: 'Simulated',
    role: 'Pilot',
    summary:
      'Stable sleep, mood and meals; near vision change for the next PMC; prior motion sickness remains visible despite no symptoms today.',
    traits: {
      allergies: [],
      motionSicknessHistory: 3,
      chronotype: 'evening',
      geneticFlags: ['one-carbon-risk'],
    },
    food: { baselineKg: 78, currentKg: 78, days: 5, energyTargetKcal: 2350 },
    sleep: { hours: [8, 8, 8], kss: 2, fatigue: 2 },
    balance: { openArea: 1.1, closedArea: 2.2, closedBaseline: 2, sickness: 0 },
    sansChangeLines: -1,
    mood: { lastFive: [7, 7, 8, 7, 7], stress: 2, workload: 4 },
    gut: { changedDays: 0, bristol: 4, bloating: 0, appetite: 2 },
    cardio: { deltaBpm: 2, restingBpm: 60, borg: 11, loadPct: 100 },
    bone: { monthlyChangePct: 0, loadPct: 100 },
    immune: { rashActive: false, basePct: 0, adjustedPct: 0 },
    radiation: { missionDoseMsv: 60, dailyDoseMsv: 0.6, missionDays: 100, neutronShare: 0.3 },
  },
  {
    crewId: 'SIM-MS1',
    label: 'Simulated',
    role: 'Mission specialist',
    summary:
      'Peanut allergy without exposure; five complete low-energy days, lower appetite and a slight bone change.',
    traits: {
      allergies: ['peanuts'],
      motionSicknessHistory: 0,
      chronotype: 'intermediate',
      geneticFlags: [],
    },
    food: { baselineKg: 70, currentKg: 68.6, days: 5, energyTargetKcal: 2500 },
    sleep: { hours: [7.5, 8, 7.5], kss: 3, fatigue: 3 },
    balance: { openArea: 0.9, closedArea: 1.8, closedBaseline: 2, sickness: 0 },
    sansChangeLines: 0,
    mood: { lastFive: [7, 7, 6, 7, 6], stress: 3, workload: 5 },
    gut: { changedDays: 0, bristol: 4, bloating: 0, appetite: 1 },
    cardio: { deltaBpm: 8, restingBpm: 65, borg: 12, loadPct: 90 },
    bone: { monthlyChangePct: -0.4, loadPct: 90 },
    immune: { rashActive: false, basePct: 0, adjustedPct: 0 },
    radiation: { missionDoseMsv: 75, dailyDoseMsv: 0.75, missionDays: 100, neutronShare: 0.3 },
  },
];

export function storyFor(crewId: string) {
  return missionCrew.find((story) => story.crewId === crewId);
}

/** Never seed a real/research identity or an earlier clock with this episode. */
export function scenarioStory({ crewId, vector }: RiskEvaluationContext) {
  const person = vector.getVector(crewId);
  return person?.simulated &&
    person.source === 'simulated-crew' &&
    Date.parse(person.exposures.asOf) >= Date.parse(missionTime)
    ? storyFor(crewId)
    : undefined;
}
