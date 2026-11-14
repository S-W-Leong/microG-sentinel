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

export const riskTabs: Partial<Record<RiskId, RiskTab>> = { cardio, sleep, immune, bone, food, sans, balance, microbiome, mood };
export function tabStatus(risk: RiskId, context: RiskEvaluationContext) {
  const tab = riskTabs[risk];
  if (!tab) return { text: 'Planned', evaluation: null };
  try {
    const evaluation = tab.evaluate(context);
    return {
      text:
        evaluation.value === null
          ? 'No data'
          : String(Math.round(evaluation.value * 10) / 10) + ' ' + evaluation.unit,
      evaluation,
    };
  } catch {
    return { text: 'No data', evaluation: null };
  }
}
