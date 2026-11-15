import { useState } from 'react';
import { Field } from '../../cardio/TabUi';
import {
  datasetUrl,
  mainFile,
  participants,
  selectTrials,
  showValue,
  sourceFiles,
  summaryEvidence,
  summaryFile,
  visits,
  type Test,
} from './replay';
import './replay.css';

function ParticipantReplay({ participant }: { participant: string }) {
  const options = visits.filter((visit) => visit.participant === participant);
  const [visitId, setVisitId] = useState(options.find((visit) => visit.phase === 'POST_TEST')!.id);
  const [test, setTest] = useState<Test>('all');
  const trials = selectTrials(participant, visitId, test);
  const evidence = summaryEvidence(visitId);
  const maxSeconds = Math.max(10, ...trials.map((trial) => trial.seconds ?? 0));
  return (
    <>
      <div className="balance-research-selectors">
        <Field label="Test">
          <select value={test} onChange={(event) => setTest(event.target.value as Test)}>
            <option value="all">All course trials</option>
            <option value="CW">Clockwise course</option>
            <option value="CCW">Counterclockwise course</option>
          </select>
        </Field>
        <Field label="Visit">
          <select value={visitId} onChange={(event) => setVisitId(event.target.value)}>
            {options.map((visit) => (
              <option value={visit.id} key={visit.id}>
                {visit.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p>Day labels follow the source; calendar dates were not recorded.</p>
      <h2>Course trials</h2>
      <p>CW = clockwise · CCW = counterclockwise.</p>
      <table className="balance-research-trials">
        <caption>Functional mobility · time in seconds</caption>
        <thead>
          <tr>
            <th scope="col">Trial</th>
            <th scope="col">Direction</th>
            <th scope="col">Time</th>
            <th scope="col">Hits</th>
          </tr>
        </thead>
        <tbody>
          {trials.map((trial) => (
            <tr key={trial.id}>
              <th scope="row">{trial.trial}</th>
              <td>{trial.direction}</td>
              <td>
                <span>{showValue(trial.seconds, 's')}</span>
                <span className="balance-research-bar" aria-hidden="true">
                  {trial.seconds !== null && (
                    <span style={{ width: `${(trial.seconds / maxSeconds) * 100}%` }} />
                  )}
                </span>
              </td>
              <td>{showValue(trial.hits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Original trial values; no crew baseline or health score.</p>
      {evidence.mismatch && (
        <p role="status">Source mismatch: the published average differs from the six-trial mean.</p>
      )}
      <details>
        <summary>Source evidence</summary>
        <p>{mainFile}</p>
        {trials.map((trial) => (
          <details key={trial.id}>
            <summary>
              Trial {trial.trial} · row {trial.sourceRow}
            </summary>
            <p>
              Source ID {trial.id} · {participant}.
            </p>
            {trial.notes && <p>Source note: {trial.notes}</p>}
            <pre>{JSON.stringify(trial.raw, null, 2)}</pre>
          </details>
        ))}
        <p>{summaryFile}</p>
        <p>Published average: {showValue(evidence.publishedMean, 's')}.</p>
        <p>
          Six-trial mean: {showValue(evidence.trialMean, 's')} · calculated here, all directions.
        </p>
        <p>No published value is corrected or substituted.</p>
        {evidence.summaries.map((summary) => (
          <details key={summary.sourceRow}>
            <summary>Summary row {summary.sourceRow}</summary>
            <pre>{JSON.stringify(summary.row, null, 2)}</pre>
          </details>
        ))}
      </details>
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab balance-research" aria-label="NASA balance research replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Bed-rest research</span>
          <h1>Functional mobility replay</h1>
        </div>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>NASA LSDA · BRSMFMT</span>
      </div>
      <p>UTMB Campaign 1 · 60-day head-down bed rest.</p>
      <p>Research participants, separate from your crew · read-only.</p>
      <Field label="Research participant">
        <select value={participant} onChange={(event) => setParticipant(event.target.value)}>
          {participants.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
      </Field>
      <ParticipantReplay key={participant} participant={participant} />
      <details>
        <summary>Dataset provenance</summary>
        <p>
          <a href={datasetUrl} target="_blank" rel="noreferrer">
            NASA source
          </a>{' '}
          · BRSMFMT · retrieved 2026-11-15.
        </p>
        <p>
          Three research participants; obstacle-course timings are not tablet sway measurements.
        </p>
        <p>NA stays unknown; a recorded zero stays zero.</p>
        <p>Ground analog observations have no clinical meaning in this app.</p>
        <p>
          Public NASA release; a separate reuse licence was not stated in the downloaded metadata.
        </p>
        {sourceFiles.map((file) => (
          <details key={file.name}>
            <summary>{file.name}</summary>
            <p>
              <a href={file.url} target="_blank" rel="noreferrer">
                Source file
              </a>
            </p>
            <p>
              SHA-256: <code>{file.sha256}</code>
            </p>
          </details>
        ))}
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
