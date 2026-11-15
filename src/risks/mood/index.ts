import { loadScenario } from './scenario';
import type { RiskTab } from '../types';
import MoodTab from './MoodTab';
import { evaluateMood } from './model';

export const riskTab = {
  id: 'mood',
  region: 'head',
  title: 'Mood',
  loadScenario,
  Component: MoodTab,
  evaluate: evaluateMood,
} satisfies RiskTab<'mood'>;
