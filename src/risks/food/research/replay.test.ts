import { expect, it } from 'vitest';
import source7352 from './raw/MR016G_Campaign_3_C3C _7352_Dietary_Intake_obsv.csv?raw';
import source7772 from './raw/MR016G_Campaign_3_C3C_7772_Dietary_Intake_obsv.csv?raw';
import {
  dataset,
  displayValue,
  measures,
  observations,
  participants,
  participantVisits,
} from './replay';

it('preserves every dated intake observation with distinct participant identities', () => {
  expect(participants).toEqual(['C3C-7352', 'C3C-7772']);
  expect(observations).toHaveLength(236);
  expect(new Set(observations.map((row) => row.id)).size).toBe(236);
  for (const participant of participants) {
    const visits = participantVisits(participant);
    expect(visits).toHaveLength(118);
    expect(visits.filter((row) => row.phase === 'PRE_TEST')).toHaveLength(15);
    expect(visits.filter((row) => row.phase === 'IN_TEST')).toHaveLength(90);
    expect(visits.filter((row) => row.phase === 'POST_TEST')).toHaveLength(13);
    expect(visits.every((row) => row.participant === participant)).toBe(true);
    expect(visits.map((row) => row.date)).toEqual(visits.map((row) => row.date).sort());
    expect(visits[visits.length - 1].sourceRow).toBe(119);
  }
  expect(participantVisits('SIM-CDR')).toEqual([]);
});

it('retains source values and units without applying crew targets or conversions', () => {
  expect(observations[0]).toMatchObject({
    id: 'C3C-7352:1',
    date: '2006-04-03',
    sourceDate: '4/3/2006',
    studyDay: -15,
    sourceRow: 2,
    values: {
      energy: 2306.75,
      protein: 88.29,
      sodium: 2434.52,
      calcium: 1076.88,
      vitaminD: 6.15,
      fibre: 24.71,
    },
  });
  expect(participantVisits('C3C-7772')[0]).toMatchObject({
    date: '2006-05-07',
    phase: 'PRE_TEST',
    studyDay: 15,
    values: { energy: 2116.88 },
  });
  expect(measures.vitaminD.unit).toBe('mcg');
  expect(measures.energy.unit).toBe('kcal');
  for (const row of observations) {
    for (const measure of Object.keys(measures) as (keyof typeof measures)[]) {
      expect(row.values[measure]).toBe(Number(row.rawValues[measure]));
    }
    expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row).not.toHaveProperty('recordedAt');
  }
});

it('keeps missing readings distinct from measured zero', () => {
  expect(displayValue(null, 'mg')).toBe('Not recorded');
  expect(displayValue(0, 'mg')).toBe('0 mg');
  expect(displayValue(6.15, 'mcg')).toBe('6.15 mcg');
});

it('matches frozen NASA source identities, energy values and physical rows', () => {
  for (const file of dataset.files) {
    const lines = (file.name.includes('7352') ? source7352 : source7772).split(/\r?\n/);
    for (const row of observations.filter((entry) => entry.sourceFile === file.name)) {
      const source = lines[row.sourceRow - 1].split(',');
      expect(source.slice(0, 7)).toEqual([
        row.sourceId,
        'C3C',
        row.participant.slice(4),
        row.sourceDate,
        row.phase,
        String(row.studyDay),
        row.rawValues.energy,
      ]);
    }
  }
});
