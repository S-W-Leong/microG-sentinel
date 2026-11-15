import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { testVector } from '../cardio/testVector';
import { createVector } from '../../vector/store';
import type { BaselineEntry } from '../types';
import BalanceTab from './BalanceTab';
import {
  balanceSample,
  calculateBalance,
  centredSamples,
  contextKey,
  ellipse,
  emptyBalance,
  evaluateBalance,
  replayTest,
  saveBalance,
  testArea,
} from './model';
import { gravitySample, orientationSample, sensorPermission } from './sensor';

const time = '2026-11-14T11:00:00.000Z';
function setup(entries: BaselineEntry[] = []) {
  const vector = testVector('SIM-CDR', entries);
  return { vector, ctx: { crewId: 'SIM-CDR', vector: vector.api } };
}
const baseline = (): BaselineEntry => ({
  metric: 'swayAreaEyesClosedDeg2',
  value: 2,
  unit: 'deg²',
  sourceSessionIds: ['PRE-1'],
  count: 1,
  source: 'simulated-crew',
  comparisonGroupId: 'SIM-CDR-MISSION-01',
  methodId: 'covariance-95-v1',
  contextKey: contextKey(replayTest('eyes-closed')),
  recordedAt: '2026-11-13T11:00:00Z',
  evidence: 'supported',
});

