import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import ResearchReplay from './ResearchReplay';
import SleepTab from '../SleepTab';
import { testVector } from '../../cardio/testVector';
import { saveSleep, sleepSample, sleepStore } from '../model';

it('renders real research identity and source separately from simulated crew', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  expect(html).toContain('C1G0001');
  expect(html).toContain('Bed-rest research');
  expect(html).toContain('2004-09-09');
  expect(html).toContain('Source evidence');
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save check-in');
});

it('adds access to replay without modifying the selected crew observations or signals', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveSleep(ctx, sleepSample()[2]);
  const before = sleepStore.current(ctx),
    emitted = v.emitted.length;
  const html = renderToStaticMarkup(createElement(SleepTab, ctx));
  expect(html).toContain('NASA replay');
  expect(html).toContain('Crew check-in');
  expect(sleepStore.current(ctx)).toStrictEqual(before);
  expect(v.emitted).toHaveLength(emitted);
});
