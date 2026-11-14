import { nasaExercise } from '../exercise/data/nasa';
import { compareSession } from '../exercise/comparison';
import { useState } from 'react';
export default function ExerciseResearch() {
  const [id, setId] = useState(nasaExercise.sessions[2].id);
  const result = compareSession(
    nasaExercise,
    id,
    nasaExercise.sessions.slice(0, 2).map((s) => s.id),
    'research-descriptive-v1',
  );
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">NASA BED-REST ANALOG • RESEARCH ONLY</div>
        <h1>Same workload, different response.</h1>
        <p>
          Formal laboratory stages, not routine astronaut workouts. No prospective crew
          recommendation.
        </p>
      </div>
      <section className="panel">
        <label>
          Research occasion
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {nasaExercise.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date}
                {s.isBaseline ? ' · baseline' : ''}
              </option>
            ))}
          </select>
        </label>
        {result.symptoms.map((s) => (
          <p key={s}>{s}</p>
        ))}
        {result.stages.map((s) => (
          <article key={s.targetStageId}>
            <h2>
              {nasaExercise.stages.find((r) => r.id === s.targetStageId)?.context.workloadW} W
            </h2>
            <p>
              Current {s.currentBpm} bpm · baseline {s.baselineRangeBpm?.join('–') ?? 'unavailable'}{' '}
              bpm ({s.baselineSessionIds.length} sessions)
            </p>
            <strong>
              {s.deltaBpm === null
                ? 'Comparison withheld'
                : `${s.deltaBpm >= 0 ? '+' : ''}${s.deltaBpm.toFixed(1)} bpm`}
            </strong>
            <p>{s.limits.join(' ')}</p>
            <details>
              <summary>Source evidence</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(
                  nasaExercise.stages.find((r) => r.id === s.targetStageId)?.sourceRefs,
                  null,
                  2,
                )}
              </pre>
            </details>
          </article>
        ))}
        <p>
          Similar exertion ratings do not establish absence of symptoms. The immediate post-bed-rest
          record documents test termination involving dizziness and breathing.
        </p>
        <a href="#/understand/MR080G-3985-070506-REL">Inspect separately recorded VO₂peak</a>
      </section>
    </>
  );
}
