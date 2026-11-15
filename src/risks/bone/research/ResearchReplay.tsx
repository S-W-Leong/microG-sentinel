import { useState } from 'react';
import type { BoneSite } from '../../types';
import { Field, Metric } from '../../cardio/TabUi';
import { display } from '../../cardio/presentation';
import { siteLabel, boneSites } from '../model';
import {
  catalogUrl,
  compareVisit,
  researchVisits,
  sourceFiles,
  type ResearchVisit,
} from './replay';
import './replay.css';

const participants = [...new Set(researchVisits.map((v) => v.participant))];
const phaseLabel = (phase: string | null) =>
  phase === 'PRE_TEST'
    ? 'Pre-bed-rest'
    : phase === 'IN_TEST'
      ? 'Bed rest'
      : phase === 'POST_TEST'
        ? 'Post-bed-rest'
        : 'Phase unknown';
const regionKey = (v: ResearchVisit) => `${v.site}|${v.side}`;

function VisitReplay({ visits }: { visits: ResearchVisit[] }) {
  const [key, setKey] = useState(
    (visits.find((v) => v.phase === 'IN_TEST' && v.date) ?? visits[0]).key,
  );
  const visit = visits.find((v) => v.key === key)!;
  const result = compareVisit(visit);
  const status =
    result.evidence === 'conflicting'
      ? 'Conflicting records'
      : result.evidence === 'supported'
        ? 'Recorded comparison'
        : 'Comparison unavailable';
  const dated = visits.filter((v) => v.date && v.bmd !== null);
  const times = dated.map((v) => Date.parse(v.date!));
  const minTime = Math.min(...times),
    span = Math.max(1, Math.max(...times) - minTime);
  const maxBmd = Math.max(1, ...dated.map((v) => v.bmd!)) * 1.1;
  return (
    <>
      <Field label="Research visit">
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          {visits.map((v) => (
            <option key={v.key} value={v.key}>
              {v.date ?? 'Date unknown'} · {phaseLabel(v.phase)} · day {v.studyDay ?? '?'}
            </option>
          ))}
        </select>
      </Field>
      <p>
        {visit.date ?? 'Date unknown'} · {phaseLabel(visit.phase)} · date precision only.
      </p>
      <dl>
        <Metric label="Visit BMD" value={display(visit.bmd, 'g/cm²', false, 4)} />
        <Metric label="Repeat scans" value={visit.scans.length} />
        <Metric
          label="Elapsed days"
          value={
            result.elapsedDays === null || result.elapsedDays < 0
              ? 'Not available'
              : display(result.elapsedDays, 'days')
          }
        />
      </dl>
      <div className="risk-result" aria-live="polite">
        <span>BMD change per month</span>
        <strong>
          {result.ratePctPerMonth === null
            ? status
            : display(result.ratePctPerMonth, '%/month', true)}
        </strong>
        <span>{status}</span>
        <span>Total change: {display(result.changePct, '%', true)}</span>
      </div>
      {result.evidence === 'insufficient' && <p>Dates, baseline or scanner metadata incomplete.</p>}
      {result.issues.map((issue) => (
        <p key={issue}>⚑ {issue}.</p>
      ))}
      <h2>Recorded DXA visits</h2>
      <div className="risk-chart-scroll" tabIndex={0} aria-label="Scrollable research DXA chart">
        <svg
          className="bone-research-chart"
          viewBox="0 0 600 210"
          role="img"
          aria-label="Recorded visit mean BMD by scan date; no interpolation"
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1="60" x2="570" y1={165 - f * 135} y2={165 - f * 135} stroke="#3c505b" />
              <text x="4" y={169 - f * 135}>
                {(f * maxBmd).toFixed(2)}
              </text>
            </g>
          ))}
          <text x="60" y="18">
            BMD · g/cm²
          </text>
          {dated.map((v) => (
            <circle
              key={v.key}
              cx={60 + ((Date.parse(v.date!) - minTime) / span) * 510}
              cy={165 - (v.bmd! / maxBmd) * 135}
              r={v.key === key ? 7 : 4}
              fill={compareVisit(v).evidence === 'conflicting' ? '#131c22' : '#b6e2e6'}
              stroke="#b6e2e6"
              strokeWidth="2"
            >
              <title>
                {v.date} · {display(v.bmd, 'g/cm²', false, 4)} · {v.scans.length} repeats
              </title>
            </circle>
          ))}
          <text x="60" y="195">
            {dated[0]?.date ?? 'Date unknown'}
          </text>
          <text x="570" y="195" textAnchor="end">
            {dated[dated.length - 1]?.date ?? 'Date unknown'}
          </text>
        </svg>
      </div>
      <p>One point per visit · no interpolation.</p>
      <details>
        <summary>Source evidence</summary>
        <p>
          {visit.scans.length} repeat scans ·{' '}
          {visit.scans.reduce((sum, s) => sum + s.sources.length, 0)} source representations.
        </p>
        <p>Scanner: {visit.scanner ?? 'Not recorded'}.</p>
        <p>Protocol: {visit.protocol ?? 'Not recorded'}.</p>
        <p>
          Baseline: {result.baseline?.date ?? 'Not available'} ·{' '}
          {display(result.baseline?.bmd, 'g/cm²', false, 4)}.
        </p>
        <p>Visit means count repeated exports once.</p>
        <p>Arithmetic means are demonstration rules, not NASA-approved baseline selection.</p>
        {visit.scans.map((s, i) => (
          <details key={s.key}>
            <summary>
              Repeat {i + 1} · {display(s.bmd, 'g/cm²', false, 4)}
            </summary>
            {s.sources.map((source, j) => (
              <div key={`${source.file}:${source.sourceRow}:${j}`}>
                <p>
                  {source.file} · row {source.sourceRow}.
                </p>
                <pre>{JSON.stringify(source.raw, null, 2)}</pre>
              </div>
            ))}
          </details>
        ))}
      </details>
    </>
  );
}

