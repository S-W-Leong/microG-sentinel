import type { AssessmentResult } from '../types';
export function status(result: AssessmentResult) {
  if (result.evidence === 'insufficient') return { tone: 'muted', icon: '?', label: 'Insufficient evidence' };
  if (result.evidence === 'conflicting') return { tone: 'muted', icon: '!', label: 'Conflicting records' };
  if (result.source === 'nasa-research-replay') return { tone: 'neutral', icon: '✓', label: 'Supported comparison · research context only' };
  return result.reference.state === 'below'
    ? { tone: 'amber', icon: '↓', label: 'Supported · below the displayed reference' }
    : { tone: 'neutral', icon: '✓', label: result.reference.state === 'at-or-above' ? 'Supported · at or above the displayed reference' : 'Supported · reference not applicable' };
}
export const number = (value: number | null | undefined) => value == null ? 'Not available' : value.toLocaleString('en', { maximumFractionDigits: 1 });
export const nasa = {
  risk: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/',
  risks: 'https://www.nasa.gov/hrp/risks/',
  standard: 'https://standards.nasa.gov/node/238',
  measures: 'https://www.nasa.gov/reference/standard-measures/',
  exercise: 'https://www.nasa.gov/reference/zero-t2/',
};
