import { expect, it } from 'vitest';
import { testVector } from './testVector';
import { makePmcPacket, queuePmcPacket } from './pmc';
import { urgentEvaluation } from './presentation';

it('freezes an unscheduled request with source, raw flags and no transmission claim', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  const raw = { flags: { chest: true } };
  const packet = makePmcPacket(
    ctx,
    urgentEvaluation(ctx, 'cardio', 'HR change at workload', 'bpm'),
    raw,
    'urgent',
  );
  raw.flags.chest = false;
  expect(packet).toMatchObject({
    channel: 'unscheduled-pmc-via-flight-director',
    transmitted: false,
    source: 'simulated-crew',
    simulated: true,
    observations: { flags: { chest: true } },
    evaluation: { value: null, escalation: { level: 'urgent' } },
  });
});

it('queues a weekly packet in a separate scoped storage key and preserves corrupt data', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  const packet = makePmcPacket(
    ctx,
    urgentEvaluation(ctx, 'sleep', 'Sleep change vs baseline', 'h'),
    {},
    'next-pmc',
  );
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  expect(queuePmcPacket(packet, storage).persisted).toBe(true);
  const key = [...saved.keys()][0];
  expect(key).toContain('microg.pmc.sleep.SIM-CDR');
  expect(JSON.parse(saved.get(key)!).packets[0].channel).toBe('weekly-private-medical-conference');
  saved.set(key, 'corrupt input');
  expect(queuePmcPacket(packet, storage).persisted).toBe(false);
  expect(saved.get(key)).toBe('corrupt input');
});
