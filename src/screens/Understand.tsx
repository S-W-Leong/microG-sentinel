import type { AssessmentResult } from '../types';
import AssessmentCard from '../components/AssessmentCard';
import TrendChart from '../components/TrendChart';
import { getRecord, getTrend } from '../ui/dataSource';
import { nasa, number } from '../ui/presentation';

export default function Understand({ result }: { result: AssessmentResult }) {
  const record = getRecord(result.assessmentId);
  const calculation = result.calculation;
  const paired = result.assessmentId.endsWith('-REL')
    ? result.assessmentId.replace(/-REL$/, '-ABS')
    : result.assessmentId.replace(/-ABS$/, '-REL');
  return (
    <div className="legacy-screen legacy-understand">
      <div className="page-heading">
        <div className="eyebrow">Assessment review</div>
        <h1>Understand my assessment</h1>
        <p>
          {result.source === 'nasa-research-replay'
            ? 'NASA research replay (bed rest analog) · research participant assessment.'
            : 'Trace the comparison from measurement to finding.'}
        </p>
      </div>
      {paired !== result.assessmentId && getRecord(paired) && (
        <p>
          <a href={`#/understand/${paired}`}>
            View recorded {getRecord(paired)?.unit} series (no conversion)
          </a>
        </p>
      )}
      <AssessmentCard result={result} />
      <div className="detail-grid">
        <section className="panel">
          <h2>Recorded measurements</h2>
          <dl className="facts">
            {Object.entries({
              Participant: record?.subjectId,
              Date: record?.date,
              Phase: record?.phase,
              Metric: record?.metric,
              Value:
                record?.value == null ? null : `${record.value} ${record.unit ?? '(unit missing)'}`,
              'Body mass': record?.bodyMassKg == null ? null : `${record.bodyMassKg} kg`,
              Method: record?.method,
              Modality: record?.modality,
              Protocol: record?.protocol,
            }).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value ?? 'Not recorded'}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel">
          <h2>Step-by-step calculation</h2>
          {calculation ? (
            <ol className="steps">
              <li>
                Use current {number(calculation.current)} {calculation.unit} and baseline{' '}
                {number(calculation.baseline.value)} {calculation.baseline.unit}.
              </li>
              <li>
                Capacity retained = current ÷ baseline × 100.
                <br />
                <strong>
                  {number(calculation.current)} ÷ {number(calculation.baseline.value)} × 100 ={' '}
                  {calculation.retainedPct.toFixed(1)}%
                </strong>
              </li>
              <li>
                Change = (current − baseline) ÷ baseline × 100.
                <br />
                <strong>
                  ({number(calculation.current)} − {number(calculation.baseline.value)}) ÷{' '}
                  {number(calculation.baseline.value)} × 100 = {calculation.changePct.toFixed(1)}%
                </strong>
              </li>
            </ol>
          ) : (
            <p>
              Calculation withheld. Resolve the evidence issues before selecting a denominator or
              interpreting a change.
            </p>
          )}
          <p>
            Absolute (L/min) and mass-normalized (mL/kg/min) capacity remain separate. Conversion
            requires the relevant body mass; none is inferred here.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>Baseline selection</h2>
        <p>{calculation?.baseline.rule ?? 'No baseline selected for this blocked comparison.'}</p>
        {calculation && (
          <ul>
            {calculation.baseline.recordIds.map((id) => {
              const baseline = getRecord(id);
              return (
                <li key={id}>
                  <strong>{id}</strong> · {baseline?.date ?? 'Date missing'} ·{' '}
                  {number(baseline?.value)} {baseline?.unit ?? 'Unit missing'} ·{' '}
                  {baseline?.method ?? 'Method missing'}
                </li>
              );
            })}
          </ul>
        )}
        <p>
          This selection rule is a demonstration assumption.{' '}
          <a href={nasa.measures}>NASA Standard Measures</a> supports consistent measurement across
          mission phases; it does not approve this baseline rule.
        </p>
      </section>
      {result.source === 'nasa-research-replay' && record && (
        <section className="panel">
          <h2>NASA research trajectory</h2>
          <p>
            MR080G bed-rest research · {record.subjectId} · {record.metric} · {record.unit}. Source
            conflicts remain unresolved; affected comparisons are withheld.
          </p>
          <TrendChart
            points={getTrend(
              record.subjectId,
              record.metric,
              record.unit,
              record.source,
              record.comparisonGroupId,
            )}
            research
          />
          <ul>
            {getTrend(
              record.subjectId,
              record.metric,
              record.unit,
              record.source,
              record.comparisonGroupId,
            ).map((point) => (
              <li key={point.assessmentId}>
                {point.date ?? 'Timeline date withheld'} ·{' '}
                {point.retainedPct === null
                  ? 'Comparison withheld'
                  : `${point.retainedPct.toFixed(1)}% retained`}{' '}
                {point.isBaseline ? (
                  '· baseline record'
                ) : (
                  <a href={`#/understand/${point.assessmentId}`}>Review assessment</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="actions">
        <a className="button" href={`#/evidence/${result.assessmentId}`}>
          View evidence & follow-up →
        </a>
        <a href="#/fitness">Back to My Fitness</a>
      </div>
    </div>
  );
}
