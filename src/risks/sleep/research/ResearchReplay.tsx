import { useState } from 'react';
import { Field, Metric } from '../../cardio/TabUi';
import { display } from '../../cardio/presentation';
import {
  compareNight,
  datasetUrl,
  mainFile,
  queryFile,
  researchNights,
  sourceFiles,
} from './replay';
import './replay.css';

const participants = [...new Set(researchNights.map((n) => n.participant))];
const phases = { PRE_TEST: 'Pre-bed-rest', IN_TEST: 'Bed rest', POST_TEST: 'Recovery' };

function ParticipantReplay({ participant }: { participant: string }) {
  const nights = researchNights.filter((n) => n.participant === participant);
  const [id, setId] = useState(nights.find((n) => n.phase === 'IN_TEST')!.id);
  const night = nights.find((n) => n.id === id)!;
  const comparison = compareNight(night);
  const status =
    comparison.evidence === 'conflicting'
      ? 'Conflicting records'
      : comparison.evidence === 'insufficient'
        ? 'Comparison unavailable'
        : 'Recorded comparison';
  return (
    <>
      <Field label="Observation">
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {nights.map((n) => (
            <option key={n.id} value={n.id}>
              {n.date} · {phases[n.phase]} · day {n.phase === 'PRE_TEST' ? '−' : ''}
              {n.studyDay}
            </option>
          ))}
        </select>
      </Field>
      <p>
        {night.date} · {phases[night.phase]} · date precision only.
      </p>
      <dl>
        <Metric label="Sleep" value={display(night.durationHours, 'h')} />
        <Metric label="Efficiency" value={display(night.efficiencyPct, '%')} />
        <Metric
          label="Latency"
          value={display(night.latencyHours === null ? null : night.latencyHours * 60, 'min')}
        />
      </dl>
      <div className="risk-result" aria-live="polite">
        <span>Sleep change vs baseline</span>
        <strong>
          {comparison.durationDeltaMinutes === null
            ? status
            : display(comparison.durationDeltaMinutes, 'min', true)}
        </strong>
        <span>{status}</span>
        <span>Efficiency change: {display(comparison.efficiencyDeltaPoints, 'pp', true)}</span>
      </div>
      <h2>Recorded sleep duration</h2>
      <div className="risk-chart-scroll" tabIndex={0} aria-label="Scrollable research chart">
        <svg
          className="sleep-research-chart"
          viewBox="0 0 640 200"
          role="img"
          aria-label={`${participant} sleep duration by date; gaps are missing, hollow points have source conflicts`}
        >
          {[0, 4, 8, 12].map((h) => (
            <g key={h}>
              <line x1="40" x2="620" y1={164 - h * 11} y2={164 - h * 11} stroke="#3c505b" />
              <text x="4" y={168 - h * 11}>
                {h} h
              </text>
            </g>
          ))}
          {nights.map((n, i) =>
            n.durationHours === null ? null : (
              <circle
                key={n.id}
                cx={40 + (i * 580) / (nights.length - 1)}
                cy={164 - n.durationHours * 11}
                r={n.id === id ? 5 : 3}
                fill={n.conflicts.length ? '#131c22' : '#b6e2e6'}
                stroke={n.id === id ? '#fff' : '#b6e2e6'}
                strokeWidth={n.id === id ? 2 : 1}
              >
                <title>
                  {n.date}: {display(n.durationHours, 'h')}
                  {n.conflicts.length ? ' · conflicting records' : ''}
                </title>
              </circle>
            ),
          )}
          <text x="40" y="193">
            2004-09-07
          </text>
          <text x="620" y="193" textAnchor="end">
            2004-11-14
          </text>
        </svg>
      </div>
      <p>Gaps = missing · hollow = conflicting.</p>
      {night.notes && <p>Source note: {night.notes}.</p>}
      <details>
        <summary>Source evidence</summary>
        <p>
          {mainFile} · row {night.sourceRow} · ID {night.id}.
        </p>
        <p>Baseline IDs: {comparison.baselineIds.join(', ')}.</p>
        <p>Baseline = mean of two complete, comparable pre-bed-rest nights.</p>
        <p>Demonstration assumption · not a NASA baseline rule.</p>
        <p>Baseline sleep: {display(comparison.baselineHours, 'h')}.</p>
        <pre>{JSON.stringify(night.raw, null, 2)}</pre>
        <p>
          {queryFile} · {night.queryRows.length} matching source records.
        </p>
        {night.conflicts.map((c) => (
          <p key={c}>⚑ {c}.</p>
        ))}
        {night.queryRows.map((q) => (
          <details key={q.sourceRow}>
            <summary>Query row {q.sourceRow}</summary>
            <pre>{JSON.stringify(q.row, null, 2)}</pre>
          </details>
        ))}
        <p>Missing main-file values remain unknown; query values never silently replace them.</p>
      </details>
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab sleep-research" aria-label="NASA sleep research replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Bed-rest research</span>
          <h1>Sleep research replay</h1>
        </div>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>Research participant</span>
      </div>
      <p>UTMB Campaign 1 · wrist actigraphy · 2004.</p>
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
        <p>Read-only research · crew observations stay separate.</p>
        <p>Three participants · 207 main-file rows · 17 rows have missing measurements.</p>
        <p>Two participants lack main-file baseline measurements.</p>
        <p>Sleep stages, sleepiness, fatigue, clock shift and 24-hour debt are unavailable.</p>
        <p>
          Raw measurements can have source disagreements; comparisons require compatible evidence.
        </p>
        <p>Historical medication notes describe source context only.</p>
        <p>Duration and latency use HH:mm; efficiency is reported directly.</p>
        <a href={datasetUrl} target="_blank" rel="noreferrer">
          NASA BRSMAct dataset
        </a>
        <p>NASA Life Sciences Portal · downloaded 2026-11-15.</p>
        {sourceFiles.map((f) => (
          <p key={f.name}>
            {f.name}
            <br />
            SHA-256: <span className="risk-numeric">{f.sha256}</span>
          </p>
        ))}
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
