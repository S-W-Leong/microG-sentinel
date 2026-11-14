import {
  CAREER_LIMIT_MSV,
  CSA_SOURCE,
  NASA_SOURCE,
  formatValue,
  getRadiationDose,
  radiationSummary,
} from './model';
import './radiation.css';

export default function RadiationCard({ crewId }: { crewId: string }) {
  const dose = getRadiationDose(crewId);
  const summary = radiationSummary(dose);
  return (
    <article className="radiation-card" aria-labelledby="radiation-title">
      <header>
        <h2 id="radiation-title">Radiation</h2>
        <span className="radiation-tag">Simulated</span>
      </header>
      <p className="radiation-total">
        <strong>
          {formatValue(dose?.missionDoseMsv)}
          {dose?.missionDoseMsv != null && ' mSv'}
        </strong>
        {' · '}
        <span>
          {formatValue(summary.percentage)}
          {summary.percentage !== null && '%'}
        </span>
        {' of career limit'}
      </p>
      <p className="radiation-label">Mission to date</p>
      {summary.barPercentage !== null && (
        <div
          className="radiation-bar"
          role="meter"
          aria-label="Mission dose against career limit"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.barPercentage}
          aria-valuetext={`${formatValue(dose?.missionDoseMsv)} mSv; ${formatValue(summary.percentage)}% of ${CAREER_LIMIT_MSV} mSv career limit`}
        >
          <span style={{ width: `${summary.barPercentage}%` }} />
        </div>
      )}
      <p className="radiation-reference">
        <span>{CAREER_LIMIT_MSV} mSv</span> NASA career limit
      </p>
      <dl className="radiation-readings">
        <div>
          <dt>Today's rate</dt>
          <dd>
            {formatValue(dose?.dailyDoseMsv, 2)}
            {dose?.dailyDoseMsv != null && ' mSv/day'}
          </dd>
        </div>
        <div>
          <dt>Mission days</dt>
          <dd>{formatValue(dose?.missionDays)}</dd>
        </div>
      </dl>
      <p className="radiation-label">Demo assumption · ISS orbit</p>
      {summary.neutronDoseMsv !== null && (
        <div className="radiation-split" aria-hidden="true">
          <span style={{ width: `${summary.neutronPercentage}%` }} />
        </div>
      )}
      <p className="radiation-breakdown">
        <span>
          {formatValue(summary.neutronDoseMsv, 2)}
          {summary.neutronDoseMsv !== null && ' mSv'}
        </span>
        {' neutrons · '}
        <span>
          {formatValue(summary.neutronPercentage)}
          {summary.neutronPercentage !== null && '%'}
        </span>
      </p>
      <p className="radiation-breakdown">
        <span>
          {formatValue(summary.otherDoseMsv, 2)}
          {summary.otherDoseMsv !== null && ' mSv'}
        </span>
        {' other radiation today'}
      </p>
      <a className="radiation-source" href={CSA_SOURCE} target="_blank" rel="noreferrer">
        CANS detector (CSA)
      </a>
      {summary.raiseAtPmc && (
        <p className="radiation-notice">
          <span aria-hidden="true">⚑</span> Raise at your next PMC
        </p>
      )}
      <details>
        <summary>Details</summary>
        <p>Dose values are simulated for this prototype.</p>
        <p>The career limit is a programme limit, not a personal prediction.</p>
        <p>This mission dose is not a full career total; prior missions are not included.</p>
        <p>The neutron split is a demo assumption, not a live CANS reading.</p>
        <ul>
          <li>
            <a href={NASA_SOURCE} target="_blank" rel="noreferrer">
              NASA radiation protection
            </a>
          </li>
          <li>
            <a href={CSA_SOURCE} target="_blank" rel="noreferrer">
              CSA neutron monitoring
            </a>
          </li>
        </ul>
      </details>
    </article>
  );
}
