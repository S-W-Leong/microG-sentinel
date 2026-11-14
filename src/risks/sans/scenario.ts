import type { RiskEvaluationContext } from '../types';
import { atDay, scenarioStory } from '../../scenario/mission';
import { sansSample, sansStore, saveSans } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (!story) return;
  for (const input of sansSample(atDay(0))) {
    if (sansStore.history(ctx).some((entry) => entry.recordedAt >= input.recordedAt)) continue;
    saveSans(ctx, {
      ...input,
      comparisonGroupId: `${ctx.crewId}-MISSION-01`,
      nearLines: input.nearBaseline ? 10 : 10 + story.sansChangeLines,
      cabinCo2MmHg: 2.5,
    });
  }
}
