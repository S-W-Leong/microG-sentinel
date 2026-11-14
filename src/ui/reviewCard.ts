import type { Assessment, AssessmentResult } from '../types';
import { nasa, replayCitation, sourceLabel } from './presentation';
export function buildReviewCard(all: Assessment[], result: AssessmentResult, exportedAt: string) {
  const target = all.find((r) => r.id === result.assessmentId);
  if (!target) throw new Error('Assessment not found');
  const candidates = all.filter(
    (r) =>
      r.isBaseline &&
      !r.duplicateOf &&
      r.source === target.source &&
      r.subjectId === target.subjectId &&
      r.comparisonGroupId === target.comparisonGroupId,
  );
  const ids = new Set([target.id, ...candidates.map((r) => r.id)]);
  const records = all.filter((r) => ids.has(r.id) || (r.duplicateOf && ids.has(r.duplicateOf)));
  return {
    schemaVersion: 1,
    title: 'MicroG Sentinel · Review card',
    source: result.source,
    sourceNotice: `${sourceLabel(result.source)}; no clinical or mission determination.`,
    ...(result.source === 'nasa-research-replay' ? { datasetCitation: replayCitation } : {}),
    exportedAt,
    result,
    records,
    baselineReview: {
      rule:
        result.calculation?.baseline.rule ??
        'Arithmetic mean of matching baseline records in the same participant, source and assessment series. Comparison withheld; review issues before selecting a denominator.',
      candidateIds: candidates.map((r) => r.id),
      includedIds: result.calculation?.baseline.recordIds ?? [],
      exclusions: candidates
        .filter((r) => !result.calculation?.baseline.recordIds.includes(r.id))
        .map((r) => ({
          id: r.id,
          reason:
            result.issues.map((i) => i.message).join(' ') || 'Different metric, units or method.',
        })),
    },
    references: nasa,
  };
}
