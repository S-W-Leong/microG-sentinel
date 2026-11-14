import { loadScenario } from './scenario';
import type { RiskTab } from '../types';
import SansTab from './SansTab';
import { evaluateSans } from './model';

export const riskTab = {
  id: 'sans',
  region: 'eyes',
  title: 'SANS',
  loadScenario,
  Component: SansTab,
  evaluate: evaluateSans,
} satisfies RiskTab<'sans'>;
