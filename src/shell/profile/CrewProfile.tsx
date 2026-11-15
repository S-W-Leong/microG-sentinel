import { missionDay as scenarioMissionDay } from '../../scenario/mission';
import { useEffect, useReducer } from 'react';
import type {
  BaselineMetric,
  ExposureScalars,
  RiskEvaluation,
  RiskId,
  RiskTabProps,
} from '../../risks/types';
import { riskTabs } from '../registry';
import { routeHref, titles } from '../routes';
import Connections from './Connections';
import { number, readConnections } from './model';
import './profile.css';

const roles: Record<string, string> = {
  'SIM-CDR': 'Commander',
  'SIM-PLT': 'Pilot',
  'SIM-MS1': 'Mission specialist',
};
const motion = [
  'None',
  'Occasional without interruption',
  'Recurrent with interruption',
  'Recurrent with vomiting',
];
const metrics: Record<BaselineMetric, string> = {
  hrAtWorkloadBpm: 'Workload HR',
  restingHrBpm: 'Resting HR',
  vo2PeakLPerMin: 'Absolute VO2peak',
  vo2PeakMlPerKgPerMin: 'Relative VO2peak',
  sleepHours: 'Sleep',
  bmdGPerCm2: 'Bone density',
  swayAreaEyesOpenDeg2: 'Eyes-open sway',
  swayAreaEyesClosedDeg2: 'Eyes-closed sway',
  nearVisionLines: 'Near vision',
  octThicknessUm: 'OCT thickness',
  bodyMassKg: 'Body mass',
  mood: 'Mood',
};
const exposures: { field: keyof ExposureScalars; label: string; unit: string; producer: RiskId }[] =
  [
    { field: 'sleepDebtHours', label: 'Sleep debt', unit: 'h', producer: 'sleep' },
    { field: 'exerciseLoadPct', label: 'Exercise load', unit: '% plan', producer: 'cardio' },
    { field: 'resistanceLoadPct', label: 'Resistance load', unit: '% plan', producer: 'bone' },
    { field: 'sodiumMg', label: 'Sodium', unit: 'mg', producer: 'food' },
    { field: 'calciumMg', label: 'Calcium', unit: 'mg', producer: 'food' },
    { field: 'vitaminDIu', label: 'Vitamin D', unit: 'IU', producer: 'food' },
    { field: 'fibreG', label: 'Fibre', unit: 'g', producer: 'food' },
    { field: 'energyPctOfNeed', label: 'Energy', unit: '% need', producer: 'food' },
    { field: 'bodyMassKg', label: 'Body mass', unit: 'kg', producer: 'food' },
    { field: 'cabinCo2MmHg', label: 'Cabin CO₂', unit: 'mmHg', producer: 'sans' },
    { field: 'daysInFlight', label: 'Days in flight', unit: 'days', producer: 'bone' },
  ];
