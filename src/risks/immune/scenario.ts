import type { RiskEvaluationContext } from '../types';
import { missionTime, scenarioStory } from '../../scenario/mission';
import { immuneSample, immuneStore, saveImmune } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (
    !story ||
    immuneStore
      .history(ctx)
      .some((input) => Date.parse(input.recordedAt) >= Date.parse(missionTime))
  )
    return;
  const sample = immuneSample();
  const active = story.immune.rashActive;
  saveImmune(ctx, {
    ...sample,
    recordedAt: missionTime,
    rashActive: active,
    whealCountBand: active ? 2 : 0,
    itch: active ? 2 : 0,
    raised: active,
    clearEdges: active,
    paleCentre: active,
    fadesWithin24h: active ? null : false,
    areas: active ? sample.areas : [],
    onset: active ? '2026-11-14T10:30:00.000Z' : null,
    photoTime: active ? missionTime : null,
    photoArea: active ? 'left-arm' : null,
  });
}
