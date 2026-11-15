import { loadScenario } from './scenario';
import type { RiskTab } from '../types';
import FoodTab from './FoodTab';
import { evaluateFood } from './store';

export const riskTab = {
  id: 'food',
  region: 'gut',
  title: 'Food',
  loadScenario,
  Component: FoodTab,
  evaluate: evaluateFood,
} satisfies RiskTab<'food'>;
