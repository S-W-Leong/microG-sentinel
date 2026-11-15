import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createVector } from '../../../vector/store';
import ResearchReplay from './ResearchReplay';
import MicrobiomeTab from '../MicrobiomeTab';
import { emptyInput, gutStore, saveMicrobiome } from '../model';

it('renders research identity, source and real skin values without crew actions', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  for (const value of [
    'NASA research replay',
    'OSD-574',
    'Research participant',
    'C001',
    'C004',
    'L-44',
    'R+1',
    'Deltoid skin',
    'Cutibacterium',
    '88.25 %',
    'Source evidence',
  ]) {
    expect(html).toContain(value);
  }
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save check-in');
  expect(html).not.toContain('Request PMC');
});

it('defaults to mounted crew check-in and leaves records and vector unchanged', () => {
  const now = '2026-11-14T11:00:00.000Z';
  const vector = createVector({ clock: () => Date.parse(now) });
  const ctx = { crewId: 'SIM-CDR', vector };
  saveMicrobiome(ctx, emptyInput(now));
  const before = JSON.stringify({
    history: gutStore.history(ctx),
    person: vector.getVector(ctx.crewId),
    signals: vector.getSignals('microbiome', ctx.crewId, 24),
  });
  const emit = vi.spyOn(vector, 'emitSignals');
  const html = renderToStaticMarkup(createElement(MicrobiomeTab, ctx));
  expect(html).toContain('aria-pressed="true">Crew check-in');
  expect(html).toContain('aria-pressed="false">NASA replay');
  expect(html).toContain('Daily check-in');
  expect(html).not.toContain('Microbiome research replay');
  renderToStaticMarkup(createElement(ResearchReplay));
  expect(emit).not.toHaveBeenCalled();
  expect(
    JSON.stringify({
      history: gutStore.history(ctx),
      person: vector.getVector(ctx.crewId),
      signals: vector.getSignals('microbiome', ctx.crewId, 24),
    }),
  ).toBe(before);
  emit.mockRestore();
});
