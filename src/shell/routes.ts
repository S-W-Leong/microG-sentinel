import type { RiskId } from '../risks/types';

export const crews = ['SIM-CDR', 'SIM-PLT', 'SIM-MS1'] as const;
export type ShellCrew = (typeof crews)[number];
export const regions = [
  { id: 'head', name: 'Head', tabs: ['sleep', 'balance', 'mood'], point: [240, 100], radius: 49 },
  { id: 'eyes', name: 'Eyes', tabs: ['sans'], point: [240, 145], radius: 47 },
  { id: 'heart-lungs', name: 'Heart & lungs', tabs: ['cardio'], point: [240, 297], radius: 51 },
  { id: 'skin', name: 'Skin', tabs: ['immune'], point: [354, 337], radius: 43 },
  { id: 'gut', name: 'Gut', tabs: ['food', 'microbiome'], point: [240, 369], radius: 48 },
  { id: 'bones', name: 'Bones', tabs: ['bone'], point: [268, 478], radius: 54 },
] as const;
export const titles: Record<RiskId, string> = {
  sleep: 'Sleep',
  balance: 'Balance',
  mood: 'Mood',
  sans: 'SANS',
  cardio: 'Cardio',
  immune: 'Immune',
  food: 'Food',
  microbiome: 'Microbiome',
  bone: 'Bone',
};
export function regionForRisk(risk: string) {
  return regions.find((region) => (region.tabs as readonly string[]).includes(risk));
}
export function validCrew(value: string | null): ShellCrew {
  return crews.find((crew) => crew === value) ?? 'SIM-CDR';
}
export function parseRoute(hash: string) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const [, page = '', id = ''] = path.split('/');
  const params = new URLSearchParams(query);
  return { page, id, crewId: validCrew(params.get('crewId')), at: params.get('at') ?? undefined };
}
export function routeHref(path: string, crewId: string, at?: string) {
  const params = new URLSearchParams({ crewId });
  if (at) params.set('at', at);
  return '#' + path + '?' + params.toString();
}
export function navigationHref(detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const { risk, crewId, recordedAt } = detail as Record<string, unknown>;
  if (
    typeof risk !== 'string' ||
    !regionForRisk(risk) ||
    typeof crewId !== 'string' ||
    !crews.some((crew) => crew === crewId)
  )
    return null;
  return routeHref(
    '/risk/' + risk,
    crewId,
    typeof recordedAt === 'string' ? recordedAt : undefined,
  );
}
