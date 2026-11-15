import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { testVector } from '../../cardio/testVector';
import MoodTab from '../MoodTab';
import { emptyMood, moodStore, saveMood } from '../model';
import ResearchReplay from './ResearchReplay';

it('renders source values with research identity and no crew actions', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  expect(html).toContain('NASA research replay');
  expect(html).toContain('AD ASTRA');
  expect(html).toContain('Research participant');
  expect(html).toContain('2013-02-06');
  expect(html).toContain('CSV row 2');
  expect(html).toContain('scale anchors are not supplied');
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('<button');
  expect(html).not.toContain('<form');
});

it('defaults to crew check-in and leaves stored observations and signals unchanged', () => {
  const vector = testVector();
  const ctx = { crewId: 'SIM-CDR', vector: vector.api };
  saveMood(ctx, { ...emptyMood(vector.person.exposures.asOf), mood: 7 });
  const before = moodStore.history(ctx);
  const emitted = structuredClone(vector.emitted);
  const html = renderToStaticMarkup(createElement(MoodTab, ctx));
  expect(html).toContain('Crew check-in');
  expect(html).toContain('NASA replay');
  expect(html).toContain('aria-label="Mood tab"');
  expect(html).not.toContain('aria-label="NASA mood research replay"');
  renderToStaticMarkup(createElement(ResearchReplay));
  expect(moodStore.history(ctx)).toEqual(before);
  expect(vector.emitted).toEqual(emitted);
});
