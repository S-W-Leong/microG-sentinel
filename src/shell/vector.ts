import type { VectorApi } from '../risks/types';
import { createVector } from '../vector/store';
import { missionTime } from '../scenario/mission';
import { scenarioRegistrations } from '../scenario/registrations';
import { riskTabs } from './registry';
import { seedScenario } from './scenario';

// The clock runs 10 minutes past the scenario's last observations, so a live check-in has room to be newer.
export const demoTime = new Date(Date.parse(missionTime) + 10 * 60_000).toISOString();
export const vector: VectorApi = createVector({
  clock: () => Date.parse(demoTime),
  registrations: scenarioRegistrations,
});
seedScenario(vector, riskTabs, typeof window === 'undefined' ? '' : window.location.search);
