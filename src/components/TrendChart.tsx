import type { TrendPoint } from '../types';
import { number } from '../ui/presentation';

export default function TrendChart({ points, research = false }: { points: TrendPoint[]; research?: boolean }) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const start = Date.parse(sorted[0]?.date ?? '2026-01-01');
  const end = Date.parse(sorted[sorted.length - 1]?.date ?? '2026-01-02');
  const values = sorted.flatMap(point => point.retainedPct === null ? [] : [point.retainedPct]);
  const low = Math.min(60, ...values) - 5;
  const high = Math.max(110, ...values) + 5;
  const x = (date: string) => 55 + (Date.parse(date) - start) / (end - start || 1) * 580;
  const y = (value: number) => 205 - (value - low) / (high - low) * 170;
  return <div className="trend"><svg viewBox="0 0 690 290" role="img" aria-labelledby="trend-title trend-description">
    <title id="trend-title">Capacity retained over time</title><desc id="trend-description">Solid points are supported comparisons. Squares mark baseline records. Hollow points are not joined to the line. Unknown values appear in a separate unquantified row. Full values are in the timeline below.</desc>
    {[60, 80, 100].filter(value => value >= low && value <= high).map(value => <g key={value}><line x1="55" x2="635" y1={y(value)} y2={y(value)} className={value === 80 ? 'reference-line' : 'grid-line'} /><text x="43" y={y(value) + 4} textAnchor="end">{value}%</text></g>)}
    <text x="635" y={y(80) - 9} textAnchor="end">80% reference{research ? ' · context only' : ''}</text>
    {sorted.map((point, index) => {
      const previous = sorted[index - 1];
      return previous && previous.evidence === 'supported' && point.evidence === 'supported' && previous.retainedPct !== null && point.retainedPct !== null ? <line key={`line-${point.assessmentId}`} x1={x(previous.date)} x2={x(point.date)} y1={y(previous.retainedPct)} y2={y(point.retainedPct)} className="trend-line" /> : null;
    })}
    {sorted.map(point => <g key={point.assessmentId}><title>{point.date}: {point.retainedPct === null ? 'Unquantified' : `${number(point.retainedPct)}% retained`}; {point.evidence}{point.isBaseline ? '; baseline record' : ''}</title>{point.isBaseline ? <rect className="chart-point" x={x(point.date) - 5} y={y(point.retainedPct ?? 100) - 5} width="10" height="10" /> : <circle cx={x(point.date)} cy={point.retainedPct === null ? 242 : y(point.retainedPct)} r="6" className={`chart-point ${point.evidence !== 'supported' ? 'hollow' : ''}`} />}</g>)}
    {sorted.some(point => point.retainedPct === null) && <text x="55" y="230">Unquantified · evidence needs review</text>}
    <text x="55" y="275">{sorted[0]?.date}</text><text x="635" y="275" textAnchor="end">{sorted[sorted.length - 1]?.date}</text>
  </svg><p className="chart-legend">● Supported &nbsp; □ Baseline record &nbsp; ○ Evidence needs review</p><p className="subtle">NASA's 80% reference applies to in-mission capacity relative to pre-mission capacity.{research && ' This analog research replay receives no reference determination.'} Gaps are not interpolated across unsupported records.</p></div>;
}
