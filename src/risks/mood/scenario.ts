import type { RiskEvaluationContext } from '../types';
import { missionTime, scenarioStory } from '../../scenario/mission';
import { moodSample, moodStore, saveMood } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (!story) return;
  for (const [index, input] of moodSample(missionTime).entries()) {
    if (moodStore.history(ctx).some((entry) => entry.recordedAt >= input.recordedAt)) continue;
    saveMood(ctx, {
      ...input,
      mood: index < 9 ? 7 : story.mood.lastFive[index - 9],
      stress: index < 9 ? 2 : story.mood.stress,
      workload: index < 9 ? 4 : story.mood.workload,
      isolation: ctx.crewId === 'SIM-CDR' && index >= 9 ? 5 : 2,
    });
  }
}
