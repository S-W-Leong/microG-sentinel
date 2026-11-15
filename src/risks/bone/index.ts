import type { RiskTab } from '../types';
import BoneTab from './BoneTab';
import { evaluateBone } from './model';
import { loadScenario } from './scenario';
export const riskTab = {
  id: 'bone',
  region: 'bones',
  title: 'Bone',
  Component: BoneTab,
  evaluate: evaluateBone,
  loadScenario,
} satisfies RiskTab<'bone'>;
