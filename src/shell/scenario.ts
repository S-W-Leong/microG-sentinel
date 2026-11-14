import type { RiskId, RiskTab, VectorApi } from '../risks/types';
import { missionCrew } from '../scenario/mission';

/** Fresh session only; disabling never clears user data or the legacy exercise store. */
export function seedScenario(
  vector: VectorApi,
  tabs: Partial<Record<RiskId, RiskTab>>,
  search = '',
) {
  if (new URLSearchParams(search).get('scenario') === 'off') return;
  const ordered = Object.values(tabs).sort(
    (a, b) => Number(b.id === 'food') - Number(a.id === 'food'),
  );
  for (const { crewId } of missionCrew) {
    for (const tab of ordered) {
      try {
        tab.loadScenario?.({ crewId, vector });
      } catch (error) {
        console.warn(`Scenario unavailable: ${crewId} / ${tab.id}`, error);
      }
    }
  }
}
