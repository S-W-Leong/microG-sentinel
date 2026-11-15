import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createVector } from '../../vector/store';
import type { Rating03 } from '../types';
import MoodTab from './MoodTab';
import {
  dailyHistory,
  emptyMood,
  evaluateMood,
  moodBaseline,
  moodSample,
  moodStore,
  phqBand,
  phqTotal,
  saveMood,
  sleepContext,
} from './model';

const now = '2026-11-14T11:00:00.000Z';
const context = () => ({
  crewId: 'SIM-CDR',
  vector: createVector({ clock: () => Date.parse(now) }),
});

it('saves the exact MoodSignals snapshot with unknown values intact', () => {
  const ctx = context();
  saveMood(ctx, emptyMood(now));
  expect(ctx.vector.getSignals('mood', ctx.crewId, 24)).toEqual({
    risk: 'mood',
    crewId: 'SIM-CDR',
    recordedAt: now,
    source: 'simulated-crew',
    simulated: true,
    signals: { mood: null, stress: null, workload: null, isolation: null, crewConflict: null },
  });
  expect(evaluateMood(ctx)).toMatchObject({
    value: null,
    evidence: 'insufficient',
    escalation: null,
  });
});

it('keeps sliders unset until explicitly changed and preserves measured zero', () => {
  const ctx = context();
  const html = renderToStaticMarkup(createElement(MoodTab, ctx));
  expect(html.match(/role="slider"/g)).toHaveLength(4);
  expect(html).not.toContain('aria-valuenow=');
  const input = { ...emptyMood(now), mood: 0, crewConflict: false };
  saveMood(ctx, input);
  expect(ctx.vector.getSignals('mood', ctx.crewId, 24)?.signals).toEqual({
    mood: 0,
    stress: null,
    workload: null,
    isolation: null,
    crewConflict: false,
  });
});

it.each([-1, 11, 1.5, NaN, Infinity])('rejects invalid slider value %s atomically', (mood) => {
  const ctx = context();
  expect(() => saveMood(ctx, { ...emptyMood(now), mood })).toThrow();
  expect(moodStore.history(ctx)).toEqual([]);
  expect(ctx.vector.getSignals('mood', ctx.crewId, 24)).toBeNull();
});

describe('PHQ-9 context', () => {
  it.each([
    [0, 'Minimal'],
    [4, 'Minimal'],
    [5, 'Mild'],
    [9, 'Mild'],
    [10, 'Moderate'],
    [14, 'Moderate'],
    [15, 'Moderately severe'],
    [19, 'Moderately severe'],
    [20, 'Severe'],
    [27, 'Severe'],
  ] as const)('maps %s to %s', (total, band) => expect(phqBand(total)).toBe(band));
  it('withholds incomplete totals, accepts zero, and flags ten for PMC', () => {
    expect(phqTotal(emptyMood(now).phq9)).toBeNull();
    expect(phqTotal(Array<Rating03>(9).fill(0))).toBe(0);
    const ctx = context();
    saveMood(ctx, {
      ...emptyMood(now),
      mood: 7,
      stress: 0,
      workload: 0,
      isolation: 0,
      crewConflict: false,
      phq9: [2, 2, 1, 1, 1, 1, 1, 1, 0],
    });
    expect(evaluateMood(ctx).escalation).toMatchObject({
      level: 'next-pmc',
      trigger: 'indicative-score',
    });
  });
  it.each([1, 2, 3] as const)('item nine = %s suppresses all competing content', (response) => {
    const ctx = context();
    moodSample(now).forEach((input) => saveMood(ctx, input));
    const input = {
      ...moodStore.current(ctx)!,
      recordedAt: now,
      phq9: Array<Rating03 | null>(9).fill(null),
    };
    input.phq9[8] = response;
    saveMood(ctx, input);
    const personalise = vi.spyOn(ctx.vector, 'personalise');
    expect(evaluateMood(ctx)).toMatchObject({
      value: null,
      reasons: [],
      escalation: { level: 'urgent' },
    });
    expect(personalise).not.toHaveBeenCalled();
    const html = renderToStaticMarkup(createElement(MoodTab, ctx));
    expect(html).toContain('Contact the flight surgeon now');
    expect(html).toContain('Request PMC');
    for (const hidden of [
      'Daily check-in',
      'Mood calendar',
      'Screener',
      '/10',
      '/27',
      'Sleep context',
      'vs your baseline',
    ])
      expect(html).not.toContain(hidden);
    expect(html.match(/<button/g)).toHaveLength(1);
  });
  it('direct self-harm flag overrides the screener and missing baseline', () => {
    const ctx = context();
    saveMood(ctx, { ...emptyMood(now), selfHarm: true });
    expect(evaluateMood(ctx)).toMatchObject({ value: null, escalation: { level: 'urgent' } });
  });
});

