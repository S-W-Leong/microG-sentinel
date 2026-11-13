import type { Assessment } from '../types';

const base: Omit<Assessment, 'id' | 'date' | 'value' | 'phase' | 'isBaseline'> = {
  subjectId: 'SIM-CREW-01', source: 'simulated-crew', metric: 'VO2peak', unit: 'L/min',
  bodyMassKg: null, method: 'Graded cycle ergometer capacity test', modality: 'cycle ergometer',
  protocol: 'Simulated incremental cycle protocol A', sourceNotes: ['Simulated for demonstration'],
};

export const simulatedCrew: Assessment[] = [
  { ...base, id: 'SIM-BASE-01', date: '2026-01-05', value: 3.1, phase: 'pre-mission', isBaseline: true },
  { ...base, id: 'SIM-BASE-02', date: '2026-01-12', value: 2.9, phase: 'pre-mission', isBaseline: true },
  { ...base, id: 'SIM-FLIGHT-01', date: '2026-02-10', value: 2.85, phase: 'in-mission', isBaseline: false },
  { ...base, id: 'SIM-FLIGHT-02', date: '2026-03-10', value: 2.65, phase: 'in-mission', isBaseline: false },
  { ...base, id: 'SIM-FLIGHT-MISSING', date: '2026-03-25', value: 2.5, phase: 'in-mission', isBaseline: false, method: null },
  { ...base, id: 'SIM-FLIGHT-03', date: '2026-04-10', value: 2.3, phase: 'in-mission', isBaseline: false },
  { ...base, id: 'SIM-FLIGHT-03-COPY', date: '2026-04-10', value: 2.3, phase: 'in-mission', isBaseline: false,
    duplicateOf: 'SIM-FLIGHT-03', sourceNotes: ['Simulated for demonstration', 'Alternative representation of SIM-FLIGHT-03; not an additional session.'] },
];
