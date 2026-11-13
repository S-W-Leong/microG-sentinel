import type { Assessment, AssessmentResult, BaselineChoice, Issue, TrendPoint } from '../types';

const followUps = {
  baseline: 'Obtain or select an appropriate baseline assessment',
  records: 'Review the original records',
  method: 'Request a comparable assessment through existing procedures',
  decline: 'Prepare the assessment and supporting evidence for specialist review',
};

const documented = (value: string | null) => Boolean(value?.trim());
const validDate = (date: string | null): date is string => {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};
const sameBasis = (record: Assessment, target: Assessment) =>
  record.metric === target.metric && record.unit === target.unit && record.method === target.method;
const baselinesFor = (records: Assessment[], target: Assessment) =>
  records.filter(record => record.isBaseline && !record.duplicateOf &&
    record.subjectId === target.subjectId && record.source === target.source);
const uniqueIds = (records: Assessment[]) =>
  records.filter((record, index) => records.findIndex(other => other.id === record.id) === index);

/** Selection never drops an invalid matching value to obtain a favourable mean. */
export function selectBaseline(records: Assessment[], target: Assessment): BaselineChoice | null {
  if (!target.subjectId.trim() || !target.metric || !target.unit || !documented(target.method)) return null;
  const included = baselinesFor(records, target).filter(record => sameBasis(record, target));
  if (!included.length || included.some(record => record.value === null ||
    !Number.isFinite(record.value) || record.value <= 0)) return null;
  const distinct = uniqueIds(included);
  if (included.some(record => distinct.find(other => other.id === record.id)?.value !== record.value)) return null;
  // Divide before summation so finite large measurements do not overflow their mean.
  const value = distinct.reduce((sum, record) => sum + record.value! / distinct.length, 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    rule: `Arithmetic mean of ${distinct.length} baseline assessments marked isBaseline for ${target.subjectId} (${target.source}), with metric ${target.metric}, unit ${target.unit}, and method "${target.method}". Included: ${distinct.map(record => `${record.id} (${record.phase ?? 'phase missing'}, ${record.date ?? 'date missing'})`).join(', ')}. Duplicate representations excluded; no unit conversion. This is a demonstration assumption, not a NASA-approved selection rule.`,
    recordIds: distinct.map(record => record.id), value, unit: target.unit,
  };
}

