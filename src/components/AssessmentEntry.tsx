import { useState, useRef, useEffect } from 'react';
import { parseManualEntry } from '../logic/manualEntry';
import { getRecords, saveUserRecord, resetUserRecords } from '../ui/dataSource';

export default function AssessmentEntry({
  onSelect,
}: {
  onSelect: (subject: string, group: string) => void;
}) {
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState('');
  const user = getRecords().filter((r) => r.source === 'user-entered');
  return (
    <details className="panel assessment-entry">
      <summary>Enter an existing assessment</summary>
      <p>
        User-entered records stay in this tab only and clear on refresh. Export a review card to
        keep a copy. Transcribe an existing assessment; this app does not provide test instructions.
      </p>
      <form
        key={editing}
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          const { record, error: parseError } = parseManualEntry(
            f,
            editing || `USER-${crypto.randomUUID()}`,
          );
          if (!record) {
            setError(parseError);
            return;
          }
          try {
            saveUserRecord(record);
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Review the entry.');
            return;
          }
          onSelect(record.subjectId, record.comparisonGroupId!);
          setError('');
          setNotice('Assessment saved for this session.');
          setEditing('');
        }}
      >
        {error && (
          <p role="alert" tabIndex={-1} ref={errorSummary}>
            {error}
          </p>
        )}
        {(() => {
          const r = user.find((r) => r.id === editing);
          return (
            <>
              <label>
                Participant identifier{' '}
                <input name="subjectId" required defaultValue={r?.subjectId} />
              </label>{' '}
              <label>
                Assessment series (mission, study or personal set){' '}
                <input name="group" required defaultValue={r?.comparisonGroupId} />
              </label>{' '}
              <label>
                Date <input name="date" type="date" defaultValue={r?.date ?? ''} />
              </label>{' '}
              <label>
                Phase{' '}
                <select aria-label="Phase" name="phase" defaultValue={r?.phase ?? ''}>
                  <option value="">Unknown</option>
                  {[
                    'pre-mission',
                    'in-mission',
                    'post-mission',
                    'pre-bed-rest',
                    'bed-rest',
                    'post-bed-rest',
                    'recovery',
                    'not-applicable',
                  ].map((p) => (
                    <option key={p} value={p}>
                      {p === 'not-applicable' ? 'Not part of a mission or study' : p}
                    </option>
                  ))}
                </select>
              </label>{' '}
              <label>
                Metric{' '}
                <select aria-label="Metric" name="metric" defaultValue={r?.metric ?? ''}>
                  <option value="">Unknown</option>
                  <option>VO2peak</option>
                  <option>VO2max</option>
                </select>
              </label>{' '}
              <label>
                Capacity{' '}
                <input
                  name="value"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={r?.value ?? ''}
                />
              </label>{' '}
              <label>
                Units{' '}
                <select aria-label="Units" name="unit" defaultValue={r?.unit ?? ''}>
                  <option value="">Unknown</option>
                  <option>L/min</option>
                  <option>mL/kg/min</option>
                </select>
              </label>{' '}
              <label>
                Body mass (kg, optional){' '}
                <input
                  name="bodyMassKg"
                  type="number"
                  step="any"
                  defaultValue={r?.bodyMassKg ?? ''}
                />
              </label>{' '}
              <label>
                Documented method <input name="method" defaultValue={r?.method ?? ''} />
              </label>{' '}
              <label>
                Test modality <input name="modality" defaultValue={r?.modality ?? ''} />
              </label>{' '}
              <label>
                Protocol <input name="protocol" defaultValue={r?.protocol ?? ''} />
              </label>{' '}
              <label>
                Source notes <textarea name="notes" defaultValue={r?.sourceNotes.join('\n')} />
              </label>{' '}
              <label>
                <input name="baseline" type="checkbox" defaultChecked={r?.isBaseline} /> Baseline
                record
              </label>{' '}
              <label>
                Alternative representation of{' '}
                <select name="duplicate" defaultValue={r?.duplicateOf ?? ''}>
                  <option value="">Independent assessment</option>
                  {user
                    .filter((x) => !x.duplicateOf && x.id !== editing)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.subjectId} · {x.date ?? 'Date unknown'} · {x.value} {x.unit}
                      </option>
                    ))}
                </select>
              </label>
            </>
          );
        })()}
        <p>
          The baseline is the arithmetic mean of all matching baseline records in the same
          participant, source and series. Missing or invalid matching values block comparison; no
          units are converted.
        </p>
        <button className="button" type="submit">
          {editing ? 'Save correction' : 'Save assessment'}
        </button>
      </form>
      <p role="status">{notice}</p>
      {user.length > 0 && (
        <>
          <h3>Session records</h3>
          <ul>
            {user.map((r) => (
              <li key={r.id}>
                {r.subjectId} · {r.comparisonGroupId} · {r.date ?? 'Date unknown'} ·{' '}
                {r.value ?? 'Value unknown'} {r.unit}{' '}
                <button onClick={() => setEditing(r.id)}>Correct entry</button>{' '}
                <a href={`#/understand/${r.id}`}>Review</a>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              resetUserRecords();
              setEditing('');
              setNotice('Session entries cleared.');
            }}
          >
            Clear session entries
          </button>
        </>
      )}
    </details>
  );
}
