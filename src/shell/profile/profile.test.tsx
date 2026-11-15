import document from '../../../docs/battleplan.md?raw';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AnyRiskSignalRecord, RiskEvaluation } from '../../risks/types';
import { createVector } from '../../vector/store';
import CrewProfile from './CrewProfile';
import Connections from './Connections';
import { signalCatalogue, signalLinks } from './links';
import { readConnections } from './model';

const time = '2026-11-14T11:00:00.000Z';
const fixtureSection = document
  .split('**Immune worked example, complete payloads:**')[1]
  .split('The fixture states')[0];
const fixture = [...fixtureSection.matchAll(/```json\s*([\s\S]*?)```/g)].map(
  (match) => JSON.parse(match[1]) as AnyRiskSignalRecord,
);
const fresh = () => createVector({ clock: () => Date.parse(time) });

describe('crew profile catalogue', () => {
  it('matches every signal and its exact documented consumers', () => {
    const section = document
      .split('## Signal catalogue')[1]
      .split('Specific derived-signal gates:')[0];
    const rows = section
      .split('\n')
      .filter((line) =>
        /^\| (cardio|sleep|immune|bone|balance|microbiome|sans|food|mood) \|/.test(line),
      )
      .map((line) => {
        const cells = line.split('|').map((cell) => cell.trim());
        return { producer: cells[1], signal: cells[2], unit: cells[4], consumedBy: cells[7] };
      });
    expect(signalCatalogue).toEqual(rows);
  });
  it('includes the four required cross-tab relationships', () => {
    for (const [signal, consumer] of [
      ['food.allergensEaten', 'immune'],
      ['sleep.sleepDebtHours', 'mood'],
      ['food.calciumMg', 'bone'],
      ['food.sodiumMg', 'sans'],
    ]) {
      expect(signalLinks).toContainEqual(expect.objectContaining({ signal, consumer }));
    }
    expect(signalLinks.some((link) => link.producer === link.consumer)).toBe(false);
  });
});

describe('crew profile vector reads', () => {
  it('renders missing values honestly and distinguishes reviewed traits', () => {
    const vector = fresh();
    const html = renderToStaticMarkup(<CrewProfile crewId="SIM-MS1" vector={vector} />);
    expect(html).toContain('Not recorded');
    const unknownTraits = createVector({
      clock: () => Date.parse(time),
      registrations: [
        {
          crewId: 'SIM-UNKNOWN',
          source: 'simulated-crew',
          simulated: true,
          comparisonGroupId: 'demo',
          baselines: { entries: [] },
          traits: {
            allergies: null,
            chronotype: null,
            geneticFlags: null,
            motionSicknessHistory: null,
          },
        },
      ],
    });
    expect(
      renderToStaticMarkup(<CrewProfile crewId="SIM-UNKNOWN" vector={unknownTraits} />),
    ).toContain('Not collected');
    expect(html).toContain('Simulated crew');
    expect(html).not.toContain('data-active="true"');
    const commander = renderToStaticMarkup(<CrewProfile crewId="SIM-CDR" vector={vector} />);
    expect(commander).toContain('None declared');
    expect(commander).toContain('shellfish');
  });
  it('marks current signals active without implying a changed result', () => {
    const vector = fresh();
    fixture.forEach(vector.emitSignals);
    const links = readConnections(vector, 'SIM-CDR');
    expect(links.find((link) => link.signal === 'food.allergensEaten')).toMatchObject({
      active: true,
      value: 'shellfish 3 h ago',
      reason: null,
    });
    expect(links.find((link) => link.signal === 'food.sodiumMg')).toMatchObject({
      active: false,
      value: 'Not recorded',
    });
    expect(renderToStaticMarkup(<Connections crewId="SIM-CDR" connections={links} />)).toContain(
      'data-active="true"',
    );
    expect(readConnections(vector, 'SIM-PLT').every((link) => !link.active)).toBe(true);
  });
  it('highlights only the signal named by the applied personalisation reason', () => {
    const vector = fresh();
    fixture.forEach(vector.emitSignals);
    const base: RiskEvaluation = {
      risk: 'immune',
      crewId: 'SIM-CDR',
      kind: 'pattern-match',
      value: 60,
      unit: '%',
      label: 'Hives pattern',
      evidence: 'supported',
      simulated: true,
      escalation: null,
      reasons: [],
    };
    const personalisation = vector.personalise('immune', 'SIM-CDR', base);
    expect(personalisation.adjustedPct).toBe(80);
    const final = { ...base, value: personalisation.adjustedPct, reasons: personalisation.reasons };
    const links = readConnections(vector, 'SIM-CDR', { immune: final });
    expect(links.filter((link) => link.reason)).toHaveLength(1);
    expect(links.find((link) => link.reason)).toMatchObject({
      signal: 'food.allergensEaten',
      consumer: 'immune',
      reason: 'Matching allergen eaten within six hours',
    });
    expect(
      readConnections(vector, 'SIM-CDR', { immune: { ...final, value: null } }).some(
        (link) => link.reason,
      ),
    ).toBe(false);
  });
  it('preserves measured zero and reviewed empty arrays', () => {
    const vector = fresh();
    const food = structuredClone(fixture[0]);
    if (food.risk !== 'food') throw new Error('Food fixture missing');
    food.signals.allergensEaten = [];
    food.signals.sodiumMg = 0;
    vector.emitSignals(food);
    const links = readConnections(vector, 'SIM-CDR');
    expect(links.find((link) => link.signal === 'food.sodiumMg')).toMatchObject({
      active: true,
      value: '0 mg',
    });
    expect(links.find((link) => link.signal === 'food.allergensEaten')).toMatchObject({
      active: true,
      value: 'None recorded',
    });
  });
  it('expires signals against the vector clock', () => {
    let clock = Date.parse(time);
    const vector = createVector({ clock: () => clock });
    fixture.forEach(vector.emitSignals);
    clock += 86400000;
    expect(readConnections(vector, 'SIM-CDR').every((link) => !link.active)).toBe(true);
  });
});
