import type { RiskEvaluationContext } from '../types';
import { missionStart, missionTime, scenarioStory } from '../../scenario/mission';
import { demoHistory, gutStore, saveMicrobiome } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (!story) return;
  for (const [index, input] of demoHistory(missionTime).entries()) {
    if (gutStore.history(ctx).some((entry) => entry.recordedAt >= input.recordedAt)) continue;
    const changed = index >= 5 - story.gut.changedDays;
    // Use the real save path: current fibre is read from Food via the vector.
    // Its API has no historical reader, so prior fibre remains unknown, never invented.
    saveMicrobiome(ctx, {
      ...input,
      missionStart,
      changed,
      bristolType: changed ? story.gut.bristol : 4,
      bloating: changed ? story.gut.bloating : 0,
      abdominalPain: 0,
      appetite: story.gut.appetite,
      antibiotics14d: false,
      antibiotics: [],
    });
  }
}
