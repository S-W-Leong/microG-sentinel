import { useEffect, useRef, useState } from 'react';
import { ArrowRight, DownloadSimple } from '@phosphor-icons/react';
import ValuesReportFields from '../components/ValuesReportFields';
import { getRecord, getRecords, getResult, saveUserRecord, setActiveScope } from '../ui/dataSource';
import { buildReviewCard } from '../ui/reviewCard';
import {
  createValuesDraft,
  explainPersonalResult,
  parseGuidedReport,
  type ReportDraft,
  type ValuesDraft,
} from '../ui/personalValues';
import '../walkthrough.css';
import '../values.css';

// Personal drafts have the same tab-memory lifetime as user-entered assessments.
let sessionDraft: ValuesDraft | undefined;
const steps = [
  { id: 'baseline', label: 'Your baseline' },
  { id: 'later', label: 'Your later result' },
  { id: 'compare', label: 'Understand the change' },
] as const;
type Step = (typeof steps)[number]['id'];

export default function GuidedValues() {
  const [draft, setDraft] = useState(() => {
    const saved = sessionDraft ?? createValuesDraft(crypto.randomUUID());
    return {
      ...saved,
      baselineSaved: saved.baselineSaved && !!getRecord(saved.baselineId),
      laterSaved: saved.laterSaved && !!getRecord(saved.laterId),
    };
  });
  const [error, setError] = useState('');
  const alert = useRef<HTMLParagraphElement>(null);
  const route = window.location.hash.split('/')[2];
  const step: Step = route === 'later' || route === 'compare' ? route : 'baseline';
  const stepIndex = steps.findIndex((item) => item.id === step);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  function update(next: ValuesDraft) {
    sessionDraft = next;
    setDraft(next);
    setError('');
  }
  function navigate(next: Step) {
    setError('');
    window.location.hash = `/fitness/${next}`;
  }
  function changeReport(role: 'baseline' | 'later', field: keyof ReportDraft, value: string) {
    update({
      ...draft,
      [role]: { ...draft[role], [field]: value },
      ...(role === 'baseline'
        ? { baselineSaved: false, laterSaved: false }
        : { laterSaved: false, laterStarted: true }),
      laterChecked: false,
    });
  }
  function save(role: 'baseline' | 'later') {
    const parsed = parseGuidedReport(draft, role);
    if (!parsed.record) {
      setError(parsed.error);
      return;
    }
    try {
      saveUserRecord(parsed.record);
      setActiveScope(parsed.record.subjectId, draft.seriesId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save this report.');
      return;
    }
    if (role === 'baseline') {
      const { metric, unit, method, modality, protocol } = draft.baseline;
      update({
        ...draft,
        baselineSaved: true,
        laterSaved: false,
        laterChecked: false,
        later: draft.laterStarted
          ? draft.later
          : { ...draft.later, metric, unit, method, modality, protocol },
      });
      navigate('later');
    } else {
      update({ ...draft, laterSaved: true });
      navigate('compare');
    }
  }
  const result = draft.baselineSaved && draft.laterSaved ? getResult(draft.laterId) : undefined;
  const explanation = result ? explainPersonalResult(result) : null;
  const baseline = getRecord(draft.baselineId);
  const later = getRecord(draft.laterId);
  const blocked = (step === 'later' && !draft.baselineSaved) || (step === 'compare' && !result);
  const title =
    step === 'baseline'
      ? 'Start with your earlier result.'
      : step === 'later'
        ? 'Add your later result.'
        : 'Here’s what your comparison means.';
  function download(extension: 'txt' | 'json') {
    if (!result || !explanation) return;
    const text =
      extension === 'json'
        ? JSON.stringify(buildReviewCard(getRecords(), result, new Date().toISOString()), null, 2)
        : [
            'MicroG Sentinel — My values comparison',
            'User-entered reports; not independently verified.',
            `Baseline: ${baseline?.date} · ${baseline?.value} ${baseline?.unit} · ${baseline?.metric}`,
            `Later: ${later?.date} · ${later?.value} ${later?.unit} · ${later?.metric}`,
            explanation.headline,
            explanation.meaning,
            ...result.issues.map((issue) => issue.message),
            'A measured difference does not explain its cause or establish a diagnosis, clinical clearance or mission determination.',
          ].join('\n\n');
    const url = URL.createObjectURL(
      new Blob([text], { type: extension === 'json' ? 'application/json' : 'text/plain' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `microg-my-values-comparison.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="step-workspace values-workspace">
      <div className="demo-topline">
        <span className="instrument-label">MY VALUES / EXISTING VO₂ REPORTS</span>
        <span className="values-memory">Tab memory only · export before refreshing</span>
      </div>
      <nav className="step-navigation values-navigation" aria-label="My values steps">
        <ol>
          {steps.map((item, i) => {
            const enabled =
              item.id === 'baseline' || (item.id === 'later' ? draft.baselineSaved : !!result);
            return (
              <li key={item.id}>
                {enabled ? (
                  <a
                    href={`#/fitness/${item.id}`}
                    aria-current={step === item.id ? 'step' : undefined}
                  >
                    <span className="step-number">{i + 1}</span>
                    {item.label}
                  </a>
                ) : (
                  <span className="locked-step" aria-disabled="true">
                    <span className="step-number">{i + 1}</span>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <section className="step-content" aria-labelledby="values-title" key={step}>
        <header className="step-heading">
          <span className="eyebrow">STEP {stepIndex + 1} OF 3</span>
          <h1 id="values-title">{title}</h1>
          {!blocked && step === 'baseline' && (
            <p>
              Your baseline is the starting value you’ll compare against. Copy it from your earlier
              test report; we’ll mark it as the baseline automatically.
            </p>
          )}
          {!blocked && step === 'later' && (
            <p>
              Copy the date and capacity from your later report. We’ve linked it to your baseline
              and copied the test details for you to check.
            </p>
          )}
        </header>
        {blocked ? (
          <div className="values-blocked">
            <h2>
              {step === 'later'
                ? 'Save a baseline first.'
                : 'Save both reports to see your comparison.'}
            </h2>
            <p>
              Personal entries stay in this tab only. If you refreshed, enter your reports again.
            </p>
            <button
              className="button"
              onClick={() => navigate(draft.baselineSaved ? 'later' : 'baseline')}
            >
              {draft.baselineSaved ? 'Enter your later result' : 'Enter your baseline'}{' '}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : step !== 'compare' ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save(step);
            }}
          >
            {step === 'later' && (
              <div className="baseline-recap">
                <div>
                  <span className="instrument-label">YOUR SAVED BASELINE</span>
                  <strong>
                    {baseline?.value} {baseline?.unit}{' '}
                    <small>
                      · {baseline?.metric} · {baseline?.date}
                    </small>
                  </strong>
                </div>
                <a href="#/fitness/baseline">Edit baseline</a>
              </div>
            )}
            {error && (
              <p className="notice" role="alert" tabIndex={-1} ref={alert}>
                {error}
              </p>
            )}
            <ValuesReportFields
              role={step}
              report={draft[step]}
              onChange={(field, value) => changeReport(step, field, value)}
            />
            {step === 'baseline' && (
              <details className="values-optional">
                <summary>Your label (optional)</summary>
                <label>
                  Participant identifier
                  <input
                    value={draft.subject}
                    onChange={(e) =>
                      update({
                        ...draft,
                        subject: e.target.value,
                        baselineSaved: false,
                        laterSaved: false,
                      })
                    }
                  />
                  <small>
                    “Me” is enough. You do not need to enter your name. Both reports use the same
                    label automatically.
                  </small>
                </label>
              </details>
            )}
            {step === 'later' && (
              <label className="report-check">
                <input
                  type="checkbox"
                  checked={draft.laterChecked}
                  onChange={(e) =>
                    update({ ...draft, laterChecked: e.target.checked, laterSaved: false })
                  }
                />
                <span>I checked the metric, units and method against my later report.</span>
              </label>
            )}
            <div className="step-footer">
              <a
                className="step-back"
                href={step === 'baseline' ? '#/exercise/read' : '#/fitness/baseline'}
              >
                {step === 'baseline' ? '← Guided demo' : '← Back to baseline'}
              </a>
              <button className="button" type="submit">
                {step === 'baseline' ? 'Save baseline & continue' : 'Save later result & compare'}{' '}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        ) : (
          result &&
          explanation && (
            <>
              <div
                className={`personal-result ${result.calculation ? '' : 'needs-review'}`}
                role="status"
              >
                <span className="instrument-label">
                  {result.calculation ? 'RECORDED CHANGE' : 'CHECK YOUR REPORTS'}
                </span>
                <h2>{explanation.headline}</h2>
                {result.calculation ? (
                  <>
                    <p>
                      {result.calculation.current} {result.calculation.unit} in your later report,
                      compared with {result.calculation.baseline.value}{' '}
                      {result.calculation.baseline.unit} at baseline.
                    </p>
                    <div className="relative-capacity">
                      <strong>
                        {result.calculation.retainedPct.toFixed(1)}
                        <small>%</small>
                      </strong>
                      <span>of your baseline capacity</span>
                    </div>
                    <p>{explanation.meaning}</p>
                  </>
                ) : (
                  <p>{explanation.meaning}</p>
                )}
              </div>
              <div className="personal-report-pair">
                <div>
                  <span className="instrument-label">BASELINE / {baseline?.date}</span>
                  <strong>
                    {baseline?.value} <small>{baseline?.unit || 'Units not listed'}</small>
                  </strong>
                  <p>
                    {baseline?.metric || 'Metric not listed'} ·{' '}
                    {baseline?.method || 'Method not listed'}
                  </p>
                  <a href="#/fitness/baseline">Edit baseline</a>
                </div>
                <div>
                  <span className="instrument-label">LATER / {later?.date}</span>
                  <strong>
                    {later?.value} <small>{later?.unit || 'Units not listed'}</small>
                  </strong>
                  <p>
                    {later?.metric || 'Metric not listed'} · {later?.method || 'Method not listed'}
                  </p>
                  <a href="#/fitness/later">Edit later result</a>
                </div>
              </div>
              {!result.calculation && (
                <section className="values-issues">
                  <h3>What to check</h3>
                  <ul>
                    {[
                      ...new Set(
                        result.issues
                          .filter(
                            (issue) => issue.code !== 'baseline' || result.issues.length === 1,
                          )
                          .map(
                            (issue) =>
                              ({
                                metric: 'Both reports need the same measure: VO2peak or VO2max.',
                                units:
                                  'Both reports need the same units. No unit conversion is performed.',
                                method:
                                  'Check that the test method, activity and protocol match and are documented.',
                                baseline:
                                  'The baseline must be positive and have matching report details.',
                                timing: 'Check the dates and mission or study phases.',
                                missing: 'Check the report for missing comparison information.',
                                identity:
                                  'Review participant labels and the original reports for conflicting identities.',
                                duplicate: 'Review linked representations of the same assessment.',
                                measurement:
                                  'Review the original reports for conflicting measurements.',
                              })[issue.code] ??
                              'Review the original reports for conflicting information.',
                          ),
                      ),
                    ].map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </section>
              )}
              {result.calculation && (
                <details className="values-calculation">
                  <summary>Show me the calculation</summary>
                  <ol>
                    <li>
                      Baseline is your starting point:{' '}
                      <strong>
                        {result.calculation.baseline.value} {result.calculation.baseline.unit}
                      </strong>
                      .
                    </li>
                    <li>
                      Later ÷ baseline × 100 = {result.calculation.current} ÷{' '}
                      {result.calculation.baseline.value} × 100 ={' '}
                      <strong>{result.calculation.retainedPct.toFixed(1)}% of baseline</strong>.
                    </li>
                    <li>
                      (Later − baseline) ÷ baseline × 100 ={' '}
                      <strong>{result.calculation.changePct.toFixed(1)}% change</strong>. A negative
                      number means lower; a positive number means higher.
                    </li>
                  </ol>
                </details>
              )}
              <p className="values-meaning-limit">
                {result.calculation
                  ? 'This describes the change between your recorded assessments. It does not explain the cause, diagnose a condition or provide clinical clearance.'
                  : 'A numerical change is withheld until the comparison evidence is complete and compatible. This app does not diagnose a condition or provide clinical clearance.'}{' '}
                Your entries have not been independently verified.
              </p>
              <div className="values-downloads">
                <button className="button" onClick={() => download('txt')}>
                  <DownloadSimple size={18} aria-hidden="true" />
                  Download my comparison
                </button>
                <button onClick={() => download('json')}>Download full review JSON</button>
              </div>
              <p className="values-memory">
                Download before refreshing or closing this tab. The export includes both reports and
                the comparison.
              </p>
              <div className="step-footer">
                <a className="step-back" href="#/fitness/later">
                  ← Back to later result
                </a>
                <a href={`#/evidence/${result.assessmentId}`}>
                  Evidence & follow-up <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
            </>
          )
        )}
      </section>
      <details className="walkthrough-tools">
        <summary>More assessment tools</summary>
        <p>
          <a href="#/fitness">Open the assessment dashboard and advanced entry form</a>
        </p>
      </details>
    </div>
  );
}
