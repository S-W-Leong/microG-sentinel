import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { testVector } from '../../cardio/testVector';
import BalanceTab from '../BalanceTab';
import { balanceSample, balanceStore, saveBalance } from '../model';
import ResearchReplay from './ResearchReplay';

it('renders research identity, trial units and source discrepancy without crew actions', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  for (const text of [
    'NASA research replay',
    'BRSMFMT',
    'C1G0001',
    'Research participant',
    '32.96 s',
    'Source mismatch',
    'Source evidence',
    '25.29 s',
    '29.00 s',
  ]) {
    expect(html).toContain(text);
  }
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save check-in');
  expect(html).not.toContain('SIM-CDR');
});

it('defaults to mounted crew check-in and renders without saving or emitting', () => {
  const v = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveBalance(ctx, balanceSample());
  const before = balanceStore.current(ctx);
  const emitted = v.emitted.length;
  const html = renderToStaticMarkup(createElement(BalanceTab, ctx));
  expect(html).toContain('aria-pressed="true">Crew check-in');
  expect(html).toContain('aria-pressed="false">NASA replay');
  expect(html).toContain('Save check-in');
  expect(html).not.toContain('Functional mobility replay');
  renderToStaticMarkup(createElement(ResearchReplay));
  expect(balanceStore.current(ctx)).toStrictEqual(before);
  expect(v.emitted).toHaveLength(emitted);
});
