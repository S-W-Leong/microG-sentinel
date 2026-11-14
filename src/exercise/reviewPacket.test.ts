import { it, expect } from 'vitest';
import { renderExerciseReviewText } from './reviewPacket';
import { createExerciseStore } from './store';
it('exports a readable locally prepared summary without claiming transmission', () => {
  const s = createExerciseStore(null);
  const summary = renderExerciseReviewText(s.prepare());
  expect(summary).toContain('Prepared locally');
  expect(summary).toContain('100 W');
  expect(summary).toContain('Frozen baseline');
});
