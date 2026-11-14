import type { ExerciseWorkspace } from '../../exercise/store';
import { getObservationChanges } from '../../ui/exerciseWalkthrough';
import { explainReading } from '../../ui/readingExplanation';

export default function ObservationChanges({ workspace }: { workspace: ExerciseWorkspace }) {
  const { rows, hasFollowUp } = getObservationChanges(workspace);
  const originalMissing = rows.filter((row) => row.beforeBpm === null).length;
  const currentMissing = rows.filter((row) => row.currentBpm === null).length;
  return (
    <section className="observation-changes" aria-label="Before and after observations">
      <p className="change-context">
        {hasFollowUp
          ? 'A follow-up has been linked. Compare it with the original session below; the baseline stays the same.'
          : 'No follow-up has been linked yet. These are the original readings, with any missing values still visible.'}
      </p>
      <div className="change-summary">
        <div>
          <span className="instrument-label">Missing in original session</span>
          <strong>{originalMissing}</strong>
        </div>
        <div>
          <span className="instrument-label">Missing {hasFollowUp ? 'in follow-up' : 'now'}</span>
          <strong>{currentMissing}</strong>
        </div>
        <p>
          {hasFollowUp && currentMissing < originalMissing
            ? 'The missing reading is now available. More evidence helps explain what was recorded; it does not establish a diagnosis.'
            : 'Missing data and mismatched test conditions remain reasons to review the evidence.'}
        </p>
      </div>
      <div className="table-scroll">
        <table className="change-table">
          <caption className="sr-only">
            Original session and currently linked readings against baseline
          </caption>
          <thead>
            <tr>
              <th scope="col">Effort</th>
              <th scope="col">Baseline average</th>
              <th scope="col">Original session</th>
              <th scope="col">{hasFollowUp ? 'Follow-up' : 'Current session'}</th>
              <th scope="col">Compared with baseline</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.workloadW ?? 'Unknown'} W</th>
                <td data-label="Baseline">
                  {row.baselineMean === null
                    ? 'Withheld'
                    : `${Number(row.baselineMean.toFixed(1))} bpm`}
                </td>
                <td data-label="Original">
                  {row.beforeBpm === null ? 'Not recorded' : `${row.beforeBpm} bpm`}
                </td>
                <td
                  data-label={hasFollowUp ? 'Follow-up' : 'Current'}
                  className={row.currentBpm === null ? 'text-accent' : ''}
                >
                  {row.currentBpm === null ? 'Not recorded' : `${row.currentBpm} bpm`}
                </td>
                <td>{explainReading(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!hasFollowUp && (
        <a href="#/exercise/plan" className="text-button">
          Return to the follow-up step
        </a>
      )}
    </section>
  );
}
