import { useState } from 'react';
import { Field, Metric } from '../../cardio/TabUi';
import { display } from '../../cardio/presentation';
import {
  compareResult,
  labResults,
  sourceFiles,
  studyUrl,
  submittedFile,
  timepoints,
  transformedFile,
} from './replay';
import './replay.css';

const participants = [...new Set(labResults.map((r) => r.participant))];
const markers = [...new Set(labResults.map((r) => r.marker))].sort((a, b) => a.localeCompare(b));

function MarkerReplay({ participant, marker }: { participant: string; marker: string }) {
  const [timepoint, setTimepoint] = useState('R+1');
  const series = labResults
    .filter((r) => r.participant === participant && r.marker === marker)
    .sort((a, b) => timepoints.indexOf(a.timepoint) - timepoints.indexOf(b.timepoint));
  const current = series.find((r) => r.timepoint === timepoint)!;
  const result = compareResult(current);
  const status =
    result.evidence === 'conflicting'
      ? 'Conflicting records'
      : result.evidence === 'supported'
        ? 'Recorded comparison'
        : 'Comparison unavailable';
  const max = Math.max(1, ...series.map((r) => r.value ?? 0)) * 1.1;
  const axisValue = (n: number) =>
    n >= 10000 ? n.toExponential(1) : String(Number(n.toPrecision(3)));
  return (
    <>
      <Field label="Research sample">
        <select value={timepoint} onChange={(e) => setTimepoint(e.target.value)}>
          {series.map((r) => (
            <option key={r.key} value={r.timepoint}>
              {r.timepoint} · {r.timepoint.startsWith('L-') ? 'Pre-flight' : 'Post-flight'}
            </option>
          ))}
        </select>
      </Field>
      <p>{current.sample} · serum · HD71.</p>
      <dl>
        <Metric label="Concentration" value={display(current.value, 'pg/mL', false, 4)} />
        <Metric label="Pre-flight mean" value={display(result.baseline, 'pg/mL', false, 4)} />
        <Metric label="Baseline samples" value={`${result.baselineSamples.length}/3`} />
      </dl>
      <div className="risk-result" aria-live="polite">
        <span>{marker} change vs baseline</span>
        <strong>{result.delta === null ? status : display(result.delta, 'pg/mL', true, 4)}</strong>
        <span>{status}</span>
        {result.delta !== null && (
          <span>Relative change: {display(result.changePct, '%', true)}</span>
        )}
      </div>
      {current.timepoint.startsWith('L-') && <p>Pre-flight sample · comparison unavailable.</p>}
      {result.issues.map((issue) => (
        <p key={issue}>⚑ {issue}.</p>
      ))}
      <h2>Recorded serum concentrations</h2>
      <div className="risk-chart-scroll" tabIndex={0} aria-label="Scrollable laboratory chart">
        <svg
          className="immune-lab-chart"
          viewBox="0 0 620 220"
          role="img"
          aria-label={`${marker} concentrations across seven sample visits, not elapsed time`}
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1="70" x2="590" y1={170 - f * 130} y2={170 - f * 130} stroke="#3c505b" />
              <text x="4" y={174 - f * 130}>
                {axisValue(f * max)}
              </text>
            </g>
          ))}
          <text x="70" y="20">
            {marker} · pg/mL
          </text>
          {series.map((r, i) => (
            <g key={r.key}>
              {r.value !== null && (
                <circle
                  cx={70 + (i * 520) / 6}
                  cy={170 - (r.value / max) * 130}
                  r={r.timepoint === timepoint ? 7 : 4}
                  fill={r.timepoint === timepoint ? '#f5a35c' : '#b6e2e6'}
                >
                  <title>
                    {r.timepoint}: {display(r.value, 'pg/mL', false, 4)}
                  </title>
                </circle>
              )}
              <text x={70 + (i * 520) / 6} y="203" textAnchor="middle">
                {r.timepoint}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p>Sample visits · spacing is not elapsed time.</p>
      <p>L = launch · R = return.</p>
      <details>
        <summary>Source evidence</summary>
        <p>
          {submittedFile} · row {current.source.sourceRow}.
        </p>
        <p>
          {transformedFile} · row {current.source.transformedRow}.
        </p>
        <p>Column: {current.source.transformedColumn}.</p>
        <p>
          Submitted: {current.source.raw.Concentration} pg/ml · transformed:{' '}
          {current.source.transformedRaw} pg/mL.
        </p>
        <p>Source percent: {current.source.raw.Percent} · all-participant pre-flight reference.</p>
        <p>Source percent is separate from this participant's calculated change.</p>
        <pre>{JSON.stringify(current.source.raw, null, 2)}</pre>
        <h3>Personal baseline evidence</h3>
        {result.baselineSamples.map((r) => (
          <p key={r.key}>
            {r.timepoint}: {display(r.value, 'pg/mL', false, 4)} · source row {r.source.sourceRow}.
          </p>
        ))}
        <p>Mean of three compatible pre-flight samples · demonstration assumption.</p>
        <p>Supported means data checks passed, without clinical validation.</p>
      </details>
    </>
  );
}

function ParticipantReplay({ participant }: { participant: string }) {
  const [marker, setMarker] = useState('IL-6');
  return (
    <>
      <Field label="Laboratory marker">
        <select value={marker} onChange={(e) => setMarker(e.target.value)}>
          {markers.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <MarkerReplay key={marker} participant={participant} marker={marker} />
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab immune-labs" aria-label="NASA immune laboratory replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Serum research</span>
          <h1>Immune lab replay</h1>
        </div>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>Research participant</span>
      </div>
      <p>OSD-575 · Inspiration4 · Eve Technologies HD71.</p>
      <p>Read-only · separate from crew and hives demo.</p>
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
        <p>4 participants · 28 samples · 71 markers.</p>
        <p>HD71 concentration measurements were extrapolated from standard curves.</p>
        <p>Samples are pre/post-flight, without invented calendar timestamps.</p>
        <p>R+194 appears in the files and sample metadata.</p>
        <p>Raw and transformed concentrations agree for all 1,988 results.</p>
        <p>Alamar NPQ, cardiovascular panels and metabolic results are excluded here.</p>
        <p>Lab measurements do not adjust the hives demo.</p>
        <a href={studyUrl} target="_blank" rel="noreferrer">
          NASA OSD-575 dataset
        </a>
        <p>NASA OSDR · CC0-1.0 · downloaded 2026-11-15.</p>
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
