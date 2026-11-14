import { it, expect } from 'vitest';
import { allRecords } from '../data';
import { assess } from '../logic/assess';
import { buildReviewCard } from './reviewCard';
it('preserves candidate baseline evidence when a comparison is blocked', () => {
  const r = assess(allRecords, 'SIM-FLIGHT-MISSING');
  const card = buildReviewCard(allRecords, r, 'test');
  expect(card.result.calculation).toBeNull();
  expect(card.baselineReview.candidateIds).toHaveLength(2);
  expect(card.records).toHaveLength(3);
});
