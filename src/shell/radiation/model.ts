export const CAREER_LIMIT_MSV = 600;
export const NASA_SOURCE =
  'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf';
export const CSA_SOURCE =
  'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp';

export interface RadiationDose {
  readonly missionDoseMsv: number | null;
  readonly dailyDoseMsv: number | null;
  readonly missionDays: number | null;
  readonly neutronShare: number | null;
}

const crewDoses: Readonly<Record<string, RadiationDose | undefined>> = {
  'SIM-CDR': { missionDoseMsv: 64, dailyDoseMsv: 0.64, missionDays: 100, neutronShare: 0.3 },
  'SIM-PLT': { missionDoseMsv: 42, dailyDoseMsv: 0.6, missionDays: 70, neutronShare: 0.3 },
  'SIM-MS1': { missionDoseMsv: 90, dailyDoseMsv: 0.75, missionDays: 120, neutronShare: 0.3 },
};

function nonnegative(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function getRadiationDose(crewId: string): RadiationDose | null {
  return Object.prototype.hasOwnProperty.call(crewDoses, crewId)
    ? (crewDoses[crewId] ?? null)
    : null;
}

export function careerPercentage(doseMsv: number | null | undefined): number | null {
  const dose = nonnegative(doseMsv);
  return dose === null ? null : (dose / CAREER_LIMIT_MSV) * 100;
}

export function formatValue(value: number | null | undefined, decimals = 0): string {
  const valid = nonnegative(value);
  return valid === null ? 'No data' : valid.toFixed(decimals);
}

export function radiationSummary(dose: RadiationDose | null | undefined) {
  const percentage = careerPercentage(dose?.missionDoseMsv);
  const daily = nonnegative(dose?.dailyDoseMsv);
  const share = nonnegative(dose?.neutronShare);
  const validShare = share !== null && share <= 1 ? share : null;
  return {
    percentage,
    barPercentage: percentage === null ? null : Math.min(100, percentage),
    raiseAtPmc: percentage !== null && percentage >= 80,
    neutronPercentage: validShare === null ? null : validShare * 100,
    neutronDoseMsv: daily === null || validShare === null ? null : daily * validShare,
    otherDoseMsv: daily === null || validShare === null ? null : daily * (1 - validShare),
  };
}
