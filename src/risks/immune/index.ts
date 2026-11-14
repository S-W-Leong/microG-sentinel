import type { RiskTab } from '../types';
import ImmuneTab from './ImmuneTab';
import { evaluateImmune } from './model';
export const riskTab = {
  id: 'immune',
  region: 'skin',
  title: 'Immune',
  Component: ImmuneTab,
  evaluate: evaluateImmune,
} satisfies RiskTab<'immune'>;
