import type { RiskEvaluationContext } from '../types';
import { atDay, scenarioStory } from '../../scenario/mission';
import { balanceSample, balanceStore, replayTest, saveBalance } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (!story || balanceStore.history(ctx).length) return;
  saveBalance(ctx, {
    ...balanceSample(atDay(0, 9)),
    comparisonGroupId: `${ctx.crewId}-MISSION-01`,
    tests: {
      'eyes-open': replayTest('eyes-open', story.balance.openArea),
      'eyes-closed': replayTest('eyes-closed', story.balance.closedArea),
    },
    dizziness: 0,
    motionSickness: story.balance.sickness,
    misc: 0,
    headMovementTolerance: 3,
    demoBaseline: false,
  });
}
