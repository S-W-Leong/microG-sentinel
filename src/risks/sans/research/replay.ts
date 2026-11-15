import artifact from './oct.json';

export const datasetUrl = 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-679';
export const mainFile = 'LSDS-81_Ophthalmologic Diagnostic Technique_Fuller_OCT_TRANSFORMED.csv';
export const sourceFiles = artifact.files;
export const researchEyes = artifact.records;
export const participants = [...new Set(researchEyes.map((record) => record.participant))];
export const regions = ['Nasal', 'Temporal', 'Linear'] as const;
export type Region = (typeof regions)[number];
export type ResearchEye = (typeof researchEyes)[number];
export const phaseLabels: Record<string, string> = {
  Baseline: 'Baseline',
  End_of_Hindlimb_Unloading: 'Unloading end',
  End_of_Recovery: 'Recovery end',
};

export function eyesFor(participant: string) {
  return researchEyes.filter((record) => record.participant === participant);
}

export function thickness(value: number | null): string {
  return value === null ? 'Not recorded' : `${value.toFixed(3)} mm`;
}
