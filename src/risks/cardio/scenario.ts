import type { RiskEvaluationContext } from '../types';
import { atDay, scenarioStory } from '../../scenario/mission';
import { createCrewScenario } from '../../exercise/data/scenarios';
import type { ExerciseWorkspace } from '../../exercise/store';
import { cardioIdentity, cardioStore, emptyCardio, saveCardio } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (!story) return;
  const recordedAt = atDay(0, 9.5);
  if (
    cardioStore.history(ctx).some((input) => Date.parse(input.recordedAt) >= Date.parse(recordedAt))
  )
    return;
  const fixture = structuredClone(createCrewScenario('complete'));
  const scope = {
    source: 'simulated-crew' as const,
    subjectId: ctx.crewId,
    seriesId: `${ctx.crewId}-MISSION-01`,
  };
  if (cardioIdentity(scope) !== ctx.crewId)
    throw new Error('Scenario identity does not match crew');
  const id = (original: string) => `${ctx.crewId}-${original}`;
  const data = {
    sessions: fixture.dataset.sessions.map((session, index) => ({
      ...session,
      id: id(session.id),
      scope: { ...scope },
      date: index < 2 ? atDay(4 - index).slice(0, 10) : recordedAt.slice(0, 10),
    })),
    stages: fixture.dataset.stages.map((stage) => ({
      ...stage,
      id: id(stage.id),
      sessionId: id(stage.sessionId),
      duplicateOf: stage.duplicateOf === null ? null : id(stage.duplicateOf),
      hrBpm:
        stage.sessionId === fixture.targetSessionId
          ? stage.hrBpm! - 1.5 + story.cardio.deltaBpm
          : stage.hrBpm,
      rpe: stage.sessionId === fixture.targetSessionId ? story.cardio.borg : stage.rpe,
    })),
  };
  const baselineIds = fixture.baselineSessionIds.map(id);
  const workspace: ExerciseWorkspace = {
    schemaVersion: 1,
    archivedEpisodes: [],
    revision: 0,
    scenario: 'complete',
    data,
    baseline: {
      sessions: data.sessions.filter((session) => baselineIds.includes(session.id)),
      stages: data.stages.filter((stage) => baselineIds.includes(stage.sessionId)),
    },
    activeSessionId: id(fixture.targetSessionId),
    history: [id(fixture.targetSessionId)],
    opportunities: [],
    nowISO: recordedAt,
    reviewRequested: false,
    status: 'observed',
    acceptedRevision: null,
    reviews: [],
    responses: [],
    notice: '',
  };
  const stageId = data.stages.find(
    (stage) => stage.sessionId === workspace.activeSessionId && stage.context.workloadW === 100,
  )!.id;
  saveCardio(ctx, {
    ...emptyCardio(recordedAt),
    workspace,
    stageId,
    exerciseObservedAt: recordedAt,
    restingHrBpm: story.cardio.restingBpm,
    restingPosture: 'seated',
    completedMinutes: (60 * story.cardio.loadPct) / 100,
    plannedMinutes: 60,
    exerciseWindowComplete: true,
    flags: { chest: false, fainting: false, stopped: false, palpitations: false },
  });
}
