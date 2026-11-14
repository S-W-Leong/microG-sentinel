import { afterEach, expect, it, vi } from 'vitest';
import { startStandTest } from './sensor';
import type { StandTest } from './model';

afterEach(() => vi.useRealTimers());
function harness(replay: boolean) {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  const target = new EventTarget();
  const host = Object.assign(target, {
    document: Object.assign(new EventTarget(), { hidden: false }),
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  }) as unknown as Window;
  const updates: StandTest[] = [],
    completed: StandTest[] = [];
  const capture = startStandTest({
    host,
    condition: 'eyes-closed',
    deviceId: 'test-tablet',
    permission: { orientation: true, gravity: false },
    replay,
    update: (value) => updates.push(value),
    done: (value) => completed.push(value),
  });
  return { host, capture, updates, completed };
}
it('completes a 30-second replay with all timestamped samples', () => {
  const run = harness(true);
  vi.advanceTimersByTime(30_000);
  expect(run.completed).toHaveLength(1);
  expect(run.completed[0]).toMatchObject({
    duration: 30,
    complete: true,
    mode: 'replay',
    acquisition: 'synthetic',
  });
  expect(run.completed[0].samples).toHaveLength(301);
  expect(vi.getTimerCount()).toBe(0);
});
it('labels sensor silence as a new replay, never a measured test', () => {
  const run = harness(false);
  vi.advanceTimersByTime(1500);
  const last = run.updates[run.updates.length - 1];
  expect(last).toMatchObject({ mode: 'replay', acquisition: 'synthetic', duration: 0 });
  run.capture.abort();
  expect(run.completed[0].complete).toBe(false);
});
it('retains live timestamps and tears down on visibility loss', () => {
  const run = harness(false);
  const event = Object.assign(new Event('deviceorientation'), { beta: 2, gamma: 3 });
  run.host.dispatchEvent(event);
  vi.advanceTimersByTime(2000);
  expect(run.updates[run.updates.length - 1].mode).toBe('live');
  Object.assign(run.host.document, { hidden: true });
  run.host.document.dispatchEvent(new Event('visibilitychange'));
  expect(run.completed[0]).toMatchObject({
    complete: false,
    duration: 2,
    samples: [{ seconds: 0, pitch: 2, roll: 3 }],
  });
  expect(vi.getTimerCount()).toBe(0);
});
