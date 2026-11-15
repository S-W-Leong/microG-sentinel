import type { RiskTab } from '../types';
import ImmuneTab from './ImmuneTab';
import { evaluateImmune } from './model';
import { loadScenario } from './scenario';
export const riskTab = {
  id: 'immune',
  region: 'skin',
  title: 'Immune',
  Component: ImmuneTab,
  evaluate: evaluateImmune,
  loadScenario,
} satisfies RiskTab<'immune'>;
