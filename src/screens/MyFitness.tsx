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
      key={window.location.hash.endsWith('/entry') ? 'entry' : 'overview'}
      initiallyOpen={window.location.hash.endsWith('/entry')}
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
      <div className="legacy-screen legacy-fitness">
        <h1>My Fitness</h1>
        <section className="personal-walkthrough">
          <h2>Next: add your later result</h2>
          <p>
            Use the same participant identifier, assessment series, metric and units as your
            baseline. Update the date and capacity, then untick “Baseline record” and save.
          </p>
          <p className="subtle">
            A baseline alone has no later result to compare. Your entries stay in this tab until you
            refresh or close it.
          </p>
        </section>
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
      </div>
    );
  const record = getRecord(latest.assessmentId)!;
  return (
    <div className="legacy-screen legacy-fitness">
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
        <div className="eyebrow">My values · existing VO₂ test reports</div>
        <h1>My Fitness</h1>
        <p>Compare an earlier fitness assessment with a later one to understand the change.</p>
      </div>
      <section className="personal-walkthrough" aria-labelledby="personal-guide">
        <h2 id="personal-guide">How to use your own values</h2>
        <ol>
          <li>
            <strong>Have two existing test reports ready.</strong> Use the same metric and unit,
            such as VO2peak in L/min, measured with matching methods.
          </li>
          <li>
            <strong>Save your earlier result as the baseline.</strong> This is your starting point.
            Tick “Baseline record” in the form below.
          </li>
          <li>
            <strong>Save your later result.</strong> Use the same participant identifier and
            assessment series. Leave “Baseline record” unticked.
          </li>
          <li>
            <strong>Read your comparison, then export it.</strong> “Understand this assessment”
            explains the calculation. “Evidence & follow-up” lets you export your review card.
          </li>
        </ol>
        <p className="subtle">
          Your entries clear when you refresh or close this tab. Export before leaving. This form
          transcribes reports; it does not measure fitness.
        </p>
        {!selection && (
          <p className="demo-callout">
            <strong>You are viewing an example.</strong> The result below belongs to simulated crew.
            Enter your own reports to replace it with your comparison.
          </p>
        )}
      </section>
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
        <div className="eyebrow">Personal history</div>
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
    </div>
  );
}
