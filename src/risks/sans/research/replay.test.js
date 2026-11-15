import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eyesFor, participants, researchEyes, sourceFiles, thickness } from './replay';

describe('OSD-679 source integrity', () => {
  it('preserves all downloaded file hashes', () => {
    for (const file of sourceFiles) {
      const bytes = readFileSync(new URL(`./raw/${file.name}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
    }
  });

  it('keeps six research rats, both eyes and source rows separate', () => {
    expect(participants).toEqual(['MT51', 'MT66', 'MT01', 'MT08', 'MT07', 'MT305']);
    expect(researchEyes).toHaveLength(12);
    expect(new Set(researchEyes.map((record) => record.sample)).size).toBe(12);
    for (const participant of participants) {
      expect(eyesFor(participant).map((record) => record.eye)).toEqual(['Left Eye', 'Right Eye']);
    }
    expect(eyesFor('SIM-PLT')).toEqual([]);
    expect(researchEyes.every((record) => record.species === 'Rattus norvegicus')).toBe(true);
  });

  it('matches every selected numeric cell and physical row to the raw CSV', () => {
    const file = sourceFiles.find((entry) => entry.name.endsWith('OCT_TRANSFORMED.csv'));
    const lines = readFileSync(new URL(`./raw/${file.name}`, import.meta.url), 'utf8')
      .replace(/^\uFEFF/, '')
      .trimEnd()
      .split(/\r?\n/);
    const headers = lines[0].split(',');
    for (const record of researchEyes) {
      const cells = lines[record.sourceRow - 1].split(',');
      expect(cells[0]).toBe(record.sample);
      for (const visit of record.visits) {
        const prefix = visit.phase === 'Baseline' ? 'Baseline ' : visit.phase;
        for (const [region, values] of Object.entries(visit.values)) {
          for (const [tissue, value] of Object.entries(values)) {
            const column = `${prefix}_${region}_${tissue}_Thickness_millimeter`;
            const raw = cells[headers.indexOf(column)];
            expect(raw).toBe(record.raw[column]);
            expect(value).toBe(raw === '' ? null : Number(raw));
          }
        }
      }
    }
  });

  it('preserves absent baselines and visits without backfilling', () => {
    const missing = researchEyes.find((record) => record.sample === 'MT01_OD');
    expect(missing.visits[0].values.Nasal.Total_Retinal).toBeNull();
    expect(missing.visits[0].values.Nasal.Choroidal).toBe(0.047);
    expect(missing.visits[1].values.Nasal.Total_Retinal).toBe(0.219);
    const baselineOnly = researchEyes.find((record) => record.sample === 'MT305_OD');
    expect(baselineOnly.visits[0].values.Nasal.Total_Retinal).toBe(0.185);
    expect(baselineOnly.visits[1].values.Nasal.Total_Retinal).toBeNull();
    expect(thickness(null)).toBe('Not recorded');
    expect(thickness(0)).toBe('0.000 mm');
  });

  it('keeps source control identity and unusual recorded values', () => {
    expect(eyesFor('MT08').every((record) => record.group === 'Normally Loaded Control')).toBe(
      true,
    );
    const recovery = researchEyes.find((record) => record.sample === 'MT07_OS');
    expect(recovery.visits[2].values.Nasal.Total_Retinal).toBe(0.084);
    expect(recovery.unloadingDays).toBe('90');
    expect(recovery.reloadingDays).toBe('28');
    expect(researchEyes.every((record) => !('recordedAt' in record))).toBe(true);
  });
});
