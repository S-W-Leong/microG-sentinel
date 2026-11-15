import { useState } from 'react';
import {
  datasetUrl,
  displayValue,
  downloadUrl,
  measures,
  participantRows,
  participants,
  sourceFile,
  type Measure,
} from './replay';
import './replay.css';

function ParticipantReplay({ participant }: { participant: string }) {
  const rows = participantRows(participant);
  const [id, setId] = useState(rows[0].id);
  const [measure, setMeasure] = useState<Measure>('Happy');
  const row = rows.find((entry) => entry.id === id)!;
  return (
    <>
      <div className="mood-research-selectors">
        <label className="risk-field">
          <span>Measure</span>
          <select value={measure} onChange={(event) => setMeasure(event.target.value as Measure)}>
            {measures.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="risk-field">
          <span>Source day</span>
          <select value={id} onChange={(event) => setId(event.target.value)}>
            {rows.map((entry) => (
              <option key={entry.id} value={entry.id}>
                Day {entry.day} · {entry.date}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="risk-result" aria-live="polite">
        <span>{measure}</span>
        <strong>{displayValue(row.values[measure])}</strong>
        <span>
          {row.date} · source day {row.day}
        </span>
      </div>
      <p>Recorded item values; scale anchors are not supplied.</p>
      <dl className="mood-research-values">
        {measures.map((item) => (
          <div key={item}>
            <dt>{item}</dt>
            <dd>{displayValue(row.values[item])}</dd>
          </div>
        ))}
      </dl>
      <details>
        <summary>Source evidence</summary>
        <p>
          {sourceFile} · CSV row {row.sourceRow} · ID {row.id}.
        </p>
        <pre>{JSON.stringify(row.raw, null, 2)}</pre>
        <p>DayCount is the source day index, not a verified bed-rest phase.</p>
        <p>Dates have day precision only; absent days are not filled.</p>
        <p>{rows.length} recorded days for this research participant.</p>
      </details>
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab mood-research" aria-label="NASA mood research replay">
      <header className="risk-heading">
        <h1>Mood research replay</h1>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>AD ASTRA · CFT70</span>
      </div>
      <p>Bed-rest research · read-only · separate from selected crew.</p>
      <label className="risk-field">
        <span>Research participant</span>
        <select value={participant} onChange={(event) => setParticipant(event.target.value)}>
          {participants.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <ParticipantReplay key={participant} participant={participant} />
      <details>
        <summary>Methods and sources</summary>
        <p>Three research participants; four items from NASA's public CFT70 file.</p>
        <p>Missing values stay unknown; no totals, thresholds or crew comparisons.</p>
        <p>These research values have no clinical meaning here.</p>
        <p>
          <a href={datasetUrl}>NASA LSDA catalog</a> · NNX12AB40G_CFT70
        </p>
        <p>
          <a href={downloadUrl}>Original CSV</a> · downloaded 2026-11-15.
        </p>
        <p>Public download; a separate reuse licence is not established.</p>
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
