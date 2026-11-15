import type { RiskTab } from '../types';
import SleepTab from './SleepTab';
import { evaluateSleep } from './model';
import { loadScenario } from './scenario';
export const riskTab = {
  id: 'sleep',
  region: 'head',
  title: 'Sleep',
  Component: SleepTab,
  evaluate: evaluateSleep,
  loadScenario,
} satisfies RiskTab<'sleep'>;
