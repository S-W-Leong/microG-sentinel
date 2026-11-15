import { useState } from 'react';
import {
  dataset,
  displayValue,
  measures,
  participants,
  participantVisits,
  phases,
  type Measure,
  type IntakeObservation,
} from './replay';
import './replay.css';

function IntakeChart({
  visits,
  measure,
  selected,
}: {
  visits: IntakeObservation[];
  measure: Measure;
  selected: string;
}) {
  const { label, unit } = measures[measure];
  const maximum = Math.max(1, ...visits.map((visit) => visit.values[measure] ?? 0));
  const top = Math.ceil(maximum / 5) * 5;
  // Dates locate source observations only; no time-of-day or missing visits are inferred.
  const firstDay = Date.parse(visits[0].date);
  const span = Date.parse(visits[visits.length - 1].date) - firstDay;
  return (
    <div className="food-research-scroll" tabIndex={0} aria-label="Scrollable intake chart">
      <svg
        className="food-research-chart"
        viewBox="0 0 640 230"
        role="img"
        aria-label={`${visits[0].participant} recorded ${label.toLowerCase()} in ${unit} by date`}
      >
        {[0, top / 2, top].map((value) => {
          const y = 176 - (value / top) * 140;
          return (
            <g key={value}>
              <line x1="72" x2="620" y1={y} y2={y} stroke="#3c505b" />
              <text x="64" y={y + 5} textAnchor="end">
                {new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value)}
              </text>
            </g>
          );
        })}
        <text x="72" y="18">
          {unit}
        </text>
        {visits.map((visit) => {
          const value = visit.values[measure];
          if (value === null) return null;
          return (
            <circle
              key={visit.id}
              cx={72 + ((Date.parse(visit.date) - firstDay) / (span || 1)) * 548}
              cy={176 - (value / top) * 140}
              r={visit.id === selected ? 5 : 3}
              fill={visit.id === selected ? '#ff6b3d' : '#b6d6d8'}
              stroke={visit.id === selected ? '#fff' : 'none'}
            >
              <title>
                {visit.date}: {displayValue(value, unit)}
              </title>
            </circle>
          );
        })}
        <text x="72" y="207">
          {visits[0].date}
        </text>
        <text x="620" y="207" textAnchor="end">
          {visits[visits.length - 1].date}
        </text>
      </svg>
    </div>
  );
}

function ParticipantReplay({ participant }: { participant: string }) {
  const visits = participantVisits(participant);
  const [measure, setMeasure] = useState<Measure>('energy');
  const [id, setId] = useState(visits[0].id);
  const visit = visits.find((row) => row.id === id)!;
  const metric = measures[measure];
  const source = dataset.files.find((file) => file.name === visit.sourceFile)!;
  return (
    <>
      <div className="food-fields">
        <label>
          Measure
          <select value={measure} onChange={(event) => setMeasure(event.target.value as Measure)}>
            {(Object.keys(measures) as Measure[]).map((key) => (
              <option key={key} value={key}>
                {measures[key].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visit
          <select value={id} onChange={(event) => setId(event.target.value)}>
            {visits.map((row) => (
              <option key={row.id} value={row.id}>
                {row.date} · {phases[row.phase]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="food-research-reading" aria-live="polite">
        <span>{metric.label}</span>
        <strong className="food-value">{displayValue(visit.values[measure], metric.unit)}</strong>
        <span>
          <time>{visit.date}</time> · {phases[visit.phase]}
        </span>
      </div>
      <h2>Recorded intake</h2>
      <IntakeChart visits={visits} measure={measure} selected={id} />
      <p>Dots are source readings; missing values stay blank.</p>
      <details>
        <summary>Source evidence</summary>
        <dl className="food-research-evidence">
          <dt>Participant</dt>
          <dd>{participant}</dd>
          <dt>Source column</dt>
          <dd>{metric.sourceColumn}</dd>
          <dt>Source value</dt>
          <dd>{visit.rawValues[measure] || 'Not recorded'}</dd>
          <dt>Source date</dt>
          <dd>{visit.sourceDate} · date only</dd>
          <dt>Source phase</dt>
          <dd>{visit.phase}</dd>
          <dt>Source day</dt>
          <dd>{visit.studyDay}</dd>
          <dt>Source row</dt>
          <dd>
            {visit.sourceRow} · ID {visit.sourceId}
          </dd>
          <dt>Source file</dt>
          <dd>
            <a href={source.url}>{source.name}</a>
          </dd>
        </dl>
        <p>Pre-test day signs differ between participants; source signs are retained.</p>
        <p>No energy requirement or personal target is supplied.</p>
      </details>
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="food-tab food-research" aria-label="NASA dietary replay">
      <header className="food-heading">
        <div>
          <div className="food-chips">
            <span>NASA research replay</span>
            <span>MR016G · Campaign 3</span>
          </div>
          <h1>Bed-rest dietary intake</h1>
        </div>
      </header>
      <p>Research participants, separate from your crew.</p>
      <label className="food-research-participant">
        Participant
        <select value={participant} onChange={(event) => setParticipant(event.target.value)}>
          {participants.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <ParticipantReplay key={participant} participant={participant} />
      <p>
        <a href={dataset.url}>NASA LSDA source</a> · UTMB bed-rest research.
      </p>
      <footer>Read-only research · no clinical meaning</footer>
    </section>
  );
}
