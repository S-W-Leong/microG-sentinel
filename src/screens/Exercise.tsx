import { useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowCounterClockwise, ArrowRight, Circle } from '@phosphor-icons/react';
import { createExerciseStore, evaluateWorkspace } from '../exercise/store';
import { parseExerciseCsv, exerciseCsvHeader, type CsvPreview } from '../exercise/csv';
import type { ScenarioVariant } from '../exercise/data/scenarios';
import { buildStageReadings, evidenceLabel } from '../ui/exercisePresentation';
import ExerciseComparison from '../components/exercise/ExerciseComparison';
import ObservationPlan from '../components/exercise/ObservationPlan';
import ExerciseReview from '../components/exercise/ExerciseReview';
import ReadingExplorer from '../components/exercise/ReadingExplorer';
import ObservationChanges from '../components/exercise/ObservationChanges';
import {
  getWalkthroughStep,
  walkthroughSteps,
  type WalkthroughStep,
} from '../ui/exerciseWalkthrough';
import '../walkthrough.css';

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
  const [selectedWorkload, setSelectedWorkload] = useState<number | null>(50);
  const step = getWalkthroughStep(window.location.hash);
  const stepIndex = walkthroughSteps.findIndex((item) => item.id === step);
  const active = w.data.sessions.find((session) => session.id === w.activeSessionId);
  const titles: Record<WalkthroughStep, string> = {
    read: 'What do these readings mean?',
    plan: 'Choose what to do next.',
    compare: 'See what changed.',
    review: 'Keep a copy of the evidence.',
  };
  function navigate(next: WalkthroughStep) {
    window.location.hash = `/exercise/${next}`;
  }
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
  const evidenceDetails = (
    <details className="evidence-details">
      <summary>
        Inspect comparison basis <ArrowRight size={17} aria-hidden="true" />
      </summary>
      <p>
        Only matching test conditions support a comparison. Missing measurements never become zero.
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
  );
  return (
    <div className="step-workspace">
      <div className="demo-topline">
        <span className="instrument-label">EXERCISE WALKTHROUGH</span>
        <span className="simulation-badge">Simulated crew</span>
        <span className="local-status" role="status">
          {w.notice || 'Your demo work stays on this device'}
        </span>
      </div>
      <nav className="step-navigation" aria-label="Walkthrough steps">
        <ol>
          {walkthroughSteps.map((item, index) => (
            <li key={item.id}>
              <a
                href={`#/exercise/${item.id}`}
                aria-current={step === item.id ? 'step' : undefined}
              >
                <span className="step-number">{index + 1}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <section className="step-content" key={step} aria-labelledby="step-title">
        <header className="step-heading">
          <span className="eyebrow">
            STEP {stepIndex + 1} OF {walkthroughSteps.length}
          </span>
          <h1 id="step-title">{titles[step]}</h1>
          {step === 'read' && (
            <p>
              Select a cycling effort to explore one pair of readings. These are example values, not
              your own measurements.
            </p>
          )}
          {step === 'plan' && (
            <p>
              {plan.state === 'planned'
                ? 'Try collecting a synthetic reading from an existing workout. The app will show you the result in the next step.'
                : plan.state === 'review'
                  ? 'This scenario needs a review of the available evidence. Further collection is bypassed.'
                  : plan.state === 'none-needed'
                    ? 'The current evidence needs no extra collection. Continue to review or inspect the comparison.'
                    : 'No matching workout is available. Continue with the evidence you have.'}
            </p>
          )}
          {step === 'compare' && (
            <p>
              See the original and latest evidence side by side, with the same baseline for both.
            </p>
          )}
          {step === 'review' && (
            <p>Prepare a local snapshot, then download it to keep or discuss with a reviewer.</p>
          )}
        </header>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {step === 'read' && (
          <>
            <ReadingExplorer
              rows={rows}
              workload={selectedWorkload}
              onWorkloadChange={setSelectedWorkload}
            />
            <p className="step-hint">
              {rows.some((row) => row.workloadW === selectedWorkload && row.currentBpm === null)
                ? 'You found the missing reading. Continue to try a matching follow-up.'
                : 'Switch efforts to explore the readings, then continue to the follow-up step.'}
            </p>
          </>
        )}
        {step === 'plan' && (
          <ObservationPlan
            workspace={w}
            plan={plan}
            comparison={comparison}
            onAvailability={(id, available) => act(() => s.setAvailability(id, available))}
            onAccept={() => act(() => s.accept(w.revision))}
            onCapture={() => {
              if (act(() => s.capture(w.revision))) navigate('compare');
            }}
            onReview={() => {
              if (act(() => s.requestReview())) navigate('review');
            }}
          />
        )}
        {step === 'compare' && (
          <>
            <ObservationChanges workspace={w} />
            <details className="optional-chart">
              <summary>See these readings on a chart</summary>
              <div className="evidence-heading">
                <h2 className="instrument-label">Heart rate at each cycling effort</h2>
                <div className="plot-legend">
                  <span>
                    <Circle
                      size={12}
                      weight="fill"
                      className="baseline-symbol"
                      aria-hidden="true"
                    />
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
            </details>
            {evidenceDetails}
          </>
        )}
        {step === 'review' && (
          <>
            <ExerciseReview
              workspace={w}
              onPrepare={() => act(() => s.prepare())}
              onDownload={download}
              onResponse={(text) => {
                act(() => s.recordResponse(text));
              }}
            />
            <div className="personal-next">
              <h3>Ready to understand your own values?</h3>
              <p>
                Use two existing VO₂ test reports to compare your baseline with a later assessment.
              </p>
              <a className="button secondary" href="#/fitness/entry">
                Use my own values <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </>
        )}
        <div className="step-footer">
          {stepIndex > 0 ? (
            <a href={`#/exercise/${walkthroughSteps[stepIndex - 1].id}`} className="step-back">
              ← Back
            </a>
          ) : (
            <a className="step-back" href="#/fitness/entry">
              Use my own values
            </a>
          )}
          {step !== 'review' && (
            <a
              className={step === 'plan' ? 'step-back' : 'button'}
              href={`#/exercise/${walkthroughSteps[stepIndex + 1].id}`}
            >
              {step === 'read'
                ? 'Next: try a follow-up'
                : step === 'plan'
                  ? 'View current comparison'
                  : 'Next: save your review'}{' '}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          )}
          {step === 'review' && (
            <button
              className="text-button"
              onClick={() => {
                if (act(() => s.reset())) {
                  setPreview(null);
                  setSelectedWorkload(50);
                  navigate('read');
                }
              }}
            >
              Restart the demo
            </button>
          )}
        </div>
      </section>
      <details className="walkthrough-tools">
        <summary>Demo settings & records</summary>
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
                    navigate('read');
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
                  navigate('read');
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
              Use subject DEMO-CREW and series {w.scenario}. Imports are synthetic demonstration
              data only.
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
                  {preview.acceptedRows.length} accepted rows; {preview.rejectedRows.length}{' '}
                  rejected.
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
                  if (e.target.value && act(() => s.linkObservation(e.target.value)))
                    navigate('compare');
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
      </details>
    </div>
  );
}
