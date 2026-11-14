import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { riskTab as cardio } from './index';
import { riskTab as sleep } from '../sleep';
import { riskTab as immune } from '../immune';
import { riskTab as bone } from '../bone';
import { testVector } from './testVector';
import { emptyCardio, saveCardio } from './model';
import { saveSleep, sleepSample } from '../sleep/model';
import { immuneSample, saveImmune } from '../immune/model';
import { boneSample, saveBone } from '../bone/model';

for (const descriptor of [cardio, sleep, immune, bone]) {
  it(`${descriptor.title} evaluates the requested crew without emitting or defaulting identities`, () => {
    const v = testVector();
    const ctx = { crewId: 'SIM-CDR', vector: v.api };
    const evaluation = descriptor.evaluate(ctx);
    expect(evaluation).toMatchObject({
      risk: descriptor.id,
      crewId: 'SIM-CDR',
      value: null,
      simulated: true,
      evidence: 'insufficient',
    });
    expect(v.emitted).toHaveLength(0);
    expect(() => descriptor.evaluate({ ...ctx, crewId: 'missing' })).toThrow(
      'Crew registration required',
    );
    const html = renderToStaticMarkup(createElement(descriptor.Component, ctx));
    expect(html).toContain('Prototype · not for clinical use');
    expect(html).toContain('Simulated');
    expect(
      renderToStaticMarkup(createElement(descriptor.Component, { ...ctx, crewId: 'missing' })),
    ).toContain('Crew registration needed');
  });

  it(`${descriptor.title} renders the urgent contact action and removes scores`, () => {
    const v = testVector(),
      ctx = { crewId: 'SIM-CDR', vector: v.api };
    if (descriptor.id === 'cardio') {
      const n = emptyCardio(v.person.exposures.asOf);
      saveCardio(ctx, { ...n, flags: { ...n.flags, chest: true } });
    }
    if (descriptor.id === 'sleep') saveSleep(ctx, { ...sleepSample()[2], criticalTaskSleep: true });
    if (descriptor.id === 'immune') {
      const n = immuneSample();
      saveImmune(ctx, { ...n, flags: { ...n.flags, breathing: true } });
    }
    if (descriptor.id === 'bone') saveBone(ctx, { ...boneSample(), suddenPain: true });
    const html = renderToStaticMarkup(createElement(descriptor.Component, ctx));
    expect(html).toContain('Contact the flight surgeon now');
    expect(html).toContain('Request call');
    expect(html).not.toContain('class="risk-result"');
    expect(html).not.toContain('class="risk-match"');
    expect(v.calls()).toBe(0);
  });
}
