import { useState } from 'react';
import { ArrowRight, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import type { ExerciseWorkspace } from '../../exercise/store';
import { getPreparedReview, opportunityTime } from '../../ui/exercisePresentation';

type Props = {
  workspace: ExerciseWorkspace;
  onPrepare: () => void;
  onResponse: (text: string) => void;
  onDownload: (text: string, extension: string) => void;
};

export default function ExerciseReview({ workspace: w, onPrepare, onResponse, onDownload }: Props) {
  const [response, setResponse] = useState('');
  const review = getPreparedReview(w);
  return (
    <section className="review-workspace" id="exercise-review" aria-labelledby="review-heading">
      <div className="section-heading">
        <div>
          <h2 id="review-heading" tabIndex={-1}>
            Review observations
          </h2>
        </div>
        <button className={review ? 'button secondary' : 'button'} onClick={onPrepare}>
          {review ? 'Update review' : 'Prepare review'} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
      {review ? (
        <>
          <div className="review-meta">
            <span className="simulation-badge">Prepared locally</span>
            <time dateTime={review.preparedAt}>{opportunityTime(review.preparedAt)}</time>
          </div>
          <p>Prepared locally. No transmission or receipt is claimed.</p>
          {!review.current && (
            <p className="notice" role="status">
              <WarningCircle size={20} aria-hidden="true" />
              Evidence has changed. Update the review before recording a response. Downloads still
              contain the last prepared snapshot.
            </p>
          )}
          <details className="review-preview" open>
            <summary>Readable review preview</summary>
            <pre>{review.text}</pre>
          </details>
          <div className="actions">
            <button onClick={() => onDownload(review.text, 'txt')}>
              <DownloadSimple size={17} aria-hidden="true" />
              Download review text
            </button>
            <button onClick={() => onDownload(review.json, 'json')}>
              <DownloadSimple size={17} aria-hidden="true" />
              Download review JSON
            </button>
          </div>
          <details className="response-entry">
            <summary>Record a human review response</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onResponse(response);
              }}
            >
              <label htmlFor="human-response">Human review response</label>
              <textarea
                id="human-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Record a response you have actually received."
                rows={3}
                required
              />
              <button type="submit" disabled={!review.current || !response.trim()}>
                Record human response
              </button>
            </form>
          </details>
        </>
      ) : (
        <p className="subtle">
          Prepare a readable, source-labelled snapshot of the observations, baseline and unresolved
          questions. Review preparation stays on this device.
        </p>
      )}
      {w.responses.length > 0 && (
        <div className="recorded-responses">
          <h3 className="instrument-label">Recorded responses</h3>
          {w.responses.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      )}
    </section>
  );
}
