import { loadScenario } from './scenario';
import type { RiskTab } from '../types';
import MicrobiomeTab from './MicrobiomeTab';
import { evaluateMicrobiome } from './model';

export const riskTab = {
  id: 'microbiome',
  region: 'gut',
  title: 'Microbiome',
  loadScenario,
  Component: MicrobiomeTab,
  evaluate: evaluateMicrobiome,
} satisfies RiskTab<'microbiome'>;
