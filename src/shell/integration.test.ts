import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { riskTabs, tabStatus } from './registry';
import { demoTime, vector } from './vector';
import { demoInput } from '../risks/food/model';
import { saveFood } from '../risks/food/store';
import { immuneSample, saveImmune } from '../risks/immune/model';

describe('real vector shell integration', () => {
  it('renders all implemented descriptors for each simulated crew', () => {
    for (const crewId of ['SIM-CDR', 'SIM-PLT', 'SIM-MS1']) {
      for (const tab of Object.values(riskTabs)) {
        const html = renderToStaticMarkup(createElement(tab.Component, { crewId, vector }));
        expect(html).not.toContain('Crew registration needed');
        expect(html).toContain('Simulated');
      }
    }
  });
  it('connects the existing Food and Immune fixture actions through one vector', () => {
    const context = { crewId: 'SIM-CDR', vector };
    expect(vector.getVector(context.crewId)?.exposures.asOf).toBe(demoTime);
    saveImmune(context, immuneSample());
    expect(riskTabs.immune!.evaluate(context).value).toBe(60);
    let notifications = 0;
    const unsubscribe = vector.subscribe(context.crewId, () => notifications++);
    saveFood(context, demoInput());
    const evaluation = riskTabs.immune!.evaluate(context);
    expect(evaluation.value).toBe(80);
    expect(evaluation.reasons.map((reason) => reason.signal)).toEqual([
      'traits.allergies',
      'food.allergensEaten',
    ]);
    expect(tabStatus('immune', context).text).toBe('80 %');
    expect(vector.getExposures(context.crewId, 24)?.recentFoods?.[0].foodName).toBe('Shrimp rice');
    expect(notifications).toBe(1);
    unsubscribe();
    expect(tabStatus('immune', { crewId: 'SIM-PLT', vector }).text).toBe('No data');
  });
  it('shows planned and failed evaluations without invented values', () => {
    expect(tabStatus('sans', { crewId: 'SIM-CDR', vector }).text).toBe('Planned');
    expect(tabStatus('immune', { crewId: 'unregistered', vector }).text).toBe('No data');
  });
});
