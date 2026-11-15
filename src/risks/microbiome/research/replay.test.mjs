import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import {
  dataset,
  displayPercent,
  participants,
  researchSamples,
  samplesFor,
  sourceFiles,
  sourceTable,
} from './replay';

it('retains four independent research participants with two metadata-verified skin swabs each', () => {
  expect(dataset.id).toBe('OSD-574');
  expect(participants).toEqual(['C001', 'C002', 'C003', 'C004']);
  expect(researchSamples).toHaveLength(8);
  expect(samplesFor('SIM-CDR')).toEqual([]);
  for (const participant of participants) {
    const samples = samplesFor(participant);
    expect(samples.map((sample) => sample.timepoint)).toEqual(['L-44', 'R+1']);
    expect(samples.map((sample) => sample.phase)).toEqual(['pre-flight', 'post-flight']);
    for (const sample of samples) {
      expect(sample.participant).toBe(participant);
      expect(sample.sampleName).toBe(`${participant}_Swab_${sample.timepoint}_DEL`);
      expect(sample.site).toBe('Deltoid skin');
      expect(sample.material).toBe('Swab');
      expect(sample).not.toHaveProperty('recordedAt');
      expect(sample).not.toHaveProperty('crewId');
    }
  }
});

it('preserves exact table cells and physical row/column provenance without renormalizing', () => {
  const lines = readFileSync(new URL(`./raw/${sourceTable}`, import.meta.url), 'utf8').split(
    /\r?\n/,
  );
  for (const sample of researchSamples) {
    expect(lines[1].split('\t')[sample.sourceColumn - 1]).toBe(sample.id);
    for (const entry of [...sample.genera, sample.unclassified]) {
      const source = lines[entry.sourceRow - 1].split('\t');
      expect(entry.raw).toBe(source[sample.sourceColumn - 1]);
      expect(entry.valuePct).toBe(Number(entry.raw));
      if ('clade' in entry) expect(entry.clade).toBe(source[0]);
    }
    expect(sample.genera.reduce((sum, genus) => sum + genus.valuePct, 0)).toBeLessThan(100);
  }
  const first = samplesFor('C001')[0];
  expect(first.genera[0]).toMatchObject({
    name: 'Cutibacterium',
    sourceRow: 50,
    raw: '88.24965757185652',
    valuePct: 88.24965757185652,
  });
  expect(samplesFor('C001')[1].genera[0].valuePct).toBe(69.00715656421609);
  expect(samplesFor('C002')[1].genera.find((genus) => genus.name === 'Malassezia').valuePct).toBe(
    0,
  );
});

it('uses only genus-level rows and keeps the same six highest-mean genera at every visit', () => {
  const table = readFileSync(new URL(`./raw/${sourceTable}`, import.meta.url), 'utf8')
    .trim()
    .split(/\r?\n/)
    .slice(2)
    .map((line) => line.split('\t'));
  const top = table
    .filter((row) => row[0].split('|').at(-1).startsWith('g__'))
    .sort(
      (a, b) =>
        b.slice(1).reduce((sum, value) => sum + Number(value), 0) -
        a.slice(1).reduce((sum, value) => sum + Number(value), 0),
    )
    .slice(0, 6)
    .map((row) => row[0]);
  for (const sample of researchSamples) {
    expect(sample.genera.map((genus) => genus.clade)).toEqual(top);
    expect(sample.genera.map((genus) => genus.name)).toEqual([
      'Cutibacterium',
      'Corynebacterium',
      'Malassezia',
      'Staphylococcus',
      'GGB2722',
      'Streptococcus',
    ]);
  }
});

it('keeps zero, tiny nonzero estimates and unknown percentages distinct', () => {
  expect(displayPercent(0)).toBe('0 %');
  expect(displayPercent(0.0001)).toBe('<0.01 %');
  expect(displayPercent(88.24965757185652)).toBe('88.25 %');
  for (const value of [null, NaN, Infinity, -1, 101])
    expect(displayPercent(value)).toBe('Not recorded');
});

it('matches every downloaded file hash and regenerates the same curated bytes', () => {
  for (const file of sourceFiles) {
    const bytes = readFileSync(new URL(`./raw/${file.name}`, import.meta.url));
    expect(bytes.length).toBe(file.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
    expect(file.url.startsWith('https://osdr.nasa.gov/')).toBe(true);
  }
  const script = fileURLToPath(new URL('./curate.py', import.meta.url));
  // Import our curator without executing downloaded content or rewriting the artifact.
  const code = [
    'import runpy,sys,json',
    'm=runpy.run_path(sys.argv[1])',
    "assert all(m['percentage'](x) is None for x in ['', 'NA', 'NaN', 'inf', '-1', '101', '<1'])",
    "assert m['percentage']('0') == 0",
    "print(json.dumps(m['curate'](),indent=2,ensure_ascii=False,allow_nan=False))",
  ].join(';');
  const generated = execFileSync('python', ['-I', '-c', code, script], { encoding: 'utf8' });
  const stored = readFileSync(new URL('./osd574.json', import.meta.url), 'utf8');
  expect(generated.replaceAll('\r\n', '\n')).toBe(stored);
});
