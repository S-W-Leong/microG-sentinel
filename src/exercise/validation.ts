import type { ExerciseDataset } from './types';
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const nullableText = (v: unknown) => v === null || text(v);
const number = (v: unknown, zero = false) =>
  v === null || (typeof v === 'number' && Number.isFinite(v) && (zero ? v >= 0 : v > 0));
const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const refs = (v: unknown) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.every((x) => object(x) && text(x.path) && text(x.locator) && typeof x.note === 'string');
export function validateExerciseDataset(
  value: unknown,
): { ok: true; data: ExerciseDataset } | { ok: false; errors: readonly string[] } {
  const errors: string[] = [];
  if (!object(value) || !Array.isArray(value.sessions) || !Array.isArray(value.stages))
    return { ok: false, errors: ['Expected sessions and stages arrays'] };
  const sessions = value.sessions;
  const stages = value.stages;
  const ids = new Set<string>();
  for (const s of sessions) {
    if (
      !object(s) ||
      !text(s.id) ||
      !object(s.scope) ||
      !['simulated-crew', 'nasa-research-replay'].includes(String(s.scope.source)) ||
      !text(s.scope.subjectId) ||
      !text(s.scope.seriesId) ||
      typeof s.isBaseline !== 'boolean' ||
      !nullableText(s.researchBasisId) ||
      !strings(s.symptoms) ||
      !strings(s.notes) ||
      !refs(s.sourceRefs)
    ) {
      errors.push('Invalid session');
      continue;
    }
    if (ids.has(s.id)) errors.push('Duplicate session ID');
    ids.add(s.id);
    if (
      s.date !== null &&
      (typeof s.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
        !Number.isFinite(Date.parse(s.date)) ||
        new Date(s.date).toISOString().slice(0, 10) !== s.date)
    )
      errors.push('Invalid date');
  }
  const stageIds = new Set<string>();
  for (const s of stages) {
    if (
      !object(s) ||
      !text(s.id) ||
      !text(s.sessionId) ||
      !object(s.context) ||
      !object(s.quality)
    ) {
      errors.push('Invalid stage');
      continue;
    }
    const c = s.context;
    if (stageIds.has(s.id)) errors.push('Duplicate stage ID');
    stageIds.add(s.id);
    if (!ids.has(s.sessionId)) errors.push('Orphan stage');
    if (
      !nullableText(c.deviceId) ||
      !nullableText(c.protocolId) ||
      ![null, 'seated', 'supine'].includes(c.posture as null) ||
      !number(c.stageIndex) ||
      (c.stageIndex !== null && !Number.isInteger(c.stageIndex)) ||
      !number(c.workloadW, true) ||
      !number(c.durationSec) ||
      !number(s.hrBpm) ||
      ![null, 'borg-6-20'].includes(s.rpeScale as null) ||
      (s.rpe !== null &&
        (typeof s.rpe !== 'number' ||
          !Number.isInteger(s.rpe) ||
          s.rpe < 6 ||
          s.rpe > 20 ||
          s.rpeScale !== 'borg-6-20')) ||
      !['unknown', 'usable', 'unusable'].includes(String(s.quality.state)) ||
      !text(s.quality.basis) ||
      !nullableText(s.duplicateOf) ||
      !refs(s.sourceRefs)
    )
      errors.push('Invalid stage measurements or context');
    if (
      c.precedingStages !== null &&
      (!Array.isArray(c.precedingStages) ||
        !c.precedingStages.every(
          (p) =>
            object(p) &&
            p.workloadW !== null &&
            p.durationSec !== null &&
            number(p.workloadW, true) &&
            number(p.durationSec),
        ))
    )
      errors.push('Invalid stage history');
  }
  for (const s of stages)
    if (object(s) && s.duplicateOf !== null) {
      const original = stages.find((x) => object(x) && x.id === s.duplicateOf);
      if (
        !object(original) ||
        original === s ||
        original.duplicateOf !== null ||
        original.sessionId !== s.sessionId
      )
        errors.push('Invalid alternative representation link');
    }
  return errors.length
    ? { ok: false, errors }
    : { ok: true, data: value as unknown as ExerciseDataset };
}
