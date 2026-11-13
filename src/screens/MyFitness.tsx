import AssessmentCard, { StatusBadge } from '../components/AssessmentCard';
import TrendChart from '../components/TrendChart';
import { getLatestResult, getRecord, getResults, getTrend } from '../ui/dataSource';
import { number } from '../ui/presentation';

export default function MyFitness() {
  const latest = getLatestResult();
  const subject = latest && getRecord(latest.assessmentId)?.subjectId;
  if (!latest || !subject) return <h1>No crew assessments available</h1>;
  return <><div className="page-heading"><div className="eyebrow">HEART AND LUNGS / 02</div><h1>My Fitness</h1><p>What changed, what supports the comparison, and what to review next.</p></div><AssessmentCard result={latest} /><section className="panel"><div className="eyebrow">PERSONAL HISTORY</div><h2>Capacity retained</h2><p>Simulated crew · {subject} · VO2peak · mL/kg/min</p><TrendChart points={getTrend(subject)} /><h3>Assessment timeline</h3><ol className="timeline">{getTrend(subject).map(point => {
    const result = getResults().find(item => item.assessmentId === point.assessmentId);
    return <li key={point.assessmentId}><div><time>{point.date}</time><p>{point.isBaseline ? 'Baseline record' : 'Assessment'} · {point.retainedPct === null ? 'Comparison withheld' : `${number(point.retainedPct)}% retained`}</p>{result && <StatusBadge result={result} />}</div>{result ? <a href={`#/understand/${point.assessmentId}`}>Review <span className="sr-only">assessment from {point.date}</span> →</a> : <span className="subtle">{number(getRecord(point.assessmentId)?.value)} {getRecord(point.assessmentId)?.unit}</span>}</li>;
  })}</ol></section></>;
}
