import { useState } from 'react';
import AssessmentEntry from '../components/AssessmentEntry';
import AssessmentCard, { StatusBadge } from '../components/AssessmentCard';
import TrendChart from '../components/TrendChart';
import {
  getLatestResult,
  getRecord,
  getResults,
  getTrend,
  getReplayExamples,
  getActiveScope,
  setActiveScope,
  selectDemo,
} from '../ui/dataSource';
import { number } from '../ui/presentation';

export default function MyFitness() {
  const [selection, setSelection] = useState<{ subject: string; group: string } | null>(() =>
    getActiveScope().source === 'user-entered' ? getActiveScope() : null,
  );
  const entry = (
    <AssessmentEntry
      onSelect={(subject, group) => {
        setActiveScope(subject, group);
        setSelection({ subject, group });
      }}
    />
  );
  const latest = selection
    ? getLatestResult('user-entered', selection.subject, selection.group)
    : getLatestResult();
  const subject = latest && getRecord(latest.assessmentId)?.subjectId;
  if (!latest || !subject)
    return (
      <>
        <h1>My Fitness</h1>
        {entry}
        <p>Add a follow-up record to review a comparison.</p>
        <button
          onClick={() => {
            selectDemo();
            setSelection(null);
          }}
        >
          Return to simulated crew demo
        </button>
      </>
    );
  const record = getRecord(latest.assessmentId)!;
  return (
    <>
      {selection && (
        <button
          onClick={() => {
            selectDemo();
            setSelection(null);
          }}
        >
          Return to simulated crew demo
        </button>
      )}
      <div className="page-heading">
        <div className="eyebrow">SUPPORTING EVIDENCE / FORMAL VO₂ ASSESSMENTS</div>
        <h1>My Fitness</h1>
        <p>What changed, what supports the comparison, and what to review next.</p>
      </div>
      {entry}
      <AssessmentCard result={latest} />
      {selection && (
        <section className="panel">
          <h2>All session assessments</h2>
          {getResults()
            .filter((r) => r.source === 'user-entered')
            .map((r) => (
              <p key={r.assessmentId}>
                <a href={`#/understand/${r.assessmentId}`}>
                  {getRecord(r.assessmentId)?.subjectId} ·{' '}
                  {getRecord(r.assessmentId)?.comparisonGroupId} ·{' '}
                  {getRecord(r.assessmentId)?.date ?? 'Date unknown'} — {r.finding}
                </a>
              </p>
            ))}
        </section>
      )}
      <section className="panel">
        <div className="eyebrow">PERSONAL HISTORY</div>
        <h2>Capacity retained</h2>
        <p>
          {record.source === 'user-entered' ? 'User-entered' : 'Simulated crew'} · {subject} ·{' '}
          {record.metric} · {record.unit}
        </p>
        <TrendChart
          points={getTrend(
            subject,
            record.metric,
            record.unit,
            record.source,
            record.comparisonGroupId,
          )}
        />
        <h3>Assessment timeline</h3>
        <ol className="timeline">
          {getTrend(
            subject,
            record.metric,
            record.unit,
            record.source,
            record.comparisonGroupId,
          ).map((point) => {
            const result = getResults().find((item) => item.assessmentId === point.assessmentId);
            return (
              <li key={point.assessmentId}>
                <div>
                  <time>{point.date ?? 'Timeline date withheld'}</time>
                  <p>
                    {point.isBaseline ? 'Baseline record' : 'Assessment'} ·{' '}
                    {point.retainedPct === null
                      ? 'Comparison withheld'
                      : `${point.retainedPct.toFixed(1)}% retained`}
                  </p>
                  {result && <StatusBadge result={result} />}
                </div>
                {result ? (
                  <a href={`#/understand/${point.assessmentId}`}>
                    Review{' '}
                    <span className="sr-only">
                      assessment from {point.date ?? 'Timeline date withheld'}
                    </span>{' '}
                    →
                  </a>
                ) : (
                  <span className="subtle">
                    {number(getRecord(point.assessmentId)?.value)}{' '}
                    {getRecord(point.assessmentId)?.unit}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="panel">
        <h2>Research replay</h2>
        <p>
          Explore the NASA research replay: bed-rest research participants from MR080G. Research
          records receive no compliance determination.
        </p>
        <ul>
          {getReplayExamples().map((example) => (
            <li key={example.id}>
              <a href={`#/understand/${example.id}`}>{example.label} →</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