export function assess(records: Assessment[], assessmentId: string): AssessmentResult {
  const target = records.find(record => record.id === assessmentId);
  if (!target) throw new RangeError(`Assessment not found: ${assessmentId}`);
  const issues: Issue[] = [];
  const add = (code: Issue['code'], message: string, followUp = followUps.records) => {
    if (!issues.some(issue => issue.code === code && issue.message === message)) issues.push({ code, message, followUp });
  };
  const candidates = baselinesFor(records, target);
  const matching = candidates.filter(record => sameBasis(record, target));
  const relevant = [target, ...matching];
  for (const record of relevant) {
    const representations = records.filter(other => other.id === record.id || other.duplicateOf === record.id ||
      (record.duplicateOf && other.id === record.duplicateOf));
    if (representations.some(other => other.subjectId !== record.subjectId || other.source !== record.source)) {
      add('identity', `Conflicting identities or sources for assessment ${record.id}; comparison needs review.`);
    }
    if (representations.some(other => other.date !== null && record.date !== null && other.date !== record.date)) {
      add('timing', `Contradictory dates for assessment ${record.id}; timeline interpretation is withheld.`);
    }
    if (representations.some(other => other.id === record.id && (other.value !== record.value || !sameBasis(other, record)))) {
      add('missing', `Conflicting measurements under assessment ID ${record.id}; comparison needs review.`);
    }
    if (!record.subjectId.trim()) add('missing', `Participant identity is missing for ${record.id}.`);
    if (!record.date) add('missing', `Assessment date is missing for ${record.id}.`);
    else if (!validDate(record.date)) add('timing', `Invalid assessment date for ${record.id}; timeline interpretation is withheld.`);
    if (!record.phase) add('missing', `Mission or study phase is missing for ${record.id}.`);
    if (record.value === null || !Number.isFinite(record.value) || record.value < 0) {
      add('missing', `A finite, non-negative capacity value is required for ${record.id}; missing values are not zero.`);
    }
  }
  if (target.duplicateOf) add('duplicate', `Alternative representation of ${target.duplicateOf}; not an additional assessment. Review the linked original.`);
  if (!target.metric) add('metric', 'Capacity metric is missing; VO2peak and VO2max are never substituted.');
  if (!target.unit) add('units', 'Capacity units are missing; no silent conversion is performed.');
  if (!documented(target.method)) add('method', 'A documented capacity assessment comparison method is missing.', followUps.method);
  if (target.method && /(?:workout|heart\s*rate)/i.test(target.method) && !/(?:capacity|graded|VO2|oxygen)/i.test(target.method)) {
    add('method', 'Ordinary workout heart rate is not a capacity assessment comparison basis.', followUps.method);
  }
  if (!matching.length && candidates.length) {
    if (candidates.every(record => record.metric !== target.metric)) add('metric', 'Baseline metric differs from the current metric; VO2peak and VO2max are never substituted.');
    if (candidates.every(record => record.unit !== target.unit)) add('units', 'Baseline units differ from the current units; absolute and mass-normalised capacity stay separate. No conversion is performed.');
    if (candidates.every(record => record.method !== target.method)) add('method', 'Baseline and current methods are incompatible or undocumented.', followUps.method);
  }
  for (const record of matching) {
    if (validDate(record.date) && validDate(target.date) && !target.isBaseline && record.date > target.date) {
      add('timing', `Baseline ${record.id} is dated after the current assessment; timeline interpretation is withheld.`);
    }
    if (record.phase && record.phase !== (target.source === 'simulated-crew' ? 'pre-mission' : 'pre-bed-rest')) {
      add('timing', `Baseline ${record.id} has a contradictory phase (${record.phase ?? 'missing'}); a pre-exposure baseline is required.`);
    }
    for (const field of ['modality', 'protocol'] as const) {
      if (documented(record[field]) && documented(target[field]) && record[field] !== target[field]) {
        add('method', `Baseline ${record.id} and current ${field} differ; a documented comparable assessment is required.`, followUps.method);
      }
    }
  }
  const baseline = selectBaseline(records, target);
  if (!baseline) add('baseline', 'No usable matching baseline: baseline values must be present, positive and finite, with the same participant, source, metric, units and method.', followUps.baseline);
  let evidence: AssessmentResult['evidence'] = issues.some(issue => issue.code === 'identity' || issue.code === 'timing')
    ? 'conflicting' : issues.length ? 'insufficient' : 'supported';
  let calculation: AssessmentResult['calculation'] = evidence === 'supported' && baseline && target.value !== null && target.unit
    ? { current: target.value, unit: target.unit, baseline,
      retainedPct: target.value / baseline.value * 100,
      changePct: (target.value - baseline.value) / baseline.value * 100 } : null;
  if (calculation && (!Number.isFinite(calculation.retainedPct) || !Number.isFinite(calculation.changePct))) {
    add('missing', 'The comparison exceeds the finite numerical range; comparison needs review.');
    evidence = 'insufficient';
    calculation = null;
  }
  const research = target.source === 'nasa-research-replay';
  const applicable = !research && evidence === 'supported' && target.phase === 'in-mission' && calculation !== null;
  const state = applicable ? (calculation!.retainedPct < 80 ? 'below' : 'at-or-above') : 'not-applicable';
  const finding = calculation
    ? `${calculation.changePct < 0 ? 'Measured decrease' : calculation.changePct > 0 ? 'Measured increase' : 'No measured change'}${calculation.changePct === 0 ? '' : ` of ${Math.abs(calculation.changePct).toFixed(1)}%`} from baseline; ${calculation.retainedPct.toFixed(1)}% retained.${state === 'below' ? ' Below the displayed reference.' : ''}`
    : 'Comparison needs review; the available evidence does not support a numerical comparison.';
  const followUp = [...new Set(issues.map(issue => issue.followUp))];
  if (calculation && calculation.changePct < 0) followUp.push(followUps.decline);
  return {
    assessmentId, source: target.source, finding, calculation, evidence, issues,
    reference: {
      label: 'NASA-STD-3001 V1 4003: in-mission aerobic capacity at or above 80% of pre-mission',
      thresholdPct: 80, state,
      note: research ? 'Analog research records receive no compliance determination; the NASA reference is context only.'
        : applicable ? 'Simulated crew reference comparison for demonstration only; this does not establish clinical clearance or satisfaction of task-specific EVA requirements.'
          : 'Reference comparison requires supported in-mission evidence against pre-mission capacity.',
    },
    limits: [
      'Evidence status describes comparability, separately from physiological change; this is not clinical adjudication.',
      'Absolute (L/min) and mass-normalised (mL/kg/min) capacity are calculated separately, with no unit conversion.',
      'The baseline arithmetic mean is an explicit demonstration assumption. Missing modality or protocol detail may limit interpretation even when a comparison method is documented.',
      'The reference does not establish task-specific EVA capability or change exercise prescriptions.',
    ], followUp,
  };
}

export function trend(records: Assessment[], subjectId: string): TrendPoint[] {
  return uniqueIds(records.filter(record => record.subjectId === subjectId && !record.duplicateOf && validDate(record.date)))
    .sort((a, b) => a.date!.localeCompare(b.date!) || a.id.localeCompare(b.id))
    .map(record => {
      const result = assess(records, record.id);
      return { assessmentId: record.id, date: record.date!, retainedPct: result.calculation?.retainedPct ?? null,
        evidence: result.evidence, isBaseline: record.isBaseline };
    });
}
