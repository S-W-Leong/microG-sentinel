import { useState } from 'react';
import { Field, Metric } from '../../cardio/TabUi';
import {
  datasetUrl,
  eyesFor,
  mainFile,
  participants,
  phaseLabels,
  regions,
  sourceFiles,
  thickness,
  type Region,
  type ResearchEye,
} from './replay';
import './replay.css';

function EyeReadings({ record }: { record: ResearchEye }) {
  const [visit, setVisit] = useState(0);
  const [region, setRegion] = useState<Region>('Nasal');
  const selected = record.visits[visit];
  const values = selected.values[region];
  return (
    <>
      <div className="sans-research-fields">
        <Field label="Visit">
          <select value={visit} onChange={(event) => setVisit(Number(event.target.value))}>
            {record.visits.map((entry, index) => (
              <option key={entry.phase} value={index}>
                {phaseLabels[entry.phase]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scan region">
          <select value={region} onChange={(event) => setRegion(event.target.value as Region)}>
            {regions.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </Field>
      </div>
      <p>
        {record.cohort} · {record.group}.
      </p>
      <h2>{phaseLabels[selected.phase]} measurements</h2>
      <dl className="risk-metrics">
        <Metric label="Total retina" value={thickness(values.Total_Retinal)} />
        <Metric label="Choroid" value={thickness(values.Choroidal)} />
      </dl>
      <table className="sans-research-table">
        <caption>{region} thickness · mm</caption>
        <thead>
          <tr>
            <th scope="col">Visit</th>
            <th scope="col">Total retina</th>
            <th scope="col">Choroid</th>
          </tr>
        </thead>
        <tbody>
          {record.visits.map((entry, index) => (
            <tr
              key={entry.phase}
              className={index === visit ? 'sans-research-selected' : undefined}
            >
              <th scope="row">{phaseLabels[entry.phase]}</th>
              <td>{entry.values[region].Total_Retinal?.toFixed(3) ?? 'Not recorded'}</td>
              <td>{entry.values[region].Choroidal?.toFixed(3) ?? 'Not recorded'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Source visit labels; controls were not unloaded.</p>
      <details>
        <summary>Source evidence</summary>
        <p>
          {mainFile} · row {record.sourceRow} · {record.sample}.
        </p>
        <p>Animal and eye: s_OSD-679.txt · row {record.metadataRow}.</p>
        <p>
          Unloading days: {record.unloadingDays}; recovery days: {record.reloadingDays}.
        </p>
        <p>Visit column: {selected.phase}.</p>
        <pre>{JSON.stringify(record.raw, null, 2)}</pre>
      </details>
    </>
  );
}

function ParticipantReadings({ participant }: { participant: string }) {
  const eyes = eyesFor(participant);
  const [sample, setSample] = useState(eyes[0].sample);
  const record = eyes.find((entry) => entry.sample === sample)!;
  return (
    <>
      <Field label="Eye">
        <select value={sample} onChange={(event) => setSample(event.target.value)}>
          {eyes.map((entry) => (
            <option key={entry.sample} value={entry.sample}>
              {entry.eye}
            </option>
          ))}
        </select>
      </Field>
      <EyeReadings key={sample} record={record} />
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab sans-research" aria-label="NASA SANS research replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Rat ground analog</span>
          <h1>Eye research replay</h1>
        </div>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>OSDR · OSD-679</span>
        <span>Animal research</span>
      </div>
      <p>Research rats, not crew · read-only · no clinical meaning.</p>
      <Field label="Research animal">
        <select value={participant} onChange={(event) => setParticipant(event.target.value)}>
          {participants.map((entry) => (
            <option key={entry}>{entry}</option>
          ))}
        </select>
      </Field>
      <ParticipantReadings key={participant} participant={participant} />
      <details>
        <summary>Dataset limits</summary>
        <p>Six Long-Evans rats · both eyes · selected OCT records.</p>
        <p>Total retinal thickness is not retinal nerve fibre layer thickness.</p>
        <p>Blank source cells stay unrecorded; visit dates are unavailable.</p>
        <p>No crew baselines, scores or vector signals use these values.</p>
        <a href={datasetUrl} target="_blank" rel="noreferrer">
          NASA OSD-679 dataset
        </a>
        <p>Downloaded 2026-11-15 · source units preserved in millimetres.</p>
        {sourceFiles.map((file) => (
          <p key={file.name}>
            {file.name}
            <br />
            SHA-256: <span className="risk-numeric">{file.sha256}</span>
          </p>
        ))}
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
