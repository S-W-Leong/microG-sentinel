import { renderExerciseReviewText } from '../exercise/reviewPacket';
import { useState, useSyncExternalStore } from 'react';
import { createExerciseStore, evaluateWorkspace } from '../exercise/store';
import { parseExerciseCsv, exerciseCsvHeader, type CsvPreview } from '../exercise/csv';
import type { ScenarioVariant } from '../exercise/data/scenarios';
let store: ReturnType<typeof createExerciseStore> | undefined;
function getStore() {
  if (!store) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* Explicit memory-only store. */
    }
    store = createExerciseStore(storage);
  }
  return store;
}
function download(text: string, extension: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: extension === 'json' ? 'application/json' : 'text/plain' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `microg-exercise-review.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Exercise() {
  const s = getStore();
  const w = useSyncExternalStore(s.subscribe, s.getSnapshot);
  const { comparison, plan } = evaluateWorkspace(w);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [response, setResponse] = useState('');
  function act(fn: () => unknown) {
    try {
      fn();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">SIMULATED CREW • CYCLING</div>
        <h1>Your next useful observation.</h1>
        <p>Compare prescribed cycling, resolve evidence gaps and prepare review.</p>
        <p role="status">
          {w.notice || 'Demonstration workspace'} · {w.status}
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      <section className="panel">
        <h2>Next observation</h2>
        <p>{plan.reasons.join(' ')}</p>
        <p data-testid="selected-plan">{plan.selectedIds.join(', ') || 'No collection selected'}</p>
        {plan.selectedIds.length > 0 && (
          <p>
            {plan.totalAdditionalCrewActions} additional demonstration actions · simulated
            completion {plan.completionAt}
          </p>
        )}
        {plan.state === 'planned' && (
          <button className="button" onClick={() => act(() => s.accept(w.revision))}>
            Accept observation plan
          </button>
        )}
        {w.acceptedRevision === w.revision && (
          <button className="button" onClick={() => act(() => s.capture(w.revision))}>
            Generate synthetic observation
          </button>
        )}
        <button onClick={() => act(() => s.requestReview())}>Request review now</button>
        <p className="subtle">
          Observations use an existing prescribed workout. The prototype does not change your
          exercise prescription or diagnose a cause.
        </p>
        {plan.unmetGapIds.length > 0 && (
          <ul>
            {comparison.gaps.map((g) => (
              <li key={g.id}>{g.reason}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <h2>Exercise response</h2>
        <p>
          Frozen baseline: {w.baseline.sessions.length} independent sessions. Observed ranges are
          descriptive, not confidence intervals.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Workload</th>
                <th>Baseline HR</th>
                <th>Current HR</th>
                <th>Difference</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {comparison.stages.map((c) => {
                const stage = w.data.stages.find((s) => s.id === c.targetStageId)!;
                return (
                  <tr key={c.targetStageId}>
                    <td>{stage.context.workloadW} W</td>
                    <td>{c.baselineRangeBpm?.join('–') ?? 'Unavailable'}</td>
                    <td>{c.currentBpm === null ? 'Missing' : `${c.currentBpm} bpm`}</td>
                    <td>
                      {c.deltaBpm === null
                        ? 'Withheld'
                        : `${c.deltaBpm >= 0 ? '+' : ''}${c.deltaBpm.toFixed(1)} bpm`}
                    </td>
                    <td>{c.state}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details>
          <summary>Comparison details and original observations</summary>
          {comparison.stages.map((c) => (
            <div key={c.targetStageId}>
              <h3>{c.targetStageId}</h3>
              <p>{[...c.issues, ...c.limits].join(' ')}</p>
            </div>
          ))}
          <p>Episode history: {w.history.join(', ')}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(w.baseline, null, 2)}</pre>
        </details>
      </section>
      <section className="panel">
        <h2>Review episode</h2>
        <button className="button" onClick={() => act(() => s.prepare())}>
          Prepare review
        </button>
        {w.reviews.length > 0 && (
          <>
            <p>Prepared locally. No transmission or receipt is claimed.</p>
            <p>
              Downloads preserve the last prepared snapshot. After inputs change, prepare a new
              review for current evidence.
            </p>
            <button onClick={() => download(w.reviews[w.reviews.length - 1], 'json')}>
              Download review JSON
            </button>
            <button
              onClick={() =>
                download(renderExerciseReviewText(w.reviews[w.reviews.length - 1]), 'txt')
              }
            >
              Download review text
            </button>
            <label>
              Human review response
              <textarea value={response} onChange={(e) => setResponse(e.target.value)} />
            </label>
            <button
              onClick={() =>
                act(() => {
                  s.recordResponse(response);
                  setResponse('');
                })
              }
            >
              Record human response
            </button>
          </>
        )}
        {w.responses.map((r, i) => (
          <p key={i}>{r}</p>
        ))}
      </section>
      <details className="panel">
        <summary>Demonstration inputs and prescribed schedule</summary>
        <p>Simulated clock: {w.nowISO}. These controls change the planner's inputs.</p>
        <label>
          Scenario
          <select
            aria-label="Scenario"
            value={w.scenario}
            onChange={(e) => act(() => s.selectScenario(e.target.value as ScenarioVariant))}
          >
            {['missing-hr', 'complete', 'mismatch', 'no-opportunity', 'symptoms'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {w.opportunities.map((o) => (
          <label key={o.id}>
            <input
              type="checkbox"
              checked={o.available}
              onChange={(e) => act(() => s.setAvailability(o.id, e.target.checked))}
            />
            Available: {o.id}
            <p>
              {o.scheduledAt} · {o.additionalCrewActions} modelled actions · {o.effortBasis}
            </p>
          </label>
        ))}
        <button onClick={() => act(() => s.reset())}>Reset local demonstration</button>
      </details>
      <details className="panel">
        <summary>Import demonstration observations</summary>
        <p>
          Use subject DEMO-CREW and series {w.scenario}. Imports are synthetic demonstration data
          only.
        </p>
        <button onClick={() => download(exerciseCsvHeader + '\n', 'csv')}>
          Download CSV header
        </button>
        <label>
          Observation CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                f.text()
                  .then((t) => setPreview(parseExerciseCsv(t)))
                  .catch(() => setError('Unable to read file'));
            }}
          />
        </label>
        {preview && (
          <>
            <p>
              {preview.acceptedRows.length} accepted rows; {preview.rejectedRows.length} rejected.
            </p>
            <ul>
              {preview.rejectedRows.map((r, i) => (
                <li key={i}>
                  Record {r.row}: {r.message}
                </li>
              ))}
            </ul>
            <button
              disabled={!preview.canCommit}
              onClick={() =>
                act(() => {
                  s.importPreview(preview);
                  setPreview(null);
                })
              }
            >
              Commit import
            </button>
          </>
        )}
        <label>
          Link imported follow-up
          <select value="" onChange={(e) => act(() => s.linkObservation(e.target.value))}>
            <option value="">Select observation</option>
            {w.data.sessions
              .filter((s) => !s.isBaseline)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
          </select>
        </label>
      </details>
    </>
  );
}
