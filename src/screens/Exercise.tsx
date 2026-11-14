import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  Circle,
  RadioButton,
  Flask,
} from '@phosphor-icons/react';
import { createExerciseStore, evaluateWorkspace } from '../exercise/store';
import { parseExerciseCsv, exerciseCsvHeader, type CsvPreview } from '../exercise/csv';
import type { ScenarioVariant } from '../exercise/data/scenarios';
import { buildStageReadings, evidenceLabel, getEpisodeProgress } from '../ui/exercisePresentation';
import ExerciseComparison from '../components/exercise/ExerciseComparison';
import ObservationPlan from '../components/exercise/ObservationPlan';
import ExerciseReview from '../components/exercise/ExerciseReview';

let store: ReturnType<typeof createExerciseStore> | undefined;
function getStore() {
  if (!store) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* Keep the memory-only fallback. */
    }
    store = createExerciseStore(storage);
  }
  return store;
}
function download(text: string, extension: string) {
  const mime =
    extension === 'json' ? 'application/json' : extension === 'csv' ? 'text/csv' : 'text/plain';
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `microg-exercise-review.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const scenarios: { value: ScenarioVariant; label: string }[] = [
  { value: 'missing-hr', label: 'Missing heart-rate observation' },
  { value: 'complete', label: 'Complete evidence' },
  { value: 'mismatch', label: 'Incompatible protocol' },
  { value: 'no-opportunity', label: 'No available opportunity' },
  { value: 'symptoms', label: 'Reported symptoms' },
];

export default function Exercise() {
  const s = getStore();
  const w = useSyncExternalStore(s.subscribe, s.getSnapshot);
  const { comparison, plan } = useMemo(() => evaluateWorkspace(w), [w]);
  const rows = useMemo(() => buildStageReadings(w.data, comparison), [w.data, comparison]);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const active = w.data.sessions.find((session) => session.id === w.activeSessionId);
  const missing = rows.filter((r) => r.currentBpm === null);
  const collected = w.history.length > 1;
  const heading =
    plan.state === 'review'
      ? 'Review takes priority.'
      : rows.some((r) => r.state === 'incompatible')
        ? 'The comparison needs review.'
        : missing.length === 1
          ? 'One observation is missing.'
          : missing.length > 1
            ? `${missing.length} observations are missing.`
            : collected
              ? 'A new observation. A clearer picture.'
              : 'Your exercise response, in context.';
  const progress = getEpisodeProgress(w);
  function act(fn: () => unknown) {
    try {
      fn();
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
      return false;
    }
  }
  function prepare(scroll: boolean) {
    if (act(() => s.prepare()) && scroll)
      requestAnimationFrame(() => {
        const review = document.getElementById('exercise-review');
        review?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
          block: 'start',
        });
        review?.querySelector('h2')?.focus();
      });
  }
  return (
    <>
      <div className="episode-meta">
        <span>
          Cycling: <span className="record-id">{comparison.scope.subjectId}</span>
        </span>
        <time dateTime={w.nowISO}>
          {new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(w.nowISO))}
        </time>
        <span className="simulation-badge">
          <Flask size={16} aria-hidden="true" /> Simulated crew
        </span>
        <span className="local-status" role="status">
          {w.notice || (w.revision > 0 ? 'Restored local episode' : '')}
        </span>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="exercise-grid">
        <div className="episode-heading">
          <h1>{heading}</h1>
          <p>
            {plan.state === 'review'
              ? 'Review the available evidence before considering any further collection.'
              : missing.length
                ? `The heart-rate observation at ${missing.map((r) => `${r.workloadW} W`).join(', ')} is missing from the latest cycling session.`
                : 'Compare this observation with your frozen baseline, then prepare the evidence for review.'}
          </p>
        </div>
        <ObservationPlan
          workspace={w}
          plan={plan}
          comparison={comparison}
          onAvailability={(id, available) => act(() => s.setAvailability(id, available))}
          onAccept={() => act(() => s.accept(w.revision))}
          onCapture={() => act(() => s.capture(w.revision))}
          onReview={() => {
            if (act(() => s.requestReview())) prepare(true);
          }}
        />
        <section className="exercise-evidence" aria-label="Exercise response">
          <div className="evidence-heading">
            <h2 className="instrument-label">Evidence: heart rate during prescribed cycling</h2>
            <div className="plot-legend">
              <span>
                <Circle size={12} weight="regular" className="baseline-symbol" aria-hidden="true" />
                Baseline
              </span>
              <span>
                <Circle size={12} weight="fill" aria-hidden="true" />
                Latest session
              </span>
            </div>
          </div>
          <p className="baseline-caption">
            Frozen baseline: {w.baseline.sessions.length} independent sessions.{' '}
            <span>Observed range, not a clinical threshold.</span>
          </p>
          <ExerciseComparison rows={rows} />
          <details className="evidence-details">
            <summary>
              Inspect comparison basis <ArrowRight size={17} aria-hidden="true" />
            </summary>
            <p>
              Baseline values are recorded observations. A missing current value has no difference
              or plotted point. Compatibility is checked separately from the size of a measured
              change.
            </p>
            {rows.map((r) => (
              <div className="basis-row" key={r.id}>
                <h3>
                  {r.workloadW ?? 'Unknown'} W <span>{evidenceLabel[r.state]}</span>
                </h3>
                <p>
                  {r.issues.length
                    ? r.issues.join('; ')
                    : 'Matching participant, series, device, protocol, posture, stage order, duration and usable signal assertions.'}
                </p>
                <p className="subtle">{r.limits.join(' ')}</p>
              </div>
            ))}
            <details>
              <summary>Original observations and frozen baseline</summary>
              <p>
                Active observation: {w.activeSessionId} · {active?.date ?? 'Date unavailable'}
              </p>
              <p>Baseline IDs: {w.baseline.sessions.map((session) => session.id).join(', ')}</p>
              <pre>{JSON.stringify({ baseline: w.baseline, observations: w.data }, null, 2)}</pre>
            </details>
          </details>
        </section>
      </div>
      <section className="episode-progress" aria-label="Episode progress">
        <h2 className="instrument-label">Episode history</h2>
        <ol>
          {['Gap identified', 'Plan observation', 'Collect', 'Prepare review'].map((label, i) => (
            <li
              key={label}
              className={`is-${progress[i]}`}
              aria-current={progress[i] === 'current' ? 'step' : undefined}
            >
              {progress[i] === 'complete' ? (
                <CheckCircle size={24} />
              ) : progress[i] === 'current' ? (
                <RadioButton size={27} />
              ) : (
                <Circle size={24} aria-hidden="true" />
              )}
              <span>
                {label}
                {progress[i] === 'skipped' && <small> · skipped</small>}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className="exercise-tools">
        <details className="episode-records">
          <summary>
            Observation history{' '}
            <span>
              {w.history.length} linked {w.history.length === 1 ? 'session' : 'sessions'}
            </span>
          </summary>
          <ol className="history-list">
            {w.history.map((id, i) => {
              const session = w.data.sessions.find((item) => item.id === id);
              return (
                <li key={`${id}-${i}`}>
                  <span className="instrument-label">
                    {i === 0 ? 'Original observation' : 'Linked follow-up'}
                  </span>
                  <strong>{session?.date ?? 'Date unavailable'}</strong>
                  <span>{id}</span>
                  {id === w.activeSessionId && (
                    <span className="simulation-badge">Current comparison</span>
                  )}
                  <p>
                    {w.data.stages
                      .filter((r) => r.sessionId === id)
                      .map(
                        (r) =>
                          `${r.context.workloadW} W: ${r.hrBpm === null ? 'Missing' : `${r.hrBpm} bpm`}`,
                      )
                      .join(' · ')}
                  </p>
                </li>
              );
            })}
          </ol>
        </details>
        <details className="demo-controls">
          <summary>Demonstration inputs and prescribed schedule</summary>
          <div className="demo-control-row">
            <label>
              Scenario
              <select
                aria-label="Scenario"
                value={w.scenario}
                onChange={(e) => {
                  act(() => s.selectScenario(e.target.value as ScenarioVariant));
                  setPreview(null);
                }}
              >
                {scenarios.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                act(() => s.reset());
                setPreview(null);
              }}
            >
              <ArrowCounterClockwise size={17} aria-hidden="true" />
              Reset local demonstration
            </button>
          </div>
          <p className="subtle">
            Simulated clock: {w.nowISO}. Availability switches above change the actual planner
            inputs. Added actions are modelled counts, not measured crew time.
          </p>
        </details>
        <details className="import-controls">
          <summary>Import demonstration observations</summary>
          <p>
            Use subject DEMO-CREW and series {w.scenario}. Imports are synthetic demonstration data
            only.
          </p>
          <button onClick={() => download(exerciseCsvHeader + '\n', 'csv')}>
            Download CSV header
          </button>
          <label className="field">
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
            <div className="import-preview">
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
                onClick={() => {
                  if (act(() => s.importPreview(preview))) setPreview(null);
                }}
              >
                Commit import
              </button>
            </div>
          )}
          <label className="field">
            Link imported follow-up
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) act(() => s.linkObservation(e.target.value));
              }}
            >
              <option value="">Select observation</option>
              {w.data.sessions
                .filter((item) => !item.isBaseline)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}
                  </option>
                ))}
            </select>
          </label>
        </details>
      </div>
      <ExerciseReview
        workspace={w}
        onPrepare={() => prepare(false)}
        onDownload={download}
        onResponse={(text) => {
          act(() => s.recordResponse(text));
        }}
      />
    </>
  );
}
