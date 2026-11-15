import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import ResearchReplay from './ResearchReplay';
import ImmuneTab from '../ImmuneTab';
import { testVector } from '../../cardio/testVector';
import { evaluateImmune, immuneSample, immuneStore, saveImmune } from '../model';

it('renders serum results without a hives score, simulated label or crew save action', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  expect(html).toContain('C001');
  expect(html).toContain('IL-6');
  expect(html).toContain('pg/mL');
  expect(html).toContain('Source evidence');
  expect(html).not.toContain('Hives pattern');
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save check-in');
});

it('adds lab navigation without altering saved crew symptoms, hives evaluation or emissions', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveImmune(ctx, immuneSample());
  const history = immuneStore.history(ctx),
    evaluation = evaluateImmune(ctx),
    emitted = v.emitted.length;
  const html = renderToStaticMarkup(createElement(ImmuneTab, ctx));
  expect(html).toContain('NASA labs');
  expect(html).toContain('Crew check-in');
  expect(immuneStore.history(ctx)).toStrictEqual(history);
  expect(evaluateImmune(ctx)).toStrictEqual(evaluation);
  expect(v.emitted).toHaveLength(emitted);
});
