import data from './dietary-intake.json';

export type Measure = keyof typeof data.measures;
export type Phase = 'PRE_TEST' | 'IN_TEST' | 'POST_TEST';
export interface IntakeObservation {
  id: string;
  participant: string;
  date: string;
  sourceDate: string;
  phase: Phase;
  studyDay: number;
  sourceId: string;
  sourceFile: string;
  sourceRow: number;
  values: Record<Measure, number | null>;
  rawValues: Record<Measure, string>;
}

export const dataset = data;
export const measures = data.measures;
export const observations = data.observations as IntakeObservation[];
export const participants = [...new Set(observations.map((row) => row.participant))];
export const phases: Record<Phase, string> = {
  PRE_TEST: 'Pre-bed-rest',
  IN_TEST: 'Bed rest',
  POST_TEST: 'Recovery',
};

export function participantVisits(participant: string): IntakeObservation[] {
  return observations.filter((row) => row.participant === participant);
}

export function displayValue(value: number | null, unit: string): string {
  return value === null
    ? 'Not recorded'
    : `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}
