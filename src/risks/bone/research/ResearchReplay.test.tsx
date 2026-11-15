import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import ResearchReplay from './ResearchReplay';
import BoneTab from '../BoneTab';
import { testVector } from '../../cardio/testVector';
import { boneSample, boneStore, saveBone } from '../model';

it('renders NASA measurements as bed-rest research with explicit source evidence', () => {
  const html = renderToStaticMarkup(createElement(ResearchReplay));
  expect(html).toContain('C3A-224');
  expect(html).toContain('g/cm²');
  expect(html).toContain('Source evidence');
  expect(html).not.toContain('Simulated');
  expect(html).not.toContain('Save observation');
});

it('adds a source switch without overwriting crew observations or emitting research signals', () => {
  const v = testVector(),
    ctx = { crewId: 'SIM-CDR', vector: v.api };
  saveBone(ctx, boneSample());
  const before = boneStore.history(ctx),
    emitted = v.emitted.length;
  const html = renderToStaticMarkup(createElement(BoneTab, ctx));
  expect(html).toContain('NASA replay');
  expect(html).toContain('Crew observations');
  expect(boneStore.history(ctx)).toStrictEqual(before);
  expect(v.emitted).toHaveLength(emitted);
});
