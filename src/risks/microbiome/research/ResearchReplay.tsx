import { useState } from 'react';
import { Field, Metric } from '../../cardio/TabUi';
import {
  database,
  dataset,
  displayPercent,
  metadataFile,
  metadataMember,
  participants,
  samplesFor,
  sourceFiles,
  sourceTable,
} from './replay';
import './replay.css';

function ParticipantReplay({ participant }: { participant: string }) {
  const samples = samplesFor(participant);
  const [id, setId] = useState(samples[0].id);
  const sample = samples.find((item) => item.id === id)!;
  return (
    <>
      <Field label="Sample">
        <select value={id} onChange={(event) => setId(event.target.value)}>
          {samples.map((item) => (
            <option key={item.id} value={item.id}>
              {item.timepoint} · {item.phase}
            </option>
          ))}
        </select>
      </Field>
      <div aria-live="polite">
        <p>
          <span className="risk-id">{sample.id}</span> · {sample.site}
        </p>
        <p>{sample.timeLabel} · relative timing only.</p>
        <h2>Selected genera</h2>
        <p>Estimated relative abundance (%) · 0–100 scale.</p>
        <ul className="microbiome-genus-chart" aria-label="Genus relative abundances">
          {sample.genera.map((genus) => (
            <li key={genus.clade}>
              <div className="microbiome-genus-value">
                <span>{genus.name}</span>
                <strong className="risk-numeric">{displayPercent(genus.valuePct)}</strong>
              </div>
              <div className="microbiome-genus-track" aria-hidden="true">
                {genus.valuePct !== null && <span style={{ width: `${genus.valuePct}%` }} />}
              </div>
            </li>
          ))}
        </ul>
        <dl>
          <Metric label="Unclassified" value={displayPercent(sample.unclassified.valuePct)} />
        </dl>
      </div>
      <p>Six selected genera; other genera are omitted.</p>
      <details>
        <summary>Source evidence</summary>
        <p>
          Table: {sourceTable} · column <span className="risk-numeric">{sample.sourceColumn}</span>.
        </p>
        <p>
          Metadata: {metadataFile} / {metadataMember} · row{' '}
          <span className="risk-numeric">{sample.metadataRow}</span>.
        </p>
        <p>
          Sample: <span className="risk-id">{sample.sampleName}</span> · {sample.material}.
        </p>
        <ul className="microbiome-source-values">
          {[
            ...sample.genera,
            { ...sample.unclassified, name: 'Unclassified', clade: 'UNCLASSIFIED' },
          ].map((entry) => (
            <li key={entry.clade}>
              <strong>{entry.name}</strong> · row{' '}
              <span className="risk-numeric">{entry.sourceRow}</span>
              <br />
              Source value: <span className="risk-numeric">{entry.raw}</span> %
              <br />
              {entry.clade}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

export default function ResearchReplay() {
  const [participant, setParticipant] = useState(participants[0]);
  return (
    <section className="risk-tab microbiome-research" aria-label="NASA microbiome research replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Skin microbiome</span>
          <h1>Microbiome research replay</h1>
        </div>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>{dataset.id}</span>
        <span>Research participant</span>
      </div>
      <p>Inspiration4 · deltoid skin swabs.</p>
      <p>Read-only · separate from selected crew.</p>
      <Field label="Research participant">
        <select value={participant} onChange={(event) => setParticipant(event.target.value)}>
          {participants.map((person) => (
            <option key={person}>{person}</option>
          ))}
        </select>
      </Field>
      <ParticipantReplay key={participant} participant={participant} />
      <details>
        <summary>Methods and sources</summary>
        <p>Four research participants · two skin-swab samples each.</p>
        <p>Six of 58 genera, ranked by mean supplied abundance across all eight samples.</p>
        <p>Values retain the source scale; selected genera are not rescaled to 100%.</p>
        <p>MetaPhlAn estimates composition, not absolute microbial counts.</p>
        <p>Skin swabs do not measure gut composition or explain crew symptoms.</p>
        <p>Research observations have no clinical meaning in this app.</p>
        <p>Zero is a reported estimate, not proof of absence; missing values stay unknown.</p>
        <p>GGB2722 is the source taxonomy label and is not renamed.</p>
        <p>Database: {database}.</p>
        <p>{dataset.title}.</p>
        <p>
          <a href={dataset.url} target="_blank" rel="noreferrer">
            NASA OSD-574
          </a>{' '}
          ·{' '}
          <a href={`https://doi.org/${dataset.doi}`} target="_blank" rel="noreferrer">
            Dataset DOI
          </a>
        </p>
        <p>NASA OSDR · downloaded {dataset.downloadDate}.</p>
        <p>
          Public unrestricted files; a separate reuse licence was not stated in the inspected
          metadata.
        </p>
        {sourceFiles.map((file) => (
          <p key={file.name}>
            <a href={file.url} target="_blank" rel="noreferrer">
              {file.name}
            </a>
            <br />
            SHA-256: <span className="risk-numeric">{file.sha256}</span>
          </p>
        ))}
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
