import type { RiskTab } from '../types';
import SleepTab from './SleepTab';
import { evaluateSleep } from './model';
export const riskTab = {
  id: 'sleep',
  region: 'head',
  title: 'Sleep',
  Component: SleepTab,
  evaluate: evaluateSleep,
} satisfies RiskTab<'sleep'>;
