import { ArrowRight, MinusCircle } from '@phosphor-icons/react';
import type { StageReading } from '../../ui/exercisePresentation';
import { explainReading } from '../../ui/readingExplanation';

export default function ReadingExplorer({
  rows,
  workload,
  onWorkloadChange,
}: {
  rows: readonly StageReading[];
  workload: number | null;
  onWorkloadChange: (workload: number | null) => void;
}) {
  const row = rows.find((r) => r.workloadW === workload) ?? rows[0];
  if (!row) return <p>No readings are available for this session.</p>;
  return (
    <div className="reading-explorer">
      <div className="workload-picker" role="group" aria-label="Choose a cycling effort">
        {rows.map((reading) => (
          <button
            key={reading.id}
            aria-pressed={reading.id === row.id}
            aria-controls="selected-reading"
            onClick={() => onWorkloadChange(reading.workloadW)}
          >
            <strong>{reading.workloadW ?? 'Unknown'} W</strong>
            <small>{reading.currentBpm === null ? 'Reading missing' : 'Reading available'}</small>
          </button>
        ))}
      </div>
      <section
        id="selected-reading"
        className="selected-reading"
        aria-label={`${row.workloadW ?? 'Unknown'} W readings`}
      >
        <div className="reading-pair">
          <div>
            <span className="instrument-label">Earlier sessions / baseline</span>
            <strong>
              {row.baselineMean === null ? 'Withheld' : Number(row.baselineMean.toFixed(1))}
              <small>{row.baselineMean === null ? '' : ' bpm'}</small>
            </strong>
            <p>
              {row.baselineRange
                ? `Recorded range: ${row.baselineRange.join('–')} bpm`
                : 'Matching test conditions are required.'}
            </p>
          </div>
          <ArrowRight className="reading-pair-arrow" size={26} aria-hidden="true" />
          <div>
            <span className="instrument-label">Latest session / {row.workloadW ?? '?'} W</span>
            <strong className={row.currentBpm === null ? 'text-accent' : ''}>
              {row.currentBpm === null ? (
                <>
                  <MinusCircle size={32} aria-hidden="true" /> Missing
                </>
              ) : (
                <>
                  {row.currentBpm}
                  <small> bpm</small>
                </>
              )}
            </strong>
            <p>
              {row.currentBpm === null
                ? 'A blank reading is not zero.'
                : 'Heart rate at the same cycling effort.'}
            </p>
          </div>
        </div>
        <div className="reading-takeaway" role="status" aria-live="polite" aria-atomic="true">
          <span className="instrument-label">What this means</span>
          <p>{explainReading(row)}</p>
          <small>
            {row.currentBpm === null
              ? 'In the next step, try adding a synthetic follow-up from a matching workout.'
              : 'This describes a measured difference. It does not tell us what caused it.'}
          </small>
        </div>
      </section>
      <details className="reading-glossary">
        <summary>Help with watts, bpm and baseline</summary>
        <dl>
          <div>
            <dt>W (watts)</dt>
            <dd>The bike’s workload. Compare readings at the same effort.</dd>
          </div>
          <div>
            <dt>bpm</dt>
            <dd>Heartbeats per minute, recorded during that cycling stage.</dd>
          </div>
          <div>
            <dt>Baseline</dt>
            <dd>
              The average from earlier matching sessions. The range shows the lowest and highest
              recorded values.
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
