import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import RadiationCard from './RadiationCard';
import { careerPercentage, formatValue, getRadiationDose, radiationSummary } from './model';

describe('radiation dose display', () => {
  it('calculates percentage and rounds only for display', () => {
    expect(careerPercentage(64)).toBeCloseTo(10.6666667);
    expect(formatValue(careerPercentage(64))).toBe('11');
    expect(formatValue(0.635, 2)).toBe('0.64');
    expect(careerPercentage(0)).toBe(0);
    expect(formatValue(0)).toBe('0');
  });
  it('keeps absent and invalid readings missing', () => {
    for (const missing of [null, undefined, NaN, Infinity, -1]) {
      expect(careerPercentage(missing)).toBeNull();
      expect(formatValue(missing)).toBe('No data');
    }
    expect(getRadiationDose('unknown')).toBeNull();
    expect(getRadiationDose('toString')).toBeNull();
    expect(radiationSummary(null)).toEqual({
      percentage: null,
      barPercentage: null,
      raiseAtPmc: false,
      neutronPercentage: null,
      neutronDoseMsv: null,
      otherDoseMsv: null,
    });
  });
  it('selects independent crew fixtures', () => {
    expect(
      ['SIM-CDR', 'SIM-PLT', 'SIM-MS1'].map((crewId) => getRadiationDose(crewId)?.missionDoseMsv),
    ).toEqual([64, 60, 75]);
    expect(
      ['SIM-CDR', 'SIM-PLT', 'SIM-MS1'].map((crewId) => getRadiationDose(crewId)?.missionDays),
    ).toEqual([100, 100, 100]);
  });
  it('splits the assumed daily dose and preserves missing readings', () => {
    const dose = getRadiationDose('SIM-CDR')!;
    const summary = radiationSummary(dose);
    expect(summary.neutronDoseMsv).toBeCloseTo(0.192);
    expect(summary.otherDoseMsv).toBeCloseTo(0.448);
    expect(summary.neutronPercentage).toBe(30);
    expect(radiationSummary({ ...dose, dailyDoseMsv: null }).neutronDoseMsv).toBeNull();
    expect(radiationSummary({ ...dose, neutronShare: null }).otherDoseMsv).toBeNull();
    expect(radiationSummary({ ...dose, neutronShare: 1.1 }).neutronDoseMsv).toBeNull();
  });
  it('uses the exact threshold and caps only the visual bar', () => {
    const dose = getRadiationDose('SIM-CDR')!;
    expect(radiationSummary({ ...dose, missionDoseMsv: 479.9 }).raiseAtPmc).toBe(false);
    expect(radiationSummary({ ...dose, missionDoseMsv: 480 }).raiseAtPmc).toBe(true);
    expect(radiationSummary({ ...dose, missionDoseMsv: 720 })).toMatchObject({
      percentage: 120,
      barPercentage: 100,
      raiseAtPmc: true,
    });
  });
  it('renders simulation, collapsed disclosure and missing data', () => {
    const markup = renderToStaticMarkup(createElement(RadiationCard, { crewId: 'SIM-CDR' }));
    expect(markup).toContain('64');
    expect(markup).toContain('Simulated');
    expect(markup).toContain('<details>');
    expect(markup).toContain('not a personal prediction');
    expect(markup).not.toContain('Raise at your next PMC');
    const missing = renderToStaticMarkup(createElement(RadiationCard, { crewId: 'unknown' }));
    expect(missing).toContain('No data');
    expect(missing).not.toContain('role="meter"');
  });
});
