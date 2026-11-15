import data from './hd71.json';

export const studyUrl = 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575';
export const submittedFile = 'LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv';
export const transformedFile = 'LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv';
export const sourceFiles = data.files;
export const timepoints = ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194'];
export type SourceRecord = (typeof data.records)[number];
export const sourceRecords: SourceRecord[] = data.records;
export type LabResult = {
  key: string;
  participant: string;
  marker: string;
  sample: string;
  timepoint: string;
  panel: string;
  unit: string;
  value: number | null;
  issues: string[];
  source: SourceRecord;
};

export function parseConcentration(raw: string): number | null {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
const markerColumn = (name: string) =>
  name
    .toLowerCase()
    .replace(/\//g, '_per_')
    .replace(/\+/g, '_plus_')
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_|_$/g, '') + '_concentration_picogram_per_milliliter';

export function buildLabResults(records: SourceRecord[]): LabResult[] {
  const results = records.map((source) => {
    const raw = source.raw;
    const sample = `${raw.ID}_serum_${raw.Timepoint}`;
    const metadata = data.samples.filter((s) => s.sample === sample);
    const value = parseConcentration(raw.Concentration);
    const wide = parseConcentration(source.transformedRaw);
    const issues: string[] = [];
    if (raw.Type !== 'HD71') issues.push('Assay platform differs');
    if (raw.Unit !== 'pg/ml') issues.push('Concentration units differ');
    if (!timepoints.includes(raw.Timepoint)) issues.push('Sample timing unknown');
    if (
      source.transformedSample !== sample ||
      source.transformedColumn !== markerColumn(raw.Analyte)
    )
      issues.push('Transformed identity differs');
    if (value !== null && wide !== null && Math.abs(value - wide) > 1e-9)
      issues.push('Concentration representations differ');
    const phase = raw.Timepoint.startsWith('L-') ? 'Pre-flight' : 'Post-flight';
    const rawPhase = phase === 'Pre-flight' ? 'Preflight' : raw.Timepoint;
    const metadataTime =
      phase === 'Pre-flight'
        ? `Launch minus ${raw.Timepoint.slice(2)}`
        : `Return plus ${raw.Timepoint.slice(2)}`;
    if (
      metadata.length !== 1 ||
      metadata[0]?.participant !== raw.ID ||
      metadata[0]?.material !== 'Serum' ||
      metadata[0]?.phase !== phase ||
      metadata[0]?.time !== metadataTime ||
      raw.Timepoint2 !== rawPhase
    )
      issues.push('Sample metadata differs');
    return {
      key: `${raw.ID}|HD71|${raw.Analyte}|${raw.Timepoint}`,
      participant: raw.ID,
      marker: raw.Analyte,
      sample,
      timepoint: raw.Timepoint,
      panel: raw.Type,
      unit: raw.Unit === 'pg/ml' ? 'pg/mL' : raw.Unit,
      value: issues.length ? null : value !== null && wide !== null ? value : null,
      issues,
      source,
    };
  });
  const counts = new Map<string, number>();
  for (const result of results) counts.set(result.key, (counts.get(result.key) ?? 0) + 1);
  return results.map((result) =>
    counts.get(result.key)! > 1
      ? { ...result, value: null, issues: [...result.issues, 'Duplicate sample result'] }
      : result,
  );
}
export const labResults = buildLabResults(sourceRecords);

export function compareResult(current: LabResult, results = labResults) {
  const baseline = results.filter(
    (r) =>
      r.participant === current.participant &&
      r.marker === current.marker &&
      r.panel === current.panel &&
      r.unit === current.unit &&
      r.timepoint.startsWith('L-'),
  );
  const issues = [...current.issues, ...baseline.flatMap((r) => r.issues)];
  if (baseline.length > 3) issues.push('Duplicate baseline samples');
  const complete =
    baseline.length === 3 &&
    ['L-92', 'L-44', 'L-3'].every((t) => baseline.filter((r) => r.timepoint === t).length === 1) &&
    baseline.every((r) => r.value !== null) &&
    current.panel === 'HD71' &&
    current.unit === 'pg/mL';
  const mean =
    complete && !issues.length ? baseline.reduce((sum, r) => sum + r.value!, 0) / 3 : null;
  const supported =
    mean !== null && current.value !== null && current.timepoint.startsWith('R+') && !issues.length;
  const delta = supported ? current.value! - mean! : null;
  return {
    evidence: issues.length ? 'conflicting' : supported ? 'supported' : 'insufficient',
    baseline: mean,
    baselineSamples: baseline,
    delta,
    changePct: delta !== null && mean! > 0 ? (100 * delta) / mean! : null,
    issues: [...new Set(issues)],
  };
}
