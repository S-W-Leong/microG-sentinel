import type { RiskEvaluationContext } from '../types';
import { atDay, missionStart, missionTime, scenarioStory } from '../../scenario/mission';
import { boneSample, boneStore, saveBone } from './model';

export function loadScenario(ctx: RiskEvaluationContext) {
  const story = scenarioStory(ctx);
  if (
    !story ||
    boneStore.history(ctx).some((input) => Date.parse(input.recordedAt) >= Date.parse(missionTime))
  )
    return;
  const sample = boneSample();
  saveBone(ctx, {
    ...sample,
    recordedAt: missionTime,
    // Fictional entered DXA records, not an operational onboard scanner.
    current: { ...sample.current!, bmd: 1 + ((story.bone.monthlyChangePct / 100) * 30) / 30.4375 },
    missionStart: `${missionStart}T00:00:00.000Z`,
    sodiumTargetMg: 2300,
    calciumTargetMg: 1000,
    vitaminDTargetIu: 600,
    resistance: sample.resistance!.map((entry) => ({
      ...entry,
      date: atDay(1).slice(0, 10),
      exerciseId: `${ctx.crewId}-SIM-SQUAT`,
      deviceId: `${ctx.crewId}-SIM-ARED-v1`,
      actualKg: (50 * story.bone.loadPct) / 100,
    })),
  });
}
