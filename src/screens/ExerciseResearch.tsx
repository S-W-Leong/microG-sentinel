import { nasaExercise } from '../exercise/data/nasa';
import { compareSession } from '../exercise/comparison';
import { useState } from 'react';
import { buildStageReadings } from '../ui/exercisePresentation';
import ExerciseComparison from '../components/exercise/ExerciseComparison';
import { Circle, ArrowUpRight, Database } from '@phosphor-icons/react';
export default function ExerciseResearch() {
  const [id, setId] = useState(nasaExercise.sessions[2].id);
  const result = compareSession(
    nasaExercise,
    id,
    nasaExercise.sessions.slice(0, 2).map((s) => s.id),
    'research-descriptive-v1',
  );
  const rows = buildStageReadings(nasaExercise, result);
  const occasions = [
    'Pre-bed-rest test 1',
    'Pre-bed-rest test 2',
    'Immediately after bed rest',
    'Recovery assessment',
  ];
  return (
    <>
      <div className="page-heading">
        <h1>Same workload, different response.</h1>
        <p>
          Formal laboratory stages, not routine astronaut workouts. No prospective crew
          recommendation.
        </p>
      </div>
      <section className="research-controls">
        <label>
          Research occasion
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {nasaExercise.sessions.map((s, i) => (
              <option key={s.id} value={s.id}>
                {occasions[i]} · {s.date}
              </option>
            ))}
          </select>
        </label>
        <span className="subtle">
          <Database size={16} aria-hidden="true" />{' '}
          <span className="record-id">MR080G / C3D-3985</span> · Four recorded occasions
        </span>
      </section>
      {result.symptoms.map((s) => (
        <p className="notice" key={s}>
          {s}
        </p>
      ))}
      <section className="research-evidence" aria-label="NASA exercise stage evidence">
        <div className="evidence-heading">
          <h2 className="instrument-label">Recorded response at fixed workload</h2>
          <div className="plot-legend">
            <span>
              <Circle size={12} weight="regular" className="baseline-symbol" aria-hidden="true" />
              Pre-bed-rest baseline
            </span>
            <span>
              <Circle size={12} weight="fill" aria-hidden="true" />
              Selected occasion
            </span>
          </div>
        </div>
        <ExerciseComparison rows={rows} showValues={false} />
      </section>
      <section className="research-readings" aria-label="Research comparison details">
        <table className="research-table">
          <caption className="sr-only">
            Recorded heart rate compared with pre-bed-rest baseline
          </caption>
          <thead>
            <tr>
              <th scope="col">Workload</th>
              <th scope="col">Recorded</th>
              <th scope="col">Baseline range (n)</th>
              <th scope="col">Difference</th>
              <th scope="col">Source evidence</th>
            </tr>
          </thead>
          <tbody>
            {result.stages.map((s) => (
              <tr key={s.targetStageId}>
                <th scope="row">
                  {nasaExercise.stages.find((r) => r.id === s.targetStageId)?.context.workloadW} W
                </th>
                <td data-label="Recorded">
                  <span className="measurement">
                    {s.currentBpm === null ? 'Missing' : `${s.currentBpm} bpm`}
                  </span>
                </td>
                <td data-label="Baseline range (n)">
                  <span className="measurement">
                    {s.baselineRangeBpm?.join('\u2013') ?? 'unavailable'} bpm
                  </span>{' '}
                  ({s.baselineSessionIds.length} sessions)
                </td>
                <td data-label="Difference">
                  <strong className="measurement">
                    {s.deltaBpm === null
                      ? 'Comparison withheld'
                      : `${s.deltaBpm >= 0 ? '+' : ''}${s.deltaBpm.toFixed(1)} bpm`}
                  </strong>
                </td>
                <td className="research-source">
                  <details>
                    <summary>Source evidence</summary>
                    <pre>
                      {JSON.stringify(
                        nasaExercise.stages.find((r) => r.id === s.targetStageId)?.sourceRefs,
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                  {s.limits
                    .filter(
                      (limit) => !result.stages.every((stage) => stage.limits.includes(limit)),
                    )
                    .map((limit) => (
                      <p key={limit}>{limit}</p>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="research-caveat">
          {[...new Set(result.stages[0]?.limits ?? [])]
            .filter((limit) => result.stages.every((stage) => stage.limits.includes(limit)))
            .join(' ')}
        </p>
      </section>
      <section className="panel research-context">
        <h2 className="instrument-label">What this evidence can establish</h2>
        <p>
          Similar exertion ratings do not establish absence of symptoms. The immediate post-bed-rest
          record documents test termination involving dizziness and breathing.
        </p>
        <p>
          These are formal laboratory stages from a bed-rest analog. The comparison describes the
          bundled records; it does not validate prospective crew monitoring or diagnose the cause of
          a change.
        </p>
        <div className="actions">
          <a href="#/understand/MR080G-3985-070506-REL">
            Inspect separately recorded VO₂peak <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <a href="https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS">
            NASA MR080G dataset <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  );
}
