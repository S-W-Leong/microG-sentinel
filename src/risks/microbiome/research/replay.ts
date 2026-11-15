import artifact from './osd574.json';

export interface ResearchValue {
  sourceRow: number;
  raw: string;
  valuePct: number | null;
}

export interface ResearchGenus extends ResearchValue {
  name: string;
  clade: string;
}

export interface ResearchSample {
  id: string;
  participant: string;
  sampleName: string;
  timepoint: string;
  phase: string;
  timeLabel: string;
  site: string;
  material: string;
  sourceColumn: number;
  metadataRow: number;
  genera: ResearchGenus[];
  unclassified: ResearchValue;
}

export const researchSamples: readonly ResearchSample[] = artifact.samples;
export const participants = [...new Set(researchSamples.map((sample) => sample.participant))];
export const dataset = artifact.dataset;
export const sourceFiles = artifact.files;
export const sourceTable = artifact.table;
export const metadataFile = artifact.metadata;
export const metadataMember = artifact.metadataMember;
export const database = artifact.database;

export function samplesFor(participant: string): readonly ResearchSample[] {
  return researchSamples.filter((sample) => sample.participant === participant);
}

export function displayPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0 || value > 100) return 'Not recorded';
  if (value > 0 && value < 0.01) return '<0.01 %';
  return `${Number(value.toFixed(2))} %`;
}