function ParticipantReplay({ participant }: { participant: string }) {
  const visits = researchVisits.filter((v) => v.participant === participant);
  const regions = [
    ...new Map(visits.map((v) => [regionKey(v), { site: v.site, side: v.side }])).entries(),
  ];
  const [region, setRegion] = useState(
    regions.find(([, r]) => r.site === 'total-hip' && r.side === 'right')?.[0] ?? regions[0][0],
  );
  const selected = regions.find(([key]) => key === region)![1];
  const selectSite = (site: BoneSite) => {
    const next =
      regions.find(([, r]) => r.site === site && r.side === selected.side) ??
      regions.find(([, r]) => r.site === site);
    if (next) setRegion(next[0]);
  };
  const skeletonButton = (site: BoneSite) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Select research ${siteLabel[site]}`,
    'aria-pressed': selected.site === site,
    onClick: () => selectSite(site),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSite(site);
      }
    },
    fill: selected.site === site ? '#f5a35c' : '#a3bdca',
  });
  return (
    <>
      <div className="bone-research-regions">
        <svg
          viewBox="0 0 180 300"
          role="group"
          aria-label="Research skeleton"
          className="bone-research-skeleton"
        >
          <g stroke="#8b9ea9" strokeWidth="6" fill="none" strokeLinecap="round">
            <circle cx="90" cy="25" r="19" />
            <path d="M90 47V64M50 70L90 60L130 70M50 70L30 170M130 70L150 170M70 180L60 285M110 180L120 285M64 83H116M60 103H120M65 123H115" />
          </g>
          <g {...skeletonButton('lumbar-spine')}>
            <rect x="81" y="70" width="18" height="78" rx="5" />
          </g>
          <g {...skeletonButton('total-hip')}>
            <path d="M56 149Q90 134 124 149L116 181L100 171H80L64 181Z" />
          </g>
          <g {...skeletonButton('femoral-neck')}>
            <ellipse cx="70" cy="187" rx="10" ry="16" />
            <ellipse cx="110" cy="187" rx="10" ry="16" />
          </g>
        </svg>
        <div className="risk-sites">
          {boneSites.map((site) => (
            <button
              type="button"
              key={site}
              aria-pressed={selected.site === site}
              onClick={() => selectSite(site)}
            >
              {siteLabel[site]}
            </button>
          ))}
        </div>
      </div>
      <Field label="Research region">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {regions.map(([key, r]) => (
            <option value={key} key={key}>
              {siteLabel[r.site]} · {r.side}
            </option>
          ))}
        </select>
      </Field>
      <VisitReplay key={region} visits={visits.filter((v) => regionKey(v) === region)} />
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab bone-research" aria-label="NASA bone research replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Bed-rest research</span>
          <h1>Bone research replay</h1>
        </div>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>Research participant</span>
      </div>
      <p>MR035G · UTMB Campaign 3 · DXA.</p>
      <p>Read-only · separate from selected crew.</p>
      <Field label="Research participant">
        <select value={participant} onChange={(e) => setParticipant(e.target.value)}>
          {participants.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <ParticipantReplay key={participant} participant={participant} />
      <details>
        <summary>Methods and sources</summary>
        <p>
          {participants.length} participants · {sourceFiles.length} curated files · explicit archive
          subset.
        </p>
        <p>Rates use elapsed scan days divided by 30.4375.</p>
        <p>Comparisons require matching scanner, protocol, region and side.</p>
        <p>2006 calibration corrections remain as reported; no factors are reapplied.</p>
        <p>Missing dates, scanner metadata and phase remain unknown.</p>
        <p>Nutrients, exercise adherence and fracture probability are unavailable.</p>
        <a href={catalogUrl} target="_blank" rel="noreferrer">
          NASA MR035G dataset
        </a>
        <p>NASA LSDA · downloaded 2026-11-15.</p>
        {sourceFiles.map((f) => (
          <p key={f.file}>
            {f.file}
            <br />
            SHA-256: <span className="risk-numeric">{f.sha256}</span>
          </p>
        ))}
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
