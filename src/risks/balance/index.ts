import type { RiskTab } from '../types';
import BalanceTab from './BalanceTab';
import { evaluateBalance } from './model';
export const riskTab = {
  id: 'balance',
  region: 'head',
  title: 'Balance',
  Component: BalanceTab,
  evaluate: evaluateBalance,
} satisfies RiskTab<'balance'>;
