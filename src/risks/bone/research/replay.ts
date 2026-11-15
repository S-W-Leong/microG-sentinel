import data from './dxa.json';
import type { BoneSite } from '../../types';

export const catalogUrl =
  'https://nlsp.nasa.gov/search/data/details/96121725-e9bf-5084-82f9-9efd4696ae65?dataType=DATASETS';
export type SourceRow = { file: string; sourceRow: number; raw: Record<string, string> };
export const sourceRows: SourceRow[] = data.records.map((row) => ({
  ...row,
  raw: Object.fromEntries(Object.entries(row.raw)),
}));
export const sourceFiles = data.files;
type Scan = {
  key: string;
  participant: string;
  site: BoneSite;
  side: string;
  date: string | null;
  phase: string | null;
  studyDay: string | null;
  bmd: number | null;
  scanner: string | null;
  protocol: string | null;
  issues: string[];
  sources: SourceRow[];
};
export type ResearchVisit = Omit<Scan, 'sources'> & { scans: Scan[] };
const known = (s: string | undefined) => (s && s !== 'NA' ? s : null);
function dateOnly(value: string | undefined) {
  if (!known(value)) return null;
  const parts = value!.split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
    ? date
    : null;
}
function mean(values: (number | null)[]) {
  return values.length && values.every((v) => v !== null)
    ? values.reduce<number>((sum, v) => sum + v!, 0) / values.length
    : null;
}
function protocol(raw: Record<string, string>, site: BoneSite) {
  const fields = ['SCAN_TYPE', 'SCAN_MODE', 'ANAL_VERSION', 'ROI_TYPE'];
  if (site === 'lumbar-spine')
    fields.push(
      'NO_REGIONS',
      'STARTING_REGION',
      'L1_INCLUDED',
      'L2_INCLUDED',
      'L3_INCLUDED',
      'L4_INCLUDED',
      'L5_INCLUDED',
    );
  return fields.every((k) => known(raw[k])) ? fields.map((k) => `${k}=${raw[k]}`).join(';') : null;
}
export function buildVisits(rows: SourceRow[]): ResearchVisit[] {
  const scans = new Map<string, Scan>();
  const scanIds = new Map<string, string>();
  for (const source of rows) {
    const r = source.raw;
    const participant = `${r.CAMPAIGN}-${r.SUBJECT}`;
    const spine = source.file.startsWith('spine/');
    const side = spine ? 'central' : /_(RH|R_Hip)/.test(source.file) ? 'right' : 'left';
    const date = dateOnly(r.SCAN_DATE);
    const phase = known(r.TEST_PHASE),
      studyDay = known(r.BR_DAY);
    const metrics: [BoneSite, string | undefined][] = spine
      ? [['lumbar-spine', r.TOT_BMD]]
      : [
          ['total-hip', r.HTOT_BMD ?? r['Total Hip BMD']],
          ['femoral-neck', r.NECK_BMD ?? r['Femur neck BMD']],
        ];
    for (const [site, rawValue] of metrics) {
      const value = known(rawValue) ? Number(rawValue) : null;
      const bmd = value !== null && Number.isFinite(value) && value > 0 ? value : null;
      const issues: string[] = [];
      if (value !== null && bmd === null) issues.push('Invalid BMD');
      if (known(r.SCAN_DATE) && !date) issues.push('Invalid scan date');
      if (
        date &&
        date >= '2006-06-09' &&
        date <= '2006-08-10' &&
        !/corrected.*calibration/i.test(r.COMMENTS ?? '')
      )
        issues.push('Calibration correction unconfirmed');
      const scanner = known(r.SERIAL_NUMBER),
        method = protocol(r, site);
      // Record ID identifies the same repeat across this curated export family.
      // Unknown-date rows cannot be linked from filename or ID alone.
      const recordKey = [
        participant,
        site,
        side,
        date ?? `${source.file}:${source.sourceRow}`,
        phase,
        studyDay,
        r.ID,
      ].join('|');
      const scanIdentity = known(r.SCANID) ? [participant, site, side, r.SCANID].join('|') : null;
      const key = scanIdentity ? (scanIds.get(scanIdentity) ?? recordKey) : recordKey;
      if (scanIdentity) scanIds.set(scanIdentity, key);
      const previous = scans.get(key);
      if (previous) {
        if (previous.date !== date || previous.phase !== phase || previous.studyDay !== studyDay)
          previous.issues.push('Conflicting scan timing');
        if (previous.bmd !== null && bmd !== null && Math.abs(previous.bmd - bmd) > 1e-9) {
          previous.issues.push('Conflicting BMD representations');
          previous.bmd = null;
        }
        for (const [field, incoming] of [
          ['scanner', scanner],
          ['protocol', method],
        ] as const) {
          if (previous[field] && incoming && previous[field] !== incoming)
            previous.issues.push(`Conflicting ${field}`);
          else if (!previous[field]) previous[field] = incoming;
        }
        const ids = previous.sources.map((s) => known(s.raw.SCANID)).filter(Boolean);
        if (known(r.SCANID) && ids.some((id) => id !== r.SCANID))
          previous.issues.push('Conflicting scan identity');
        // Missing representations cannot supply an unrecorded measurement.
        if (previous.bmd === null || bmd === null) previous.bmd = null;
        previous.sources.push(source);
        previous.issues.push(...issues);
      } else
        scans.set(key, {
          key,
          participant,
          site,
          side,
          date,
          phase,
          studyDay,
          bmd,
          scanner,
          protocol: method,
          issues,
          sources: [source],
        });
    }
  }
  const groups = new Map<string, Scan[]>();
  for (const scan of scans.values()) {
    const key = [
      scan.participant,
      scan.site,
      scan.side,
      scan.date ?? scan.key,
      scan.phase,
      scan.studyDay,
    ].join('|');
    const list = groups.get(key) ?? [];
    list.push(scan);
    groups.set(key, list);
  }
  return [...groups]
    .map(([key, scans]) => {
      const issues = scans.flatMap((s) => s.issues);
      for (const field of ['scanner', 'protocol'] as const)
        if (new Set(scans.map((s) => s[field]).filter(Boolean)).size > 1)
          issues.push(`Conflicting visit ${field}`);
      const first = scans[0];
      return {
        ...first,
        key,
        scans,
        issues: [...new Set(issues)],
        scanner: scans.every((s) => s.scanner) ? first.scanner : null,
        protocol: scans.every((s) => s.protocol) ? first.protocol : null,
        bmd: mean(scans.map((s) => s.bmd)),
      };
    })
    .sort(
      (a, b) =>
        a.participant.localeCompare(b.participant) ||
        (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
        a.key.localeCompare(b.key),
    );
}
export const researchVisits = buildVisits(sourceRows);

export function compareVisit(visit: ResearchVisit, visits = researchVisits) {
  const baselines = visits.filter(
    (v) =>
      v.participant === visit.participant &&
      v.site === visit.site &&
      v.side === visit.side &&
      v.phase === 'PRE_TEST',
  );
  const baseline = baselines.length === 1 ? baselines[0] : null;
  const elapsedDays =
    baseline?.date && visit.date
      ? (Date.parse(visit.date) - Date.parse(baseline.date)) / 86400000
      : null;
  const issues = [...visit.issues, ...(baseline?.issues ?? [])];
  if (baselines.length > 1) issues.push('Conflicting baseline visits');
  if (baseline?.scanner && visit.scanner && baseline.scanner !== visit.scanner)
    issues.push('Scanner changed');
  if (baseline?.protocol && visit.protocol && baseline.protocol !== visit.protocol)
    issues.push('Protocol changed');
  const eligible =
    !issues.length &&
    baseline &&
    elapsedDays !== null &&
    elapsedDays > 0 &&
    baseline.bmd !== null &&
    visit.bmd !== null &&
    baseline.scanner &&
    visit.scanner &&
    baseline.protocol &&
    visit.protocol &&
    visit.phase !== 'PRE_TEST';
  const changePct = eligible ? 100 * (visit.bmd! / baseline.bmd! - 1) : null;
  return {
    evidence: issues.length ? 'conflicting' : eligible ? 'supported' : 'insufficient',
    issues: [...new Set(issues)],
    baselineCount: baselines.length,
    baseline,
    elapsedDays,
    changePct,
    ratePctPerMonth: changePct !== null ? changePct / (elapsedDays! / 30.4375) : null,
  };
}
