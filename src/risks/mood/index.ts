import type { RiskTab } from '../types';
import MoodTab from './MoodTab';
import { evaluateMood } from './model';

export const riskTab = {
  id: 'mood',
  region: 'head',
  title: 'Mood',
  Component: MoodTab,
  evaluate: evaluateMood,
} satisfies RiskTab<'mood'>;
