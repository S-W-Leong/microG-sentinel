import { useState } from 'react';
import type { RiskTabProps } from '../types';
import { createExerciseStore, type ExerciseWorkspace } from '../../exercise/store';
import { getRecords } from '../../ui/dataSource';
import { buildStageReadings } from '../../ui/exercisePresentation';
import { trend } from '../../logic/assess';
import ExerciseComparison from '../../components/exercise/ExerciseComparison';
import ObservationPlan from '../../components/exercise/ObservationPlan';
import ExerciseReview from '../../components/exercise/ExerciseReview';
import TrendChart from '../../components/TrendChart';
import ResearchCardio from './ResearchCardio';
import {
  adaptExercise,
  adaptVo2,
  cardioFlags,
  cardioIdentity,
  cardioStore,
  emptyCardio,
  evaluateCardio,
  saveCardio,
  selectCardioView,
  type CardioInput,
} from './model';
import {
  ContextLink,
  Field,
  Metric,
  NumberField,
  RedFlags,
  Registered,
  TabFrame,
  TextField,
  TriState,
} from './TabUi';
import { display, scopeKey, urgentEvaluation } from './presentation';
import { useTabUpdates } from './useTabUpdates';

function CardioPanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, cardioStore);
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [draft, setDraft] = useState(
    () => cardioStore.current(ctx) ?? emptyCardio(person.exposures.asOf),
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [workspaceJson, setWorkspaceJson] = useState('');
  const input = cardioStore.current(ctx);
  const urgent = Object.values(draft.flags).includes(true);
  const evaluation = urgent
    ? urgentEvaluation(ctx, 'cardio', 'HR change at workload', 'bpm')
    : evaluateCardio(ctx);
  const hidden = evaluation.escalation?.level === 'urgent';
  const exercise =
    input?.workspace && input.stageId ? adaptExercise(input.workspace, input.stageId) : null;
  const vo2 = input?.assessmentId ? adaptVo2(input.assessments, input.assessmentId) : null;
  const set = <K extends keyof CardioInput>(key: K, value: CardioInput[K]) =>
    setDraft((x) => ({ ...x, [key]: value }));
  function act(fn: () => void) {
    try {
      fn();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Entry unavailable');
    }
  }
  function loadWorkspace(candidate: ExerciseWorkspace) {
    const stage = candidate.data?.stages.find((x) => x.sessionId === candidate.activeSessionId);
    if (!stage) throw new Error('Workspace has no active stage');
    const parsed = adaptExercise(candidate, stage.id);
    if (
      cardioIdentity(parsed.session.scope) !== ctx.crewId ||
      parsed.session.scope.source !== person.source
    )
      throw new Error('Register the workspace participant and series first');
    setDraft((x) => ({ ...x, workspace: candidate, stageId: stage.id, exerciseObservedAt: null }));
    setNotice('Workspace loaded · save to select');
  }
  function loadVo2() {
    const records = getRecords().filter(
      (r) =>
        cardioIdentity({ ...r, seriesId: r.comparisonGroupId ?? 'default' }) === ctx.crewId &&
        r.source === person.source,
    );
    const latest = [...records]
      .filter((x) => !x.isBaseline && !x.duplicateOf && x.metric === 'VO2peak')
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      .pop();
    if (!latest) throw new Error('No VO2peak report in this registered series');
    setDraft((x) => ({ ...x, assessments: records, assessmentId: latest.id, vo2ObservedAt: null }));
    setNotice('Reports loaded · save to select');
  }
  function legacyAction(action: (store: ReturnType<typeof createExerciseStore>) => void) {
    act(() => {
      if (!draft.workspace) throw new Error('Load an exercise workspace first');
      let memory = JSON.stringify(draft.workspace);
      const store = createExerciseStore({
        getItem: () => memory,
        setItem: (_key, value) => {
          memory = value;
        },
        removeItem: () => {},
      });
      action(store);
      const next = store.getSnapshot();
      const stage =
        next.data.stages.find(
          (x) =>
            x.sessionId === next.activeSessionId &&
            x.context.workloadW === exercise?.signals.workloadW,
        ) ?? next.data.stages.find((x) => x.sessionId === next.activeSessionId);
      setDraft((x) => ({
        ...x,
        workspace: next,
        stageId: stage?.id ?? null,
        exerciseObservedAt: null,
      }));
      setNotice('Workspace updated · save to select');
    });
  }
  const preview =
    draft.workspace && draft.stageId ? adaptExercise(draft.workspace, draft.stageId) : null;
  return (
    <TabFrame
      ctx={ctx}
      title="Cardiovascular"
      evaluation={evaluation}
      raw={{ selected: input, draft, history: cardioStore.history(ctx) }}
    >
      <RedFlags questions={cardioFlags} flags={draft.flags} onChange={(f) => set('flags', f)} />
      {!hidden && (
        <>
          <dl>
            <Metric
              label="HR change"
              value={display(exercise?.signals.hrDeltaBpmAtWorkload, 'bpm', true)}
            />
            <Metric label="VO2peak retained" value={display(vo2?.value, '%')} />
            <Metric label="Borg effort" value={display(exercise?.signals.borgRpe, '/20')} />
            <Metric label="Resting HR" value={display(input?.restingHrBpm, 'bpm')} />
            <Metric
              label="Missing readings"
              value={display(exercise?.signals.missingReadingsCount)}
            />
          </dl>
          {exercise && input?.workspace && (
            <section>
              <h2>Exercise comparison</h2>
              <p>
                {exercise.session.date ?? 'Date not recorded'} · {exercise.session.scope.subjectId}{' '}
                · {display(exercise.signals.workloadW, 'W')}.
              </p>
              <ExerciseComparison
                rows={buildStageReadings(input.workspace.data, exercise.comparison)}
              />
              <details>
                <summary>Recorded context</summary>
                <pre>
                  {JSON.stringify(
                    {
                      stage: input.workspace.data.stages.find((x) => x.id === input.stageId),
                      issues: exercise.stage.issues,
                      limits: exercise.stage.limits,
                      gaps: exercise.comparison.gaps,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </section>
          )}
          {vo2 && input && (
            <section>
              <h2>VO2peak reports</h2>
              <TrendChart
                research={person.source === 'nasa-research-replay'}
                points={trend(input.assessments, vo2.record.subjectId).filter((point) => {
                  const r = input.assessments.find((x) => x.id === point.assessmentId);
                  return (
                    r?.metric === vo2.record.metric &&
                    r?.unit === vo2.record.unit &&
                    r?.method === vo2.record.method
                  );
                })}
              />
              <p>
                {vo2.record.date} · {vo2.record.unit} · {vo2.record.method}.
              </p>
              <details>
                <summary>Comparison evidence</summary>
                <p>{vo2.result.reference.note}</p>
                {vo2.result.issues.map((issue, i) => (
                  <p key={i}>{issue.message}</p>
                ))}
                <pre>{JSON.stringify(vo2.result.calculation?.baseline ?? null, null, 2)}</pre>
              </details>
            </section>
          )}
          {!exercise && <p>Exercise comparison unavailable · select a registered workspace.</p>}
          {!vo2 && <p>VO2peak comparison unavailable · select an existing report.</p>}
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(() => {
            saveCardio(ctx, draft);
            setNotice('Saved for this session');
          });
        }}
      >
        <h2>Recorded observations</h2>
        <div className="risk-grid">
          <Field label="Headline">
            <select
              value={draft.view}
              onChange={(e) => {
                const view = e.target.value as CardioInput['view'];
                selectCardioView(ctx, view);
                set('view', view);
              }}
            >
              <option value="exercise">Exercise</option>
              <option value="vo2">VO2 Fitness</option>
            </select>
          </Field>
          <TextField
            label="Observation UTC"
            value={draft.recordedAt}
            onChange={(s) => set('recordedAt', s ?? '')}
          />
          <NumberField
            label="Resting HR bpm"
            value={draft.restingHrBpm}
            min={0.001}
            max={300}
            onChange={(n) => set('restingHrBpm', n)}
          />
          <Field label="Resting posture">
            <select
              value={draft.restingPosture ?? ''}
              onChange={(e) =>
                set(
                  'restingPosture',
                  e.target.value ? (e.target.value as CardioInput['restingPosture']) : null,
                )
              }
            >
              <option value="">Not recorded</option>
              <option value="seated">Seated</option>
              <option value="supine">Supine</option>
            </select>
          </Field>
        </div>
        <details>
          <summary>Exercise and reports</summary>
          <p>Load the existing workspace for this participant and comparison series.</p>
          <Field label="Workspace JSON">
            <textarea
              rows={4}
              value={workspaceJson}
              onChange={(e) => setWorkspaceJson(e.target.value)}
            />
          </Field>
          <div className="risk-actions">
            <button
              type="button"
              onClick={() =>
                act(() => loadWorkspace(JSON.parse(workspaceJson) as ExerciseWorkspace))
              }
            >
              Preview workspace
            </button>
            <button
              type="button"
              onClick={() =>
                act(() => {
                  const raw = window.localStorage.getItem('microg.exercise.workspace.v1');
                  if (!raw) throw new Error('No saved exercise workspace');
                  loadWorkspace(JSON.parse(raw));
                })
              }
            >
              Load workspace
            </button>
            <button type="button" onClick={() => act(loadVo2)}>
              Load VO2peak
            </button>
          </div>
          {draft.workspace && (
            <Field label="Selected workload">
              <select
                value={draft.stageId ?? ''}
                onChange={(e) => set('stageId', e.target.value || null)}
              >
                {draft.workspace.data.stages
                  .filter((x) => x.sessionId === draft.workspace!.activeSessionId)
                  .map((x) => (
                    <option value={x.id} key={x.id}>
                      {display(x.context.workloadW, 'W')}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <TextField
            label="Exercise observed UTC"
            value={draft.exerciseObservedAt}
            onChange={(s) => set('exerciseObservedAt', s)}
          />
          <TextField
            label="VO2 observed UTC"
            value={draft.vo2ObservedAt}
            onChange={(s) => set('vo2ObservedAt', s)}
          />
          <p>Leave undocumented times blank; date-only records never enter timed signals.</p>
        </details>
        <details>
          <summary>Exercise load context</summary>
          <div className="risk-grid">
            <NumberField
              label="Completed minutes"
              value={draft.completedMinutes}
              min={0}
              max={1440}
              onChange={(n) => set('completedMinutes', n)}
            />
            <NumberField
              label="Planned minutes"
              value={draft.plannedMinutes}
              min={0.001}
              max={1440}
              onChange={(n) => set('plannedMinutes', n)}
            />
          </div>
          <TriState
            label="24h log complete"
            value={draft.exerciseWindowComplete}
            onChange={(b) => set('exerciseWindowComplete', b === true)}
          />
        </details>
        <button type="submit" className="risk-primary">
          Save observation
        </button>
      </form>
      {!hidden && preview && draft.workspace && (
        <details>
          <summary>Observation planner</summary>
          <p>Workspace preview · save changes to update the selected observation.</p>
          <ObservationPlan
            workspace={draft.workspace}
            comparison={preview.comparison}
            plan={preview.plan}
            onAvailability={(id, available) =>
              legacyAction((s) => s.setAvailability(id, available))
            }
            onAccept={() => legacyAction((s) => s.accept(s.getSnapshot().revision))}
            onCapture={() => legacyAction((s) => s.capture(s.getSnapshot().revision))}
            onReview={() => legacyAction((s) => s.requestReview())}
          />
          <ExerciseReview
            workspace={draft.workspace}
            onPrepare={() =>
              legacyAction((s) => {
                s.prepare();
              })
            }
            onResponse={(note) => legacyAction((s) => s.recordResponse(note))}
            onDownload={(text, extension) => {
              const url = URL.createObjectURL(
                new Blob([text], {
                  type: extension === 'json' ? 'application/json' : 'text/plain',
                }),
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = `microg-exercise-review.${extension}`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          />
        </details>
      )}
      {error && (
        <p className="risk-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <details>
        <summary>Linked context</summary>
        <p>Sleep debt: {display(person.exposures.sleepDebtHours, 'h')}.</p>
        <p>Food energy: {display(person.exposures.energyPctOfNeed, '% of need')}.</p>
        <p>Resistance load: {display(person.exposures.resistanceLoadPct, '% of plan')}.</p>
        <p>Context never adjusts recorded HR or VO2peak.</p>
      </details>
      <div className="risk-links">
        <ContextLink ctx={ctx} risk="sleep" at={input?.recordedAt}>
          Sleep
        </ContextLink>
        <ContextLink ctx={ctx} risk="food" at={input?.recordedAt}>
          Food
        </ContextLink>
        <ContextLink ctx={ctx} risk="balance" at={input?.recordedAt}>
          Balance
        </ContextLink>
      </div>
      <details>
        <summary>Existing tools</summary>
        <p>Session-local wrapper entries leave the exercise archive intact.</p>
        <a href="#/exercise">Exercise workspace</a>
        <p>
          <a href="#/fitness/entry">Enter VO2peak report</a>
        </p>
        <p>
          <a href="#/exercise-research">NASA research replay</a>
        </p>
        <p>
          <a href="https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS">
            NASA MR080G reference
          </a>{' '}
          · curated bed-rest records retain research identity and source notes.
        </p>
      </details>
    </TabFrame>
  );
}
export default function CardioTab(ctx: RiskTabProps) {
  const [mode, setMode] = useState<'crew' | 'research'>('crew');
  return (
    <Registered {...ctx}>
      <section className="risk-tab cardio-source" aria-label="Cardio data source">
        <h2>Choose Cardio data</h2>
        <div className="risk-actions">
          <button type="button" aria-pressed={mode === 'crew'} onClick={() => setMode('crew')}>
            Crew observations
          </button>
          <button
            type="button"
            aria-pressed={mode === 'research'}
            onClick={() => setMode('research')}
          >
            NASA research
          </button>
        </div>
        <p>
          {mode === 'crew'
            ? `${ctx.crewId} · try NASA research for recorded before/after comparisons.`
            : 'MR080G · C3D-3985 · real bed-rest measurements.'}
        </p>
      </section>
      <div hidden={mode !== 'crew'}>
        <CardioPanel key={scopeKey(ctx)} {...ctx} />
      </div>
      {mode === 'research' && <ResearchCardio />}
    </Registered>
  );
}
