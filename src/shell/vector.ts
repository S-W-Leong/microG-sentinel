import type { VectorApi } from '../risks/types';
import { createVector } from '../vector/store';
import { missionTime } from '../scenario/mission';
import { scenarioRegistrations } from '../scenario/registrations';
import { riskTabs } from './registry';
import { seedScenario } from './scenario';

export const demoTime = missionTime;
export const vector: VectorApi = createVector({
  clock: () => Date.parse(demoTime),
  registrations: scenarioRegistrations,
});
seedScenario(vector, riskTabs, typeof window === 'undefined' ? '' : window.location.search);
