import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createVector } from '../../../vector/store';
import { emptySans, sansStore, saveSans } from '../model';
import SansTab from '../SansTab';
import ResearchReplay from './ResearchReplay';

it('renders animal identity, units and provenance without crew controls', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  for (const text of [
    'NASA research replay',
    'Animal research',
    'OSD-679',
    'MT51',
    'Research animal',
    'Eye',
    'Visit',
    'Scan region',
    '0.219 mm',
    'Source evidence',
    'Not recorded',
  ]) {
    expect(html).toContain(text);
  }
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save check-in');
});

it('defaults to crew check-in and leaves saved records and vector signals unchanged', () => {
  const now = '2026-11-14T12:00:00.000Z';
  const vector = createVector({ clock: () => Date.parse(now) });
  const ctx = { crewId: 'SIM-PLT', vector };
  saveSans(ctx, emptySans(now));
  const before = structuredClone(sansStore.current(ctx));
  const signals = structuredClone(vector.getSignals('sans', ctx.crewId, 24));
  const emit = vi.spyOn(vector, 'emitSignals');
  const html = renderToStaticMarkup(createElement(SansTab, ctx));
  expect(html).toContain('aria-pressed="true">Crew check-in');
  expect(html).toContain('aria-pressed="false">NASA replay');
  expect(html).not.toContain('Eye research replay');
  renderToStaticMarkup(createElement(ResearchReplay));
  expect(sansStore.current(ctx)).toEqual(before);
  expect(vector.getSignals('sans', ctx.crewId, 24)).toEqual(signals);
  expect(emit).not.toHaveBeenCalled();
});
