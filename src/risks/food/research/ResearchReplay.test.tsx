import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { VectorApi } from '../../types';
import FoodTab from '../FoodTab';
import { demoInput } from '../model';
import { getFoodState, saveFood } from '../store';
import ResearchReplay from './ResearchReplay';

it('renders NASA participants, selectors and provenance without crew controls', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  for (const text of [
    'NASA research replay',
    'C3C-7352',
    'C3C-7772',
    '2006-04-03',
    'Measure',
    'Visit',
    'Source evidence',
    '2,306.75 kcal',
    'NASA LSDA source',
  ]) {
    expect(html).toContain(text);
  }
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save check-in');
  expect(html).not.toContain('SIM-CDR');
});

it('keeps crew check-in as default and does not alter saved inputs or emit signals', () => {
  const emitSignals = vi.fn();
  const vector: VectorApi = {
    emitSignals,
    getVector: () => null,
    getExposures: () => null,
    getSignals: () => null,
    personalise: () => ({ adjustedPct: null, reasons: [] }),
    subscribe: () => () => {},
  };
  const ctx = { crewId: 'SIM-CDR', vector };
  saveFood(ctx, demoInput());
  const before = structuredClone(getFoodState(ctx));
  const emitted = emitSignals.mock.calls.length;
  const html = renderToStaticMarkup(createElement(FoodTab, ctx));
  expect(html).toContain('aria-pressed="true">Crew check-in');
  expect(html).toContain('aria-pressed="false">NASA replay');
  expect(html).toContain('Save check-in');
  expect(html).not.toContain('NASA dietary replay');
  renderToStaticMarkup(createElement(ResearchReplay));
  expect(getFoodState(ctx)).toEqual(before);
  expect(emitSignals).toHaveBeenCalledTimes(emitted);
});
