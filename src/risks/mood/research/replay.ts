import artifact from './mood-replay.json';

export const datasetUrl =
  'https://nlsp.nasa.gov/search/data/details/046fc310-ee58-5463-a2bf-3e8c1df7cb18?dataType=DATASETS';
export const downloadUrl =
  'https://nlsp.nasa.gov/api/v1/files/631f5fd5-5d06-59bb-a6fe-af7da20ba0e3/download';
export const sourceFile = 'NNX12AB40G_CFT70_All_Subjects.csv';
export const measures = ['Happy', 'Stressed', 'Fatigued', 'Relaxed'] as const;
export type Measure = (typeof measures)[number];
export const observations = artifact.observations;
export type Observation = (typeof observations)[number];
export const participants = [...new Set(observations.map((row) => row.participant))];

export function participantRows(participant: string): Observation[] {
  return observations
    .filter((row) => row.participant === participant)
    .sort((a, b) => a.day - b.day);
}

export function displayValue(value: number | null): string {
  return value === null ? 'Not recorded' : String(value);
}
