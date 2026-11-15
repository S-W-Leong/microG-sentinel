import artifact from './actigraphy.json';

export const datasetUrl =
  'https://nlsp.nasa.gov/search/data/details/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6?dataType=DATASETS';
export const mainFile = 'BRSMACT_Campagin_1_Actigraphy.csv';
export const queryFile = 'BRSMACT_Campagin_1_Actigraphy_Query_Result.csv';
export const sourceFiles = artifact.files;
type Assertion = { row: Record<string, string>; sourceRow: number };
export type ResearchNight = {
  id: string;
  participant: string;
  phase: 'PRE_TEST' | 'IN_TEST' | 'POST_TEST';
  studyDay: number;
  date: string;
  durationHours: number | null;
  latencyHours: number | null;
  efficiencyPct: number | null;
  notes: string;
  sourceRow: number;
  raw: Record<string, string>;
  queryRows: Assertion[];
  conflicts: string[];
};

export function parseDuration(value: string): number | null {
  if (value === 'NA' || value === '') return null;
  if (value === '0') return 0;
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) throw new Error('Malformed duration');
  const [h, m, s = 0] = value.split(':').map(Number);
  if (h > 24 || m > 59 || s > 59 || (h === 24 && (m !== 0 || s !== 0)))
    throw new Error('Malformed duration');
  return h + m / 60 + s / 3600;
}
function percentage(value: string): number | null {
  if (value === 'NA' || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('Malformed efficiency');
  return n;
}
function isoDate(value: string): string {
  const [month, day, year] = value.split('/');
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Malformed date');
  return date;
}
function key(row: Record<string, string>) {
  return [row.Subject, row.Date, row.Test_Phase, row.BR_Day].join('|');
}
const queryByNight = new Map<string, Assertion[]>();
for (const q of artifact.query) {
  const list = queryByNight.get(key(q.row)) ?? [];
  list.push(q);
  queryByNight.set(key(q.row), list);
}
export const researchNights: ResearchNight[] = artifact.main.map(({ row, sourceRow }) => {
  const queryRows = queryByNight.get(key(row)) ?? [];
  const conflicts: string[] = [];
  const metrics = [
    ['Sleep Duration (hours)', 'Sleep duration', parseDuration],
    ['Sleep Latency (hours)', 'Sleep latency', parseDuration],
    ['Sleep Efficiency (%)', 'Sleep efficiency', percentage],
  ] as const;
  for (const q of queryRows) {
    for (const [main, other, parse] of metrics) {
      try {
        const a = parse(row[main]),
          b = parse(q.row[other]);
        if (a !== null && b !== null && Math.abs(a - b) > 1e-9)
          conflicts.push(`Query row ${q.sourceRow}: ${other} differs`);
      } catch {
        conflicts.push(`Malformed ${other} in query row ${q.sourceRow}`);
      }
    }
  }
  if (!['PRE_TEST', 'IN_TEST', 'POST_TEST'].includes(row.Test_Phase))
    throw new Error('Unknown study phase');
  const date = isoDate(row.Date),
    studyDay = Number(row.BR_Day);
  // All participants start bed rest on 2004-09-09, with 60 IN_TEST days.
  // Preserve source dates even if a future artifact fails this consistency check.
  const offset =
    row.Test_Phase === 'PRE_TEST'
      ? -studyDay
      : row.Test_Phase === 'IN_TEST'
        ? studyDay - 1
        : 60 + studyDay;
  const expected = new Date(Date.UTC(2004, 8, 9 + offset)).toISOString().slice(0, 10);
  if (!Number.isInteger(studyDay) || date !== expected) conflicts.push('Conflicting study timing');
  return {
    id: row.ID,
    participant: row.Subject,
    phase: row.Test_Phase as ResearchNight['phase'],
    studyDay,
    date,
    sourceRow,
    raw: row,
    queryRows,
    conflicts,
    durationHours: parseDuration(row['Sleep Duration (hours)']),
    latencyHours: parseDuration(row['Sleep Latency (hours)']),
    efficiencyPct: percentage(row['Sleep Efficiency (%)']),
    notes: row.Notes === 'NA' ? '' : row.Notes,
  };
});

export function compareNight(night: ResearchNight) {
  const baseline = researchNights.filter(
    (n) => n.participant === night.participant && n.phase === 'PRE_TEST',
  );
  const conflicting = night.conflicts.length > 0 || baseline.some((n) => n.conflicts.length > 0);
  const complete =
    baseline.length === 2 &&
    baseline.every(
      (n) => n.date < night.date && n.durationHours !== null && n.efficiencyPct !== null,
    );
  const supported =
    !conflicting && complete && night.durationHours !== null && night.efficiencyPct !== null;
  const baselineHours =
    !conflicting && complete
      ? baseline.reduce((sum, n) => sum + n.durationHours!, 0) / baseline.length
      : null;
  const baselineEfficiency =
    !conflicting && complete
      ? baseline.reduce((sum, n) => sum + n.efficiencyPct!, 0) / baseline.length
      : null;
  return {
    evidence: conflicting ? 'conflicting' : supported ? 'supported' : 'insufficient',
    baselineHours,
    baselineIds: baseline.map((n) => n.id),
    durationDeltaMinutes: supported ? (night.durationHours! - baselineHours!) * 60 : null,
    efficiencyDeltaPoints: supported ? night.efficiencyPct! - baselineEfficiency! : null,
  };
}
