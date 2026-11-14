import { buildReviewCard } from '../ui/reviewCard';
import type { AssessmentResult } from '../types';
import { StatusBadge } from '../components/AssessmentCard';
import { getReplayResult, getRecords } from '../ui/dataSource';
import { nasa, replayCitation, sourceLabel } from '../ui/presentation';

export default function Evidence({ result }: { result: AssessmentResult }) {
  const ids = [
    ...new Set([result.assessmentId, ...(result.calculation?.baseline.recordIds ?? [])]),
  ];
  const target = getRecords().find((r) => r.id === result.assessmentId)!;
  const candidates = getRecords().filter(
    (r) =>
      r.isBaseline &&
      r.source === target.source &&
      r.subjectId === target.subjectId &&
      r.comparisonGroupId === target.comparisonGroupId,
  );
  ids.push(...candidates.map((r) => r.id));
  const records = getRecords().filter(
    (r) => ids.includes(r.id) || (r.duplicateOf && ids.includes(r.duplicateOf)),
  );
  const research = result.source === 'nasa-research-replay';
  function download() {
    const summary = buildReviewCard(getRecords(), result, new Date().toISOString());
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `microg-${result.source}-${result.assessmentId}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const replay = getReplayResult();
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">EVIDENCE AND FOLLOW-UP / 04</div>
        <h1>Prepare for review.</h1>
        <p>Keep the measurements, assumptions, and unresolved questions together.</p>
      </div>
      <section className="panel">
        <StatusBadge result={result} />
        <h2>{result.finding}</h2>
        <p>{result.reference.note}</p>
        <button className="button" onClick={download}>
          Export review card ↓
        </button>
        <p className="subtle">
          Downloads a JSON file locally, with source-labelled records, calculation, limits, issues,
          and NASA reference links{research ? ', including the MR080G dataset citation' : ''}.
        </p>
      </section>
      <section className="panel">
        <h2>Source records</h2>
        {research ? (
          <p>
            Curated NASA bed-rest research records. Raw source paths, field references, and
            unresolved notes are listed below.{' '}
            <a href={replayCitation.url}>{replayCitation.title} ↗</a>
          </p>
        ) : (
          <p>{sourceLabel(result.source)}</p>
        )}
        {records.map((record) => (
          <details key={record.id} open>
            <summary>
              {record.id} · {record.date ?? 'Date missing'}
            </summary>
            <dl className="facts">
              <div>
                <dt>Participant / source</dt>
                <dd>
                  {record.subjectId} / {record.source}
                </dd>
              </div>
              <div>
                <dt>Measurement</dt>
                <dd>
                  {record.metric ?? 'Metric missing'} · {record.value ?? 'Value missing'}{' '}
                  {record.unit ?? 'Unit missing'}
                </dd>
              </div>
              <div>
                <dt>Method / protocol</dt>
                <dd>
                  {record.method ?? 'Method missing'} / {record.protocol ?? 'Protocol missing'}
                </dd>
              </div>
              <div>
                <dt>Phase / modality</dt>
                <dd>
                  {record.phase ?? 'Phase missing'} / {record.modality ?? 'Modality missing'}
                </dd>
              </div>
              <div>
                <dt>Baseline / duplicate</dt>
                <dd>
                  {record.isBaseline ? 'Baseline record' : 'Assessment'} /{' '}
                  {record.duplicateOf ?? 'No linked duplicate'}
                </dd>
              </div>
            </dl>
            <ul>
              {record.sourceNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>
      <section className="panel">
        <h2>Unresolved issues & follow-up</h2>
        {result.issues.length ? (
          result.issues.map((issue, index) => (
            <div key={index}>
              <h3>{issue.code}</h3>
              <p>{issue.message}</p>
              <p>{issue.followUp}</p>
            </div>
          ))
        ) : (
          <p>
            No unresolved evidence issues in this comparison. Supported evidence does not mean
            complete clinical adjudication.
          </p>
        )}
        <ul>
          {result.followUp.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3>Interpretation limits</h3>
        <ul>
          {result.limits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="eyebrow">HEALTH-IMPROVEMENT CONTEXT</div>
        <h2>Why aerobic fitness matters</h2>
        <p>
          Aerobic capacity supports demanding mission activities, including spacewalks and emergency
          tasks. <a href={nasa.risk}>NASA · Reduced-fitness risk ↗</a>
        </p>
        <h3>How NASA protects it</h3>
        <p>
          In-flight exercise is a countermeasure to fitness loss. NASA also investigates exercise
          equipment constraints, including through Zero T2.{' '}
          <a href={nasa.risk}>NASA · Fitness countermeasures ↗</a> ·{' '}
          <a href={nasa.exercise}>NASA · Zero T2 ↗</a>
        </p>
        <h3>
          {research || result.source === 'user-entered'
            ? 'Astronaut workflow context (separate from this record)'
            : 'What the astronaut can do'}
        </h3>
        <p>
          Follow the assigned exercise plan and raise a measured decrease with the responsible
          specialist through existing procedures. This review card helps organize that discussion.{' '}
          <a href={nasa.risk}>NASA · Fitness monitoring and training context ↗</a>
        </p>
        <p>
          Record assessments consistently across mission phases.{' '}
          <a href={nasa.measures}>NASA · Standard Measures ↗</a>
        </p>
        <p className="subtle">
          This prototype does not change exercise intensity, frequency, or duration. Research
          participants receive no crew recommendation or mission determination.
        </p>
      </section>
      <section className="panel">
        <h2>Spaceflight and research context</h2>
        <p>
          Changing gravity places new demands on the body, while distance from Earth makes access to
          supplies and medical care more difficult.{' '}
          <a href="https://www.nasa.gov/hrp/hazards/">NASA · Five Hazards</a>
        </p>
        <p>
          NASA's ongoing Human Research Program investigates methods to protect crew health and
          performance.{' '}
          <a href="https://www.nasa.gov/hrp/ongoing-hrp-research/">Explore ongoing HRP research</a>
        </p>
        <p>
          Tempus Pro research examines collecting and integrating health data and telemedicine
          capabilities. <a href="https://www.nasa.gov/reference/tempus-pro/">NASA · Tempus Pro</a>
        </p>
        <p>
          Space research can also contribute knowledge about physical inactivity and ageing on
          Earth.{' '}
          <a href="https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp">
            CSA · Science in space
          </a>
        </p>
        <p>
          <a href="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp">
            CSA radiation monitoring background
          </a>{' '}
          · Radiation assessment is outside this prototype.
        </p>
      </section>
      <section className="panel">
        <h2>NASA references</h2>
        <ul className="reference-list">
          <li>
            <a href={nasa.standard}>NASA-STD-3001 · Volume 1, requirement 4003 ↗</a>
            <p>
              {result.reference.label}. {result.reference.note}
            </p>
          </li>
          <li>
            <a href={nasa.measures}>Standard Measures ↗</a>
          </li>
          <li>
            <a href={nasa.risks}>Risks of Human Spaceflight ↗</a>
          </li>
          <li>
            <a href={nasa.risk}>Reduced cardiorespiratory and musculoskeletal fitness ↗</a>
          </li>
          <li>
            <a href={nasa.exercise}>Zero T2 ↗</a>
          </li>
        </ul>
        <p className="subtle">
          External NASA sources require an internet connection. The bundled assessment workflow
          works offline.
        </p>
        {replay && (
          <a href={`#/understand/${replay.assessmentId}`}>Explore the NASA research replay →</a>
        )}
      </section>
      <a href={`#/understand/${result.assessmentId}`}>← Understand this assessment</a>
    </>
  );
}
