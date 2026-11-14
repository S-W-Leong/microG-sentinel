import type { DataSource } from '../../types';
import type { CrewExposures, RiskEvaluation, RiskEvaluationContext } from '../types';
import { crew } from './support';

export interface PmcPacket {
  schema: 'microg.pmc-request.v1';
  channel: 'unscheduled-pmc-via-flight-director' | 'weekly-private-medical-conference';
  crewId: string;
  source: DataSource;
  simulated: boolean;
  preparedAt: string;
  evaluation: RiskEvaluation;
  observations: unknown;
  context: CrewExposures | null;
  transmitted: false;
}
export function makePmcPacket(
  ctx: RiskEvaluationContext,
  evaluation: RiskEvaluation,
  observations: unknown,
  level: 'urgent' | 'next-pmc',
): PmcPacket {
  const person = crew(ctx);
  return structuredClone({
    schema: 'microg.pmc-request.v1',
    channel:
      level === 'urgent'
        ? 'unscheduled-pmc-via-flight-director'
        : 'weekly-private-medical-conference',
    crewId: ctx.crewId,
    source: person.source,
    simulated: person.simulated,
    preparedAt: person.exposures.asOf,
    evaluation,
    observations,
    context: ctx.vector.getExposures(ctx.crewId, 24),
    transmitted: false,
  });
}
const pending = new Map<string, PmcPacket[]>();
export function queuePmcPacket(
  packet: PmcPacket,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
) {
  const key = `microg.pmc.${packet.evaluation.risk}.${encodeURIComponent(packet.crewId)}.${packet.source}.${packet.simulated}.v1`;
  const memory = [...(pending.get(key) ?? []), structuredClone(packet)];
  pending.set(key, memory);
  if (!storage) return { persisted: false, notice: 'Packet queued for this session' };
  try {
    const raw = storage.getItem(key);
    const previous = raw === null ? { schema: 1, packets: [] as PmcPacket[] } : JSON.parse(raw);
    if (
      previous.schema !== 1 ||
      !Array.isArray(previous.packets) ||
      previous.packets.some(
        (p: PmcPacket) =>
          p.schema !== 'microg.pmc-request.v1' ||
          p.crewId !== packet.crewId ||
          p.source !== packet.source ||
          p.simulated !== packet.simulated ||
          p.evaluation.risk !== packet.evaluation.risk ||
          p.transmitted !== false,
      )
    )
      throw new Error('Stored queue needs recovery');
    storage.setItem(key, JSON.stringify({ schema: 1, packets: [...previous.packets, packet] }));
    return { persisted: true, notice: 'Packet queued locally' };
  } catch {
    return { persisted: false, notice: 'Session queue only · existing storage preserved' };
  }
}
