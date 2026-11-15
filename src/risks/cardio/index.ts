import type { RiskTab } from '../types';
import CardioTab from './CardioTab';
import { evaluateCardio } from './model';
import { loadScenario } from './scenario';
export const riskTab = {
  id: 'cardio',
  region: 'heart-lungs',
  title: 'Cardiovascular',
  Component: CardioTab,
  evaluate: evaluateCardio,
  loadScenario,
} satisfies RiskTab<'cardio'>;
