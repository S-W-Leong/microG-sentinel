import type { AssessmentResult } from '../types';
export function status(result: AssessmentResult) {
  if (result.evidence === 'insufficient')
    return { tone: 'muted', icon: '?', label: 'Insufficient evidence' };
  if (result.evidence === 'conflicting')
    return { tone: 'muted', icon: '!', label: 'Conflicting records' };
  if (result.source === 'nasa-research-replay')
    return { tone: 'neutral', icon: '✓', label: 'Supported comparison · research context only' };
  return result.reference.state === 'below'
    ? { tone: 'amber', icon: '↓', label: 'Supported · below the displayed reference' }
    : {
        tone: 'neutral',
        icon: '✓',
        label:
          result.reference.state === 'at-or-above'
            ? 'Supported · at or above the displayed reference'
            : 'Supported · reference not applicable',
      };
}
export const number = (value: number | null | undefined) =>
  value == null ? 'Not available' : value.toLocaleString('en', { maximumFractionDigits: 1 });
export const nasa = {
  risk: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/',
  risks: 'https://www.nasa.gov/hrp/risks/',
  standard: 'https://standards.nasa.gov/node/238',
  measures: 'https://www.nasa.gov/reference/standard-measures/',
  exercise: 'https://www.nasa.gov/reference/zero-t2/',
};

export const replayCitation = {
  archive: 'NASA Life Sciences Data Archive / NASA Life Sciences Portal',
  title:
    'MR080G, UTMB Flight Analog Project, Campaign 3, Physical Fitness Evaluation - Cycle Ergometry',
  url: 'https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS',
  note: 'Frozen bed-rest research subset curated from the supplied download on 2026-11-14; not astronaut assessments.',
};
