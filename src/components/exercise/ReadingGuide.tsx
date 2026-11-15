import type { StageReading } from '../../ui/exercisePresentation';
import { explainReading } from '../../ui/readingExplanation';

export default function ReadingGuide({ rows }: { rows: readonly StageReading[] }) {
  return (
    <div className="reading-guide">
      <p>
        Compare heart rate at the <strong>same cycling effort</strong>. W means watts, the bike’s
        workload. bpm means beats per minute. Your baseline is the recorded range from earlier,
        matching sessions.
      </p>
      <div className="table-scroll">
        <table className="guided-values">
          <caption className="sr-only">Heart-rate readings and what each comparison means</caption>
          <thead>
            <tr>
              <th scope="col">Cycling effort</th>
              <th scope="col">Earlier readings</th>
              <th scope="col">Latest reading</th>
              <th scope="col">What this tells you</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.workloadW ?? 'Unknown'} W</th>
                <td>
                  {row.baselineRange ? `${row.baselineRange.join('–')} bpm` : 'Cannot compare'}
                  {row.baselineMean !== null && (
                    <small className="baseline-average">
                      Average {Number(row.baselineMean.toFixed(1))} bpm
                    </small>
                  )}
                </td>
                <td className={row.currentBpm === null ? 'text-accent' : ''}>
                  {row.currentBpm === null ? 'Not recorded' : `${row.currentBpm} bpm`}
                </td>
                <td>{explainReading(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="reading-limit">
        Higher or lower describes the reading, not whether your fitness is better or worse. This
        comparison alone cannot explain the cause of a change.
      </p>
    </div>
  );
}
