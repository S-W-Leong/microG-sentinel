import { describe, expect, it } from 'vitest';
import artifact from './mood-replay.json';
import { displayValue, measures, observations, participantRows, participants } from './replay';

describe('NASA AD ASTRA source replay', () => {
  it('keeps the explicit three-person subset and source provenance', () => {
    expect(participants).toEqual(['5160', '6611', '8936']);
    expect(observations).toHaveLength(187);
    expect(participants.map((id) => participantRows(id).length)).toEqual([92, 3, 92]);
    expect(artifact.files.find((file) => file.name.endsWith('.csv'))?.sha256).toBe(
      '484b98af6e9e2d917a8629323054ec6fa59befadf2f5bf6969c57c6719d25b7c',
    );
    expect(observations[0]).toMatchObject({
      id: '1',
      participant: '5160',
      date: '2013-02-06',
      day: 0,
      sourceRow: 2,
      values: { Happy: 4, Stressed: 1, Fatigued: 1, Relaxed: 3 },
    });
  });

  it('preserves every selected source item, including NA and day zero', () => {
    for (const row of observations) {
      expect(row.participant).toBe(row.raw.Subject);
      expect(row.id).toBe(row.raw.ID);
      expect(row.sourceRow).toBe(Number(row.raw.ID) + 1);
      expect(row.day).toBe(Number(row.raw.DayCount));
      const [month, day, year] = row.raw.Date.split('/');
      expect(row.date).toBe(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      for (const measure of measures) {
        expect(row.values[measure]).toBe(
          row.raw[measure] === 'NA' ? null : Number(row.raw[measure]),
        );
      }
    }
    expect(observations.find((row) => row.id === '1093')?.values).toEqual({
      Happy: 5,
      Stressed: null,
      Fatigued: null,
      Relaxed: null,
    });
    expect(displayValue(null)).toBe('Not recorded');
    expect(displayValue(0)).toBe('0');
  });

  it('never fills absent days or mixes participants', () => {
    const rows = participantRows('5160');
    expect(rows.some((row) => row.day === 6)).toBe(false);
    for (const participant of participants) {
      const selected = participantRows(participant);
      expect(selected.every((row) => row.participant === participant)).toBe(true);
      expect(new Set(selected.map((row) => row.day)).size).toBe(selected.length);
    }
    expect(participantRows('SIM-CDR')).toEqual([]);
  });
});
