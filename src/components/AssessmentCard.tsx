import type { AssessmentResult } from '../types';
import { getRecord } from '../ui/dataSource';
import { number, status, sourceLabel } from '../ui/presentation';

export function StatusBadge({ result }: { result: AssessmentResult }) {
  const display = status(result);
  return (
    <span className={`status ${display.tone}`}>
      <span aria-hidden="true">{display.icon}</span> {display.label}
    </span>
  );
}
export default function AssessmentCard({ result }: { result: AssessmentResult }) {
  const record = getRecord(result.assessmentId);
  const calculation = result.calculation;
  return (
    <article className="panel assessment">
      <div className="eyebrow">
        {result.source === 'nasa-research-replay'
          ? 'NASA research participant · bed rest analog replay'
          : sourceLabel(result.source)}
      </div>
      <h2>
        {record?.date ?? 'Date unavailable'}{' '}
        <span className="subtle">/ {record?.metric ?? 'Metric unavailable'}</span>
      </h2>
      <p className="subtle">
        {record?.phase?.replace(/-/g, ' ') ?? 'Phase unavailable'} · {record?.subjectId}
      </p>
      <section>
        <h3>01 / Finding</h3>
        <p className="finding">{result.finding}</p>
      </section>
      <section>
        <h3>02 / Calculation</h3>
        {calculation ? (
          <>
            <div className="metrics">
              <div>
                <strong>{number(calculation.current)}</strong>
                <span>Current · {calculation.unit}</span>
              </div>
              <div>
                <strong>{number(calculation.baseline.value)}</strong>
                <span>Baseline · {calculation.baseline.unit}</span>
              </div>
              <div>
                <strong>
                  {calculation.retainedPct.toFixed(1)}
                  <small>%</small>
                </strong>
                <span>Capacity retained</span>
              </div>
            </div>
            <p className="subtle">
              Current ÷ baseline × 100 · change {calculation.changePct.toFixed(1)}%
            </p>
          </>
        ) : (
          <p>Calculation withheld. Missing or conflicting evidence is not treated as zero.</p>
        )}
      </section>
      <section>
        <h3>03 / Evidence status</h3>
        <StatusBadge result={result} />
        {result.issues.map((issue, index) => (
          <p key={index}>{issue.message}</p>
        ))}
      </section>
      <section>
        <h3>04 / Interpretation limits</h3>
        <p>{result.reference.label}.</p>
        <p>{result.reference.note}</p>
        <ul>
          {result.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>05 / Follow-up</h3>
        {result.followUp.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </section>
      <div className="actions">
        <a className="button" href={`#/understand/${result.assessmentId}`}>
          Understand this assessment <span aria-hidden="true">→</span>
        </a>
        <a href={`#/evidence/${result.assessmentId}`}>Evidence & follow-up</a>
      </div>
    </article>
  );
}
