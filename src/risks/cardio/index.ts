import type { RiskTab } from '../types';
import CardioTab from './CardioTab';
import { evaluateCardio } from './model';
export const riskTab = {
  id: 'cardio',
  region: 'heart-lungs',
  title: 'Cardiovascular',
  Component: CardioTab,
  evaluate: evaluateCardio,
} satisfies RiskTab<'cardio'>;
