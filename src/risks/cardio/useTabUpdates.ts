import { useEffect, useState } from 'react';
import type { RiskEvaluationContext } from '../types';
import type { inputStore } from './support';
export function useTabUpdates<T extends { recordedAt: string }>(
  { crewId, vector }: RiskEvaluationContext,
  store: ReturnType<typeof inputStore<T>>,
) {
  const [, setRevision] = useState(0);
  useEffect(() => {
    const ctx = { crewId, vector };
    const update = () => setRevision((x) => x + 1);
    const offInput = store.subscribe(ctx, update),
      offVector = vector.subscribe(crewId, update);
    return () => {
      offInput();
      offVector();
    };
  }, [crewId, vector, store]);
}
