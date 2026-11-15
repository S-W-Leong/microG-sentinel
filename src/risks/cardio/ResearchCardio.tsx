import { useState } from 'react';
import type { Unit } from '../../types';
import { nasaExercise } from '../../exercise/data/nasa';
import { buildStageReadings } from '../../ui/exercisePresentation';
import ExerciseComparison from '../../components/exercise/ExerciseComparison';
import TrendChart from '../../components/TrendChart';
import { DownloadButton, Field, Metric } from './TabUi';
import { display } from './presentation';
import { compareResearch, mr080gUrl, researchOccasions } from './research';

export default function ResearchCardio() {
  const [sessionId, setSessionId] = useState(researchOccasions[0].id);
  const [workload, setWorkload] = useState(100);
  const [unit, setUnit] = useState<Unit>('mL/kg/min');
  const result = compareResearch(sessionId, workload, unit);
  const { session, selected, stage, vo2 } = result;
  return (
    <section className="risk-tab cardio-research" aria-label="NASA cardio research replay">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">NASA MR080G · offline records</span>
          <h1>Cardiovascular research</h1>
        </div>
        <span className="risk-id">{session.scope.subjectId}</span>
      </header>
      <div className="risk-badges">
        <strong>NASA research replay</strong>
        <span>Research participant</span>
      </div>
      <p>Read-only bed-rest research · separate from selected crew.</p>
      <div className="risk-grid">
        <Field label="Research test">
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {researchOccasions.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i === 0 ? 'After bed rest' : 'Recovery'} · {s.date}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Workload">
          <select value={workload} onChange={(e) => setWorkload(Number(e.target.value))}>
            {nasaExercise.stages
              .filter((s) => s.sessionId === session.id)
              .map((s) => (
                <option key={s.id} value={s.context.workloadW!}>
                  {s.context.workloadW} W
                </option>
              ))}
          </select>
        </Field>
        <Field label="VO2peak units">
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            <option value="mL/kg/min">mL/kg/min</option>
            <option value="L/min">L/min</option>
          </select>
        </Field>
      </div>
      <div className="risk-result" aria-live="polite">
        <span>{workload} W · HR vs baseline</span>
        <strong>{display(selected.deltaBpm, 'bpm', true)}</strong>
        <span>{session.date} · descriptive research comparison</span>
      </div>
      <dl>
        <Metric label="Recorded HR" value={display(stage.hrBpm, 'bpm')} />
        <Metric label="VO2peak retained" value={display(vo2?.value, '%', false, 1)} />
        <Metric label="Borg effort" value={display(stage.rpe, '/20')} />
        <Metric label="Resting HR" value="Not recorded" />
        <Metric label="Missing readings" value={display(result.missingReadings)} />
      </dl>
      {session.symptoms.length > 0 && (
        <aside className="risk-alert" aria-label="Historical test context">
          <strong>Recorded test stop</strong>
          {session.symptoms.map((s) => (
            <p key={s}>{s}.</p>
          ))}
          <p>Historical research observation · not a current crew report.</p>
        </aside>
      )}
      <section aria-label="NASA workload comparison">
        <h2>Same workload comparison</h2>
        <p>○ Baseline mean and range · ● selected test.</p>
        <ExerciseComparison rows={buildStageReadings(nasaExercise, result.comparison)} />
        <p>
          {display(selected.currentBpm, 'bpm')} recorded ·{' '}
          {display(selected.baselineMeanBpm, 'bpm')} baseline mean.
        </p>
      </section>
      <section aria-label="NASA VO2peak trend">
        <h2>VO2peak over time</h2>
        <TrendChart research points={result.points} />
        <p>
          {display(vo2?.record.value, unit)} recorded · {display(vo2?.value, '%', false, 1)}{' '}
          retained.
        </p>
        <ul>
          {result.points.map((p) => (
            <li key={p.assessmentId}>
              <time>{p.date}</time> · {display(p.retainedPct, '%')}
              {p.isBaseline ? ' · Baseline' : ''}
            </li>
          ))}
        </ul>
      </section>
      <details>
        <summary>Baseline and sources</summary>
        <p>Two pre-bed-rest tests are averaged as a demo assumption.</p>
        <ul>
          {result.baselines.map((b) => (
            <li key={b.id}>
              <time>{b.date}</time> ·{' '}
              {display(
                result.baselineStages.find(
                  (s) => s.sessionId === b.id && s.context.workloadW === workload,
                )?.hrBpm,
                'bpm',
              )}{' '}
              at {workload} W
            </li>
          ))}
        </ul>
        <p>Exercise stages and peak reports are separate records with unknown observation times.</p>
        <p>Device, posture and named exercise protocol remain unknown.</p>
        {result.limits.map((limit) => (
          <p key={limit}>{limit}</p>
        ))}
        <h3>Stage provenance</h3>
        <pre>{JSON.stringify([...session.sourceRefs, ...stage.sourceRefs], null, 2)}</pre>
        <h3>VO2peak provenance</h3>
        <pre>{JSON.stringify(vo2?.record.sourceNotes ?? [], null, 2)}</pre>
        <h3>Calculation evidence</h3>
        <pre>{JSON.stringify({ stage: selected, vo2: vo2?.result.calculation }, null, 2)}</pre>
        <a href={mr080gUrl}>NASA MR080G dataset</a>
      </details>
      <DownloadButton value={result} name={`microg-cardio-${session.id}-${workload}W`} />
      <p>Descriptive research comparison · no prospective crew recommendation.</p>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
