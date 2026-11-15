import type { RiskEvaluationContext } from '../types';
import { atDay, scenarioStory } from '../../scenario/mission';
import { saveSleep, sleepSample, sleepStore } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (!story) return;
  for (const [index, sample] of sleepSample().entries()) {
    const recordedAt = atDay(2 - index);
    if (
      sleepStore
        .history(ctx)
        .some((input) => Date.parse(input.recordedAt) >= Date.parse(recordedAt))
    )
      continue;
    const latencyMinutes = story.crewId === 'SIM-CDR' ? 30 : 0;
    saveSleep(ctx, {
      ...sample,
      recordedAt,
      start: atDay(2 - index, 0),
      end: atDay(2 - index, 8),
      planned: { start: atDay(2 - index, 0), end: atDay(2 - index, 8) },
      duty: null,
      latencyMinutes,
      awakeMinutes: (8 - story.sleep.hours[index]) * 60 - latencyMinutes,
      sleepinessKarolinska: story.sleep.kss,
      fatigueSamnPerelli: story.sleep.fatigue,
      comparisonGroupId: `${ctx.crewId}-MISSION-01`,
      baselineMidpointHourUtc: 4,
    });
  }
}
