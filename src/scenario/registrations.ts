import type { BaselineEntry } from '../risks/types';
import type { Registration } from '../vector/registry';
import { atDay, missionCrew } from './mission';

/** Explicit same-person simulated references, separate from the generic test registry. */
export const scenarioRegistrations: Registration[] = missionCrew.map((story) => {
  const comparisonGroupId = `${story.crewId}-MISSION-01`;
  const reference = {
    source: 'simulated-crew' as const,
    comparisonGroupId,
    sourceSessionIds: [`${story.crewId}-REFERENCE-01`],
    count: 1,
    recordedAt: atDay(20),
    evidence: 'supported' as const,
  };
  const entries: BaselineEntry[] = [
    {
      ...reference,
      metric: 'sleepHours',
      value: 8,
      unit: 'h',
      methodId: 'sleep-manual-v1',
      contextKey: 'default',
    },
    {
      ...reference,
      metric: 'bodyMassKg',
      value: story.food.baselineKg,
      unit: 'kg',
      methodId: 'same-scale-morning-v1',
      contextKey: 'default',
    },
    ...(['swayAreaEyesOpenDeg2', 'swayAreaEyesClosedDeg2'] as const).map((metric) => ({
      ...reference,
      metric,
      value: metric === 'swayAreaEyesClosedDeg2' ? story.balance.closedBaseline : 1,
      unit: 'deg²' as const,
      methodId: 'covariance-95-v1',
      contextKey: JSON.stringify({
        device: 'demo-tablet',
        orientation: 'portrait',
        posture: 'standing-chest',
        protocol: 'stand-30-v1',
        gravity: 'ground',
        acquisition: 'synthetic',
      }),
    })),
  ];
  return {
    crewId: story.crewId,
    source: 'simulated-crew',
    simulated: true,
    comparisonGroupId,
    traits: structuredClone(story.traits),
    baselines: { entries },
  };
});
