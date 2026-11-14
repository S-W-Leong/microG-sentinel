import { describe, expect, it } from 'vitest';
import { navigationHref, parseRoute, regionForRisk, regions, routeHref } from './routes';

describe('body map routing', () => {
  it('maps every tab exactly once to its region', () => {
    expect(regions.map((region) => [region.name, [...region.tabs]])).toEqual([
      ['Head', ['sleep', 'balance', 'mood']],
      ['Eyes', ['sans']],
      ['Heart & lungs', ['cardio']],
      ['Skin', ['immune']],
      ['Gut', ['food', 'microbiome']],
      ['Bones', ['bone']],
    ]);
    expect(new Set(regions.flatMap((region) => [...region.tabs])).size).toBe(9);
    expect(regionForRisk('unknown')).toBeUndefined();
  });
  it('defaults the home crew and validates deep links', () => {
    expect(parseRoute('#/').crewId).toBe('SIM-CDR');
    expect(parseRoute('#/risk/food?crewId=unknown').crewId).toBe('SIM-CDR');
    expect(parseRoute('#/risk/food?crewId=SIM-MS1').id).toBe('food');
    expect(parseRoute('#/fitness/entry').id).toBe('entry');
  });
  it('preserves observation context through links and navigation events', () => {
    const recordedAt = '2026-11-14T11:00:00.000Z';
    const href = routeHref('/risk/immune', 'SIM-PLT', recordedAt);
    expect(parseRoute(href)).toEqual({
      page: 'risk',
      id: 'immune',
      crewId: 'SIM-PLT',
      at: recordedAt,
    });
    expect(navigationHref({ risk: 'immune', crewId: 'SIM-PLT', recordedAt })).toBe(href);
    expect(navigationHref({ risk: 'oops', crewId: 'SIM-CDR' })).toBeNull();
    expect(navigationHref({ risk: 'food', crewId: 'unknown' })).toBeNull();
    expect(navigationHref(null)).toBeNull();
  });
});
