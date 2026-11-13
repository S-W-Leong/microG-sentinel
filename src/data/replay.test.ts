import { describe, expect, it } from 'vitest';
import curatedJson from '../../data/curated/mr080g_replay.json?raw';
import { assess, trend } from '../logic/assess';
import { researchReplay } from './replay';

describe('curated MR080G research replay', () => {
  it('matches the frozen curated artifact and uses distinct representation IDs', () => {
    const curated = JSON.parse(curatedJson);
    expect(researchReplay).toEqual(curated);
    expect(new Set(researchReplay.map(record => record.id)).size).toBe(researchReplay.length);
    expect(researchReplay.every(record => record.sourceNotes.some(note => note.startsWith('data/raw/')))).toBe(true);
  });

  it.each([
    ['070506', 'ABS', 2.725, '74.9'],
    ['070506', 'REL', 29.9, '73.9'],
    ['070517', 'ABS', 2.725, '102.8'],
    ['070517', 'REL', 29.9, '98.0'],
  ])('computes 3985 %s %s independently from both pre-tests', (date, unit, baseline, retained) => {
    const result = assess(researchReplay, `MR080G-3985-${date}-${unit}`);
    expect(result.evidence).toBe('supported');
    expect(result.calculation?.baseline.value).toBeCloseTo(baseline, 8);
    expect(result.calculation?.baseline.recordIds).toEqual([
      `MR080G-3985-070122-${unit}`, `MR080G-3985-070127-${unit}`,
    ]);
    expect(result.calculation?.retainedPct.toFixed(1)).toBe(retained);
  });

  it.each(['ABS', 'REL'])('blocks the real 0224 identity conflict for %s', unit => {
    for (const stem of ['MR080G-0224-050303', 'MR080G-0224-050303-IDENTITY']) {
      const result = assess(researchReplay, `${stem}-${unit}`);
      expect(result.evidence).toBe('conflicting');
      expect(result.issues.some(issue => issue.code === 'identity')).toBe(true);
      expect(result.calculation).toBeNull();
    }
    const metadata = researchReplay.find(record => record.id === `MR080G-0224-050303-IDENTITY-${unit}`)!;
    expect(metadata.subjectId).toBe('C3A');
    expect(metadata.value).toBeNull();
    expect(metadata.metric).toBeNull();
  });

  it.each(['ABS', 'REL'])('blocks both June 5580 date representations for %s', unit => {
    for (const stem of ['MR080G-5580-090609', 'MR080G-5580-090609-README']) {
      const result = assess(researchReplay, `${stem}-${unit}`);
      expect(result.evidence).toBe('conflicting');
      expect(result.issues.some(issue => issue.code === 'timing')).toBe(true);
      expect(result.calculation).toBeNull();
    }
    const points = trend(researchReplay, 'C3G-5580');
    expect(points.find(point => point.assessmentId === `MR080G-5580-090609-${unit}`))
      .toMatchObject({ evidence: 'conflicting', retainedPct: null });
    expect(points.some(point => point.assessmentId.includes('README'))).toBe(false);
    // The May session is distinct, with no baseline included in this subset.
    expect(assess(researchReplay, `MR080G-5580-090529-${unit}`).evidence).toBe('insufficient');
  });

  it('never assigns an operational reference state to any replay result', () => {
    for (const record of researchReplay) {
      const result = assess(researchReplay, record.id);
      expect(record.source).toBe('nasa-research-replay');
      expect(result.reference.state).toBe('not-applicable');
    }
  });
});
