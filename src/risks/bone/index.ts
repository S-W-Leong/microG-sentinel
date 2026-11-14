import type { RiskTab } from '../types';
import BoneTab from './BoneTab';
import { evaluateBone } from './model';
export const riskTab = {
  id: 'bone',
  region: 'bones',
  title: 'Bone',
  Component: BoneTab,
  evaluate: evaluateBone,
} satisfies RiskTab<'bone'>;
