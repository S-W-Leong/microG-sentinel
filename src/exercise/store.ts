import { createCrewScenario, createDemoCapture, type ScenarioVariant } from './data/scenarios';
import { compareSession } from './comparison';
import { planObservations } from './planner';
import { validateExerciseDataset } from './validation';
import type { ExerciseDataset, ObservationOpportunity } from './types';
import type { CsvPreview } from './csv';
const key = 'microg.exercise.workspace.v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type ExerciseWorkspace = {
  schemaVersion: 1;
  archivedEpisodes: readonly string[];
  revision: number;
  scenario: ScenarioVariant;
  data: ExerciseDataset;
  baseline: ExerciseDataset;
  activeSessionId: string;
  history: readonly string[];
  opportunities: readonly ObservationOpportunity[];
  nowISO: string;
  reviewRequested: boolean;
  status: string;
  acceptedRevision: number | null;
  reviews: readonly string[];
  responses: readonly string[];
  notice: string;
};
function initial(variant: ScenarioVariant): ExerciseWorkspace {
  const s = createCrewScenario(variant);
  return {
    schemaVersion: 1,
    archivedEpisodes: [],
    revision: 0,
    scenario: variant,
    data: s.dataset,
    baseline: {
      sessions: s.dataset.sessions.filter((x) => x.isBaseline),
      stages: s.dataset.stages.filter((x) => s.baselineSessionIds.includes(x.sessionId)),
    },
    activeSessionId: s.targetSessionId,
    history: [s.targetSessionId],
    opportunities: s.opportunities,
    nowISO: s.nowISO,
    reviewRequested: false,
    status: 'observed',
    acceptedRevision: null,
    reviews: [],
    responses: [],
    notice: '',
  };
}
export function evaluateWorkspace(s: ExerciseWorkspace) {
  const data = {
    sessions: [
      ...s.baseline.sessions,
      ...s.data.sessions.filter((x) => !s.baseline.sessions.some((b) => b.id === x.id)),
    ],
    stages: [
      ...s.baseline.stages,
      ...s.data.stages.filter((x) => !s.baseline.stages.some((b) => b.id === x.id)),
    ],
  };
  const comparison = compareSession(
    data,
    s.activeSessionId,
    s.baseline.sessions.map((b) => b.id),
    'crew-demo-v1',
  );
  return {
    comparison,
    plan: planObservations({
      scope: comparison.scope,
      nowISO: s.nowISO,
      policy: 'crew-demo-v1',
      gaps: comparison.gaps,
      opportunities: s.opportunities,
      symptomsReported: comparison.symptoms.length > 0,
      reviewRequested: s.reviewRequested,
    }),
  };
}
export function createExerciseStore(storage: StorageLike | null) {
  let state = initial('missing-hr');
  let persisted: string | null = null;
  let blocked = false;
  const listeners = new Set<() => void>();
  try {
    persisted = storage?.getItem(key) ?? null;
    if (persisted) {
      const candidate = JSON.parse(persisted);
      if (
        candidate.schemaVersion !== 1 ||
        !Array.isArray(candidate.archivedEpisodes) ||
        !candidate.archivedEpisodes.every(
          (raw: unknown) =>
            typeof raw === 'string' &&
            (() => {
              const a = JSON.parse(raw);
              return (
                a.schemaVersion === 1 &&
                validateExerciseDataset(a.data).ok &&
                validateExerciseDataset(a.baseline).ok
              );
            })(),
        ) ||
        typeof candidate.notice !== 'string' ||
        typeof candidate.status !== 'string' ||
        typeof candidate.reviewRequested !== 'boolean' ||
        !['missing-hr', 'complete', 'mismatch', 'no-opportunity', 'symptoms'].includes(
          candidate.scenario,
        ) ||
        !Number.isInteger(candidate.revision) ||
        !validateExerciseDataset(candidate.data).ok ||
        !validateExerciseDataset(candidate.baseline).ok ||
        !Array.isArray(candidate.history) ||
        !Array.isArray(candidate.reviews) ||
        !Array.isArray(candidate.responses) ||
        !Array.isArray(candidate.opportunities) ||
        candidate.opportunities.length > 16 ||
        !Number.isFinite(Date.parse(candidate.nowISO)) ||
        !candidate.data.sessions.some((s: { id: string }) => s.id === candidate.activeSessionId)
      )
        throw new Error('Invalid stored workspace');
      evaluateWorkspace(candidate);
      state = candidate;
    }
  } catch {
    blocked = true;
    state = {
      ...state,
      notice:
        'Storage recovery required. Existing payload preserved; new work is memory-only until reset.',
    };
  }
  function save(next: ExerciseWorkspace) {
    state = { ...next, revision: state.revision + 1 };
    try {
      if (blocked || !storage) throw new Error('Memory-only');
      if (storage.getItem(key) !== persisted) {
        blocked = true;
        throw new Error('Another tab changed stored work; export this tab and reload');
      }
      const payload = JSON.stringify({ ...state, notice: '' });
      storage.setItem(key, payload);
      persisted = payload;
      state = { ...state, notice: 'Saved locally' };
    } catch (e) {
      state = {
        ...state,
        notice: blocked
          ? 'Storage recovery required. Export memory work before reload/reset.'
          : `Memory-only: ${e instanceof Error ? e.message : 'Save failed'}`,
      };
    }
    listeners.forEach((fn) => fn());
  }
  const check = (revision: number) => {
    if (revision !== state.revision)
      throw new Error('This plan is stale; review the current recommendation');
  };
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    selectScenario: (v: ScenarioVariant) => {
      if (v === state.scenario) return;
      const archived = [
        ...state.archivedEpisodes,
        JSON.stringify({ ...state, archivedEpisodes: [] }),
      ];
      const previous = [...state.archivedEpisodes]
        .reverse()
        .map((raw) => JSON.parse(raw) as ExerciseWorkspace)
        .find((w) => w.scenario === v);
      save({
        ...(previous ?? initial(v)),
        archivedEpisodes: archived,
        acceptedRevision: null,
        status: previous?.status ?? 'observed',
      });
    },
    setAvailability: (id: string, available: boolean) =>
      save({
        ...state,
        opportunities: state.opportunities.map((o) => (o.id === id ? { ...o, available } : o)),
        acceptedRevision: null,
        status: 'observed',
      }),
    requestReview: () =>
      save({ ...state, reviewRequested: true, status: 'ready-for-review', acceptedRevision: null }),
    accept: (revision: number) => {
      check(revision);
      if (evaluateWorkspace(state).plan.state !== 'planned') throw new Error('No eligible plan');
      save({ ...state, acceptedRevision: state.revision + 1, status: 'collection-planned' });
    },
    capture: (revision: number) => {
      check(revision);
      if (state.acceptedRevision !== revision) throw new Error('Accept the current plan first');
      const p = evaluateWorkspace(state).plan;
      if (p.state !== 'planned') throw new Error('Collection is not eligible');
      let data = state.data;
      const history = [...state.history];
      let now = state.nowISO;
      for (const id of p.selectedIds) {
        const o = state.opportunities.find((x) => x.id === id)!;
        const capture = createDemoCapture(o, `CAPTURE-${state.revision}-${id}`);
        data = {
          sessions: [...data.sessions, ...capture.sessions],
          stages: [...data.stages, ...capture.stages],
        };
        history.push(capture.sessions[0].id);
        now = o.scheduledAt;
      }
      save({
        ...state,
        data,
        history,
        activeSessionId: history[history.length - 1],
        nowISO: now,
        acceptedRevision: null,
        status: 'observed',
      });
    },
    importPreview: (preview: CsvPreview) => {
      if (!preview.canCommit) throw new Error('Resolve rejected CSV rows first');
      const scope = state.data.sessions.find((s) => s.id === state.activeSessionId)!.scope;
      for (const s of preview.dataset.sessions)
        if (JSON.stringify(s.scope) !== JSON.stringify(scope))
          throw new Error('Import must use the active demonstration participant and series');
      if (
        preview.dataset.sessions.some((s) => state.data.sessions.some((x) => x.id === s.id)) ||
        preview.dataset.stages.some((s) => state.data.stages.some((x) => x.id === s.id))
      )
        throw new Error('Existing immutable IDs cannot be overwritten');
      save({
        ...state,
        data: {
          sessions: [...state.data.sessions, ...preview.dataset.sessions],
          stages: [...state.data.stages, ...preview.dataset.stages],
        },
        acceptedRevision: null,
        status: 'observed',
      });
    },
    linkObservation: (id: string) => {
      const session = state.data.sessions.find((s) => s.id === id);
      const target = state.data.sessions.find((s) => s.id === state.activeSessionId)!;
      if (
        !session ||
        session.isBaseline ||
        JSON.stringify(session.scope) !== JSON.stringify(target.scope)
      )
        throw new Error('Select a follow-up in this series');
      save({
        ...state,
        activeSessionId: id,
        history: [...new Set([...state.history, id])],
        acceptedRevision: null,
        status: 'observed',
      });
    },
    prepare: () => {
      const evaluation = evaluateWorkspace(state);
      const packet = {
        schemaVersion: 1,
        transferState: 'prepared-locally',
        episodeRevision: state.revision,
        source: 'simulated-crew',
        exportedAt: state.nowISO,
        baseline: structuredClone(state.baseline),
        observations: structuredClone(state.data),
        history: state.history,
        evaluation,
        opportunities: structuredClone(state.opportunities),
        responses: state.responses,
        limits: [
          'Demonstration policy; no clinical determination.',
          'Modelled actions are not measured crew time.',
        ],
      };
      const json = JSON.stringify(packet, null, 2);
      save({ ...state, reviews: [...state.reviews, json], status: 'prepared-for-transfer' });
      return json;
    },
    recordResponse: (note: string) => {
      if (
        !['prepared-for-transfer', 'response-recorded'].includes(state.status) ||
        !state.reviews.length ||
        !note.trim()
      )
        throw new Error('Prepare a current prepared review and enter a response');
      save({ ...state, responses: [...state.responses, note.trim()], status: 'response-recorded' });
    },
    reset: () => {
      try {
        storage?.removeItem(key);
        persisted = null;
        blocked = false;
      } catch {
        blocked = true;
      }
      save(initial('missing-hr'));
    },
  };
}
