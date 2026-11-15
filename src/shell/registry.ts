import { riskTab as cardio } from '../risks/cardio';
import { riskTab as sleep } from '../risks/sleep';
import { riskTab as immune } from '../risks/immune';
import { riskTab as bone } from '../risks/bone';
import { riskTab as food } from '../risks/food';
import { riskTab as microbiome } from '../risks/microbiome';
import { riskTab as balance } from '../risks/balance';
import { riskTab as sans } from '../risks/sans';
import { riskTab as mood } from '../risks/mood';
import type { RiskId, RiskTab, RiskEvaluationContext } from '../risks/types';

export const riskTabs: Partial<Record<RiskId, RiskTab>> = {
  cardio,
  sleep,
  immune,
  bone,
  food,
  sans,
  balance,
  microbiome,
  mood,
};
// A change from baseline gets an explicit sign, so "-5" on a 0–10 scale is not read as a score.
export function formatValue(value: number, unit: string, kind: string) {
  const rounded = Math.round(value * 10) / 10;
  if (unit === 'ratio') return rounded + '×';
  const number =
    kind === 'change-vs-baseline'
      ? (rounded > 0 ? '+' : rounded < 0 ? '−' : '±') + Math.abs(rounded)
      : String(rounded);
  return number + ' ' + (unit === 'score/10' ? 'pts' : unit);
}

export function tabStatus(risk: RiskId, context: RiskEvaluationContext) {
  const tab = riskTabs[risk];
  if (!tab) return { text: 'Planned', evaluation: null };
  try {
    const evaluation = tab.evaluate(context);
    // Gut observations have no calibrated percentage; show their actual day count.
    const gutDays =
      risk === 'microbiome' && evaluation.escalation?.level !== 'urgent'
        ? context.vector.getSignals('microbiome', context.crewId, 24)?.signals.gutChangeDays
        : null;
    return {
      text:
        gutDays != null
          ? `${gutDays} changed days`
          : evaluation.value === null
            ? 'No data'
            : formatValue(evaluation.value, evaluation.unit, evaluation.kind),
      evaluation,
    };
  } catch {
    return { text: 'No data', evaluation: null };
  }
}