it('shows a five-point sample drop only with the defined personal window', () => {
  const ctx = context();
  const samples = moodSample(now);
  samples.forEach((input) => saveMood(ctx, input));
  const personalise = vi.spyOn(ctx.vector, 'personalise');
  expect(evaluateMood(ctx)).toMatchObject({
    value: -5,
    unit: 'score/10',
    evidence: 'supported',
    simulated: true,
  });
  expect(personalise).toHaveBeenCalledTimes(1);
  expect(moodBaseline(samples[13], samples)).toMatchObject({ value: 7, count: 7 });
  expect(moodBaseline({ ...samples[13], baselineStart: '' }, samples)).toBeNull();
  expect(moodBaseline(samples[13], samples.slice(0, 2))).toBeNull();
  expect(moodBaseline({ ...samples[13], baselineEnd: '2026-11-14' }, samples)).toBeNull();
  const html = renderToStaticMarkup(createElement(MoodTab, ctx));
  expect(html).toContain('↓ ');
  expect(html).toContain('mood-missing');
  expect(html).toContain('mood-workload');
});

it('uses the latest daily observation and never crosses crew/vector scopes', () => {
  const ctx = context();
  const samples = moodSample(now);
  samples.forEach((input) => saveMood(ctx, input));
  saveMood(ctx, { ...samples[13], recordedAt: now, mood: 4 });
  expect(dailyHistory(moodStore.history(ctx))).toHaveLength(14);
  expect(evaluateMood(ctx).value).toBe(-3);
  expect(evaluateMood({ ...ctx, crewId: 'SIM-PLT' }).value).toBeNull();
  expect(evaluateMood(context()).value).toBeNull();
  expect(() => evaluateMood({ ...ctx, crewId: 'unregistered' })).toThrow('Crew registration');
});

it('reads Sleep through the real vector without inventing absent context', () => {
  const ctx = context();
  expect(sleepContext(ctx)).toEqual({ debt: null, fatigue: null });
  ctx.vector.emitSignals({
    risk: 'sleep',
    crewId: ctx.crewId,
    recordedAt: now,
    source: 'simulated-crew',
    simulated: true,
    signals: {
      sleepHours: 6,
      sleepEfficiencyPct: null,
      sleepDebtHours: 6,
      sleepinessKarolinska: null,
      fatigueSamnPerelli: 5,
      bodyClockShiftHours: null,
    },
  });
  expect(sleepContext(ctx)).toEqual({ debt: 6, fatigue: 5 });
  expect(renderToStaticMarkup(createElement(MoodTab, ctx))).toContain('Sleep debt ');
});

it('preserves history when the vector rejects a record', () => {
  const ctx = context();
  vi.spyOn(ctx.vector, 'emitSignals').mockImplementation(() => {
    throw new Error('Rejected');
  });
  expect(() => saveMood(ctx, emptyMood(now))).toThrow('Rejected');
  expect(moodStore.history(ctx)).toEqual([]);
});
