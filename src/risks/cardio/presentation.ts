import type { RiskEvaluation, RiskEvaluationContext, RiskId } from '../types';
const vectorScopes = new WeakMap<RiskEvaluationContext['vector'], number>();
let nextScope = 0;
export function scopeKey(ctx: RiskEvaluationContext) {
  let key = vectorScopes.get(ctx.vector);
  if (key === undefined) {
    key = ++nextScope;
    vectorScopes.set(ctx.vector, key);
  }
  return `${key}:${ctx.crewId}`;
}
export function urgentEvaluation(
  ctx: RiskEvaluationContext,
  risk: RiskId,
  label: string,
  unit: RiskEvaluation['unit'],
): RiskEvaluation {
  const person = ctx.vector.getVector(ctx.crewId);
  if (!person) throw new Error('Crew registration required');
  return {
    risk,
    crewId: ctx.crewId,
    kind: risk === 'immune' ? 'pattern-match' : 'change-vs-baseline',
    value: null,
    unit,
    label,
    reasons: [],
    evidence: 'insufficient',
    simulated: person.simulated,
    escalation: { level: 'urgent', trigger: 'red-flag', text: 'Serious symptom reported' },
  };
}
export function display(value: number | null | undefined, unit = '', signed = false, digits = 2) {
  return value === null || value === undefined
    ? 'Not recorded'
    : `${signed && value > 0 ? '+' : ''}${Number(value.toFixed(digits))}${unit ? ` ${unit}` : ''}`;
}