function Chips({ values }: { values: string[] | null }) {
  return values === null ? (
    <span className="profile-muted">Not collected</span>
  ) : values.length === 0 ? (
    <span>None declared</span>
  ) : (
    <span className="profile-chips">
      {values.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </span>
  );
}
export default function CrewProfile({ crewId, vector }: RiskTabProps) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  useEffect(() => vector.subscribe(crewId, refresh), [crewId, vector]);
  const person = vector.getVector(crewId);
  const recent = vector.getExposures(crewId, 24);
  const evaluations: Partial<Record<RiskId, RiskEvaluation>> = {};
  const unavailable: string[] = [];
  if (person)
    for (const tab of Object.values(riskTabs)) {
      try {
        evaluations[tab.id] = tab.evaluate({ crewId, vector });
      } catch {
        unavailable.push(tab.title);
      }
    }
  const connections = readConnections(vector, crewId, evaluations);
  const traits = person?.traits;
  const clock = person?.exposures.asOf;
  const missionDay = recent?.daysInFlight ?? scenarioMissionDay;
  return (
    <article className="crew-profile">
      <header className="profile-header">
        <div>
          <p className="profile-eyebrow">Astronaut vector</p>
          <h1>Crew profile</h1>
          <p className="profile-identity">
            {roles[crewId] ?? 'Crew member'} <span className="profile-value">{crewId}</span>
          </p>
        </div>
        <div className="profile-clock">
          <span className="profile-tag">Simulated crew</span>
          <p>
            {missionDay == null ? (
              'Not recorded'
            ) : (
              <span className="profile-value">{number(missionDay)}</span>
            )}{' '}
            <span className="profile-muted">· Mission day</span>
          </p>
          {clock && (
            <time dateTime={clock}>
              {clock.slice(0, 10)} · {clock.slice(11, 16)} UTC
            </time>
          )}
        </div>
      </header>
      <section className="profile-section" aria-labelledby="traits-title">
        <h2 id="traits-title">Traits</h2>
        <dl className="profile-traits">
          <div>
            <dt>Allergies</dt>
            <dd>
              <Chips values={traits?.allergies ?? null} />
            </dd>
          </div>
          <div>
            <dt>Chronotype</dt>
            <dd className="profile-capital">{traits?.chronotype ?? 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Motion history</dt>
            <dd>
              {traits?.motionSicknessHistory == null ? (
                'Not recorded'
              ) : (
                <>
                  <span className="profile-value">{traits.motionSicknessHistory}/3</span> ·{' '}
                  {motion[traits.motionSicknessHistory]}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Genetic flags</dt>
            <dd>
              <Chips values={traits?.geneticFlags ?? null} />
              <small>Research context, not a prediction.</small>
            </dd>
          </div>
        </dl>
      </section>
      <Connections connections={connections} crewId={crewId} />
      {unavailable.length > 0 && (
        <p className="profile-muted">Evaluation unavailable: {unavailable.join(', ')}.</p>
      )}
      <section className="profile-section" aria-labelledby="exposures-title">
        <header className="profile-section-head">
          <h2 id="exposures-title">Recent exposures</h2>
          <span className="profile-value">24 h</span>
        </header>
        <div className="profile-exposures">
          {exposures.map(({ field, label, unit, producer }) => {
            const value = recent?.[field];
            const source = recent?.refs[field]?.risk ?? producer;
            return (
              <div className="profile-exposure" key={field}>
                <strong className={value == null ? 'profile-empty' : 'profile-value'}>
                  {value == null ? (
                    'Not recorded'
                  ) : (
                    <>
                      {number(value)} <small>{unit}</small>
                    </>
                  )}
                </strong>
                <span>{label}</span>
                <a href={routeHref('/risk/' + source, crewId)}>from {titles[source]}</a>
              </div>
            );
          })}
        </div>
        <div className="profile-meals">
          <h3>Meals</h3>
          <a href={routeHref('/risk/food', crewId)}>from Food</a>
          {recent?.recentFoods == null ? (
            <p>Not recorded</p>
          ) : recent.recentFoods.length === 0 ? (
            <p>None recorded</p>
          ) : (
            <ul>
              {recent.recentFoods.map((meal) => (
                <li key={meal.mealId + meal.eatenAt}>
                  <time dateTime={meal.eatenAt}>{meal.eatenAt.slice(11, 16)} UTC</time>
                  <span>{meal.foodName}</span>
                  {recent.allergensEaten === null ? (
                    <small>Allergens not recorded</small>
                  ) : (
                    <Chips
                      values={recent.allergensEaten
                        .filter(
                          (allergen) =>
                            allergen.mealId === meal.mealId && allergen.eatenAt === meal.eatenAt,
                        )
                        .map((allergen) => allergen.allergen)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="profile-section" aria-labelledby="baselines-title">
        <header className="profile-section-head">
          <h2 id="baselines-title">Personal baselines</h2>
          <span>Independent sessions</span>
        </header>
        <table className="profile-baselines">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Baseline</th>
              <th>Sessions</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {!person?.baselines.entries.length ? (
              <tr>
                <td colSpan={4}>Not recorded</td>
              </tr>
            ) : (
              person.baselines.entries.map((entry) => (
                <tr
                  key={[
                    entry.metric,
                    entry.comparisonGroupId,
                    entry.methodId,
                    entry.contextKey,
                  ].join(':')}
                >
                  <th scope="row">
                    {metrics[entry.metric]}
                    {entry.contextKey !== 'default' && (
                      <small>
                        {entry.contextKey.startsWith('[')
                          ? 'Stage-specific'
                          : entry.contextKey.startsWith('{')
                            ? 'Protocol-specific'
                            : entry.contextKey.replace(/-/g, ' ')}
                      </small>
                    )}
                  </th>
                  <td data-label="Baseline" className={entry.value === null ? '' : 'profile-value'}>
                    {entry.value === null
                      ? 'Not recorded'
                      : `${number(entry.value, 4)} ${entry.unit}`}
                  </td>
                  <td data-label="Sessions" className="profile-value">
                    {entry.count}
                  </td>
                  <td data-label="Evidence">
                    {entry.evidence === 'supported'
                      ? '✓ Supported'
                      : entry.evidence === 'conflicting'
                        ? '! Conflicting'
                        : '○ Insufficient'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <p className="profile-footnote">Personalisation weights are documented demo assumptions.</p>
    </article>
  );
}