describe('Balance signal contract', () => {
  it('emits all six keys with nulls, without MISC substitution', () => {
    const { vector, ctx } = setup();
    saveBalance(ctx, { ...emptyBalance(time), misc: 6 });
    expect(vector.emitted).toEqual([
      {
        risk: 'balance',
        crewId: 'SIM-CDR',
        recordedAt: time,
        source: 'simulated-crew',
        simulated: true,
        signals: {
          swayAreaEyesOpenDeg2: null,
          swayAreaEyesClosedDeg2: null,
          swayRatioEyesClosed: null,
          dizziness: null,
          motionSickness: null,
          headMovementTolerance: null,
        },
      },
    ]);
    expect(evaluateBalance(ctx).escalation?.level).toBe('next-pmc');
  });
  it('emits the 2.1× fixture through the real vector and evaluates read-only', () => {
    const vector = createVector({ clock: () => Date.parse(time) });
    const ctx = { vector, crewId: 'SIM-CDR' };
    let notifications = 0;
    const off = vector.subscribe(ctx.crewId, () => notifications++);
    saveBalance(ctx, balanceSample());
    expect(vector.getSignals('balance', ctx.crewId, 24)?.signals.swayRatioEyesClosed).toBeCloseTo(
      2.1,
    );
    expect(evaluateBalance(ctx).label).toBe('Eyes-closed sway 2.1× your baseline');
    evaluateBalance(ctx);
    expect(notifications).toBe(1);
    off();
  });
  it('retains zero ratings and rejects invalid values', () => {
    const { ctx } = setup();
    expect(calculateBalance(ctx, { ...emptyBalance(time), dizziness: 0 }).dizziness).toBe(0);
    for (const misc of [-1, 11, 0.5, NaN])
      expect(() => calculateBalance(ctx, { ...emptyBalance(time), misc })).toThrow();
  });
});
describe('covariance and comparison gates', () => {
  it('calculates the sample covariance 95% ellipse area', () => {
    const points = [
      { seconds: 0, pitch: 1, roll: 0 },
      { seconds: 10, pitch: -1, roll: 0 },
      { seconds: 20, pitch: 0, roll: 1 },
      { seconds: 30, pitch: 0, roll: -1 },
    ];
    expect(ellipse(points)?.area).toBeCloseTo((Math.PI * 5.991 * 2) / 3);
    expect(testArea(replayTest('eyes-closed'))).toBeCloseTo(4.2);
  });
  it('unwraps angles before centring, and retains incomplete and sparse records as null', () => {
    expect(
      centredSamples([
        { seconds: 0, pitch: 179, roll: 179 },
        { seconds: 1, pitch: -179, roll: -179 },
      ]).map((point) => point.pitch),
    ).toEqual([-1, 1]);
    expect(testArea({ ...replayTest('eyes-closed'), complete: false })).toBeNull();
    expect(testArea({ ...replayTest('eyes-closed'), samples: [] })).toBeNull();
    expect(() => ellipse([{ seconds: 0, pitch: NaN, roll: 0 }])).toThrow();
  });
  it('compares only positive, matching, earlier baselines', () => {
    const sample = { ...balanceSample(), demoBaseline: false };
    expect(calculateBalance(setup([baseline()]).ctx, sample).swayRatioEyesClosed).toBeCloseTo(2.1);
    for (const changed of [
      { value: 0 },
      { value: null },
      { contextKey: 'other-device' },
      { methodId: 'force-platform' },
      { recordedAt: time },
      { count: 0 },
      { evidence: 'conflicting' as const },
      { comparisonGroupId: 'other-crew' },
    ]) {
      expect(
        calculateBalance(setup([{ ...baseline(), ...changed }]).ctx, sample).swayRatioEyesClosed,
      ).toBeNull();
    }
    const live = {
      ...sample,
      demoBaseline: true,
      tests: {
        'eyes-closed': {
          ...replayTest('eyes-closed'),
          mode: 'live' as const,
          acquisition: 'orientation' as const,
          permission: 'granted' as const,
        },
      },
    };
    expect(calculateBalance(setup().ctx, live).swayRatioEyesClosed).toBeNull();
    expect(
      calculateBalance({ crewId: 'SIM-PLT', vector: testVector('SIM-PLT').api }, balanceSample())
        .swayRatioEyesClosed,
    ).toBeNull();
  });
});
describe('medical handoff and screen', () => {
  it.each(['headStrike', 'persistentVertigo', 'weakness'] as const)(
    'suppresses scores for %s',
    (flag) => {
      const { ctx, vector } = setup();
      const sample = balanceSample();
      sample.flags[flag] = true;
      saveBalance(ctx, sample);
      expect(evaluateBalance(ctx)).toMatchObject({
        value: null,
        reasons: [],
        escalation: { level: 'urgent', trigger: 'red-flag' },
      });
      expect(vector.calls()).toBe(0);
      const html = renderToStaticMarkup(createElement(BalanceTab, ctx));
      expect(html).toContain('Contact the flight surgeon now');
      expect(html).toContain('Request PMC');
      expect(html).not.toContain('2.1×');
      expect(html).not.toContain('balance-trace');
    },
  );
  it('raises incomplete, conflicting and persistent records at PMC', () => {
    const { ctx } = setup();
    saveBalance(ctx, emptyBalance('2026-11-14T09:00:00Z'));
    saveBalance(ctx, emptyBalance(time));
    expect(evaluateBalance(ctx).escalation?.trigger).toBe('no-pattern');
    const conflict = setup([{ ...baseline(), evidence: 'conflicting' }]).ctx;
    saveBalance(conflict, balanceSample());
    expect(evaluateBalance(conflict).escalation?.trigger).toBe('conflicting');
    const persistent = setup().ctx;
    for (const hour of ['09', '10', '11'])
      saveBalance(persistent, {
        ...balanceSample(`2026-11-14T${hour}:00:00Z`),
        observedClosedRange: [1, 3],
      });
    expect(evaluateBalance(persistent).escalation?.trigger).toBe('persistent-change');
  });
  it('renders a clearly labelled replay and both ellipse styles', () => {
    const { ctx } = setup();
    saveBalance(ctx, balanceSample());
    const html = renderToStaticMarkup(createElement(BalanceTab, ctx));
    expect(html).toContain('Simulated replay · not measured');
    expect(html).toContain('balance-current');
    expect(html).toContain('balance-baseline');
  });
});
describe('sensor acquisition', () => {
  it('requests both iOS-style permissions and handles rejection', async () => {
    expect(
      await sensorPermission({
        DeviceOrientationEvent: { requestPermission: async () => 'granted' },
        DeviceMotionEvent: {
          requestPermission: async () => {
            throw new Error('denied');
          },
        },
      }),
    ).toEqual({ orientation: true, gravity: false });
    expect(await sensorPermission({})).toEqual({ orientation: false, gravity: false });
  });
  it('does not turn absent sensor axes into zero measurements', () => {
    expect(orientationSample(0, null, 0)).toBeNull();
    expect(orientationSample(0, 0, 0)).toEqual({ seconds: 0, pitch: 0, roll: 0 });
    expect(gravitySample(0, { x: null, y: 0, z: 0 })).toBeNull();
    expect(gravitySample(0, { x: 0, y: 0, z: 0 })).toBeNull();
    expect(gravitySample(0, { x: 0, y: 0, z: 9.81 })?.pitch).toBe(0);
  });
});
