import { ArrowRight, CheckCircle, Circle, RadioButton, WarningCircle } from '@phosphor-icons/react';
import type { ExerciseWorkspace } from '../../exercise/store';
import type { ObservationPlan as Plan, SessionComparison } from '../../exercise/types';
import { opportunityTime } from '../../ui/exercisePresentation';

type Props = {
  workspace: ExerciseWorkspace;
  plan: Plan;
  comparison: SessionComparison;
  onAvailability: (id: string, available: boolean) => void;
  onAccept: () => void;
  onCapture: () => void;
  onReview: () => void;
};

export default function ObservationPlan({
  workspace: w,
  plan,
  comparison,
  onAvailability,
  onAccept,
  onCapture,
  onReview,
}: Props) {
  const selected = w.opportunities.filter((o) => plan.selectedIds.includes(o.id));
  const gap = comparison.gaps.find((g) => plan.coverage.some((c) => c.gapId === g.id));
  const segment = selected[0]?.segments.find(
    (s) => s.context.workloadW === gap?.requiredContext?.workloadW,
  );
  const accepted = w.acceptedRevision === w.revision;
  const title =
    plan.state === 'planned'
      ? 'Next useful observation'
      : plan.state === 'none-needed'
        ? 'Evidence ready for review'
        : plan.state === 'review'
          ? 'Review takes priority'
          : 'No matching opportunity';
  return (
    <aside className="observation-plan" aria-label="Adaptive observation planner">
      <p className="sr-only" role="status">
        {plan.state === 'planned'
          ? `Selected opportunity: ${selected.map((o) => opportunityTime(o.scheduledAt)).join(', ')}. ${plan.totalAdditionalCrewActions} modelled added actions.`
          : title}
      </p>
      <h2 id="observation-heading" tabIndex={-1}>
        {title}
      </h2>
      {plan.state === 'planned' ? (
        <>
          <div className="plan-workload">
            {segment?.context.workloadW ?? '—'}
            <span>W</span>
          </div>
          <p className="plan-segment">
            {segment?.context.durationSec
              ? `${segment.context.durationSec / 60} min`
              : 'Recorded duration'}{' '}
            · prescribed cycling segment
          </p>
          <p className="plan-intro">
            This fills the gap at the same cycling effort without changing the prescribed workout.
          </p>
          <p className="selected-workout">
            Suggested demo workout: {selected.map((o) => opportunityTime(o.scheduledAt)).join(', ')}
            .
          </p>
        </>
      ) : (
        <div className="plan-state">
          {plan.state === 'none-needed' ? <CheckCircle size={46} /> : <WarningCircle size={46} />}
          <h3>
            {plan.state === 'none-needed'
              ? 'No extra collection.'
              : plan.state === 'review'
                ? 'Prepare the evidence.'
                : 'The gap stays open.'}
          </h3>
          <p>
            {plan.state === 'none-needed'
              ? 'The current evidence needs no additional collection. Review the recorded changes and their comparison basis.'
              : plan.state === 'review'
                ? 'Reported symptoms or a review request bypass further collection planning. Prepare the available evidence for review.'
                : 'No available prescribed opportunity resolves every required gap. Prepare the available records for review.'}
          </p>
        </div>
      )}
      {plan.state !== 'review' && (
        <details className="opportunities" aria-label="Prescribed opportunities">
          <summary>Change the demo schedule (optional)</summary>
          <p className="subtle">
            Switch a workout off to mark it unavailable. The planner chooses again.
          </p>
          <h3 className="instrument-label">
            Prescribed opportunities <small>/ simulated</small>
          </h3>
          {w.opportunities.map((o, i) => {
            const chosen = plan.selectedIds.includes(o.id);
            const rejected = plan.rejected.find((r) => r.opportunityId === o.id);
            return (
              <div
                key={o.id}
                className={`opportunity ${chosen ? 'is-selected' : ''} ${!o.available ? 'is-unavailable' : ''}`}
              >
                <span
                  className="opportunity-marker"
                  aria-label={chosen ? 'Selected opportunity' : 'Alternative opportunity'}
                >
                  {chosen ? <RadioButton size={24} /> : <Circle size={24} />}
                </span>
                <div className="opportunity-copy">
                  <time dateTime={o.scheduledAt}>{opportunityTime(o.scheduledAt)}</time>
                  <span>
                    {o.additionalCrewActions} modelled added{' '}
                    {o.additionalCrewActions === 1 ? 'action' : 'actions'}
                  </span>
                </div>
                <label className="availability">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`Available: ${opportunityTime(o.scheduledAt)}`}
                    checked={o.available}
                    onChange={(e) => onAvailability(o.id, e.target.checked)}
                  />
                  <span>
                    Available<span className="sr-only"> opportunity {i + 1}</span>
                  </span>
                </label>
                {rejected && o.available && plan.state !== 'none-needed' && (
                  <p className="opportunity-reason">
                    {rejected.reasons.includes('Not needed by the minimum-action full cover')
                      ? 'Alternative · not needed for the selected plan.'
                      : rejected.reasons.join(' ')}
                  </p>
                )}
              </div>
            );
          })}
        </details>
      )}
      {plan.state === 'planned' && (
        <div className="plan-reason">
          <h3 className="instrument-label">Why this observation</h3>
          <p>
            Matching device and protocol. Covers the missing observation with the least modelled
            added effort.
          </p>
        </div>
      )}
      {plan.unmetGapIds.length > 0 && (
        <ul className="unmet-gaps">
          {[...new Set(comparison.gaps.flatMap((g) => g.reason.split('; ')))].map((reason) => (
            <li key={reason}>
              {reason.replace('protocolId', 'protocol').replace('deviceId', 'device')}
            </li>
          ))}
        </ul>
      )}
      <div className="plan-actions">
        {plan.state === 'planned' && (
          <p className="action-instruction">
            {accepted
              ? 'Plan selected. Generate a demo reading to open the before-and-after comparison. No measurement is taken.'
              : 'First, select the suggested plan. Then generate a demo reading. No workout or device is required.'}
          </p>
        )}
        {plan.state === 'planned' ? (
          accepted ? (
            <button className="button" onClick={onCapture}>
              Generate synthetic observation <ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button className="button" onClick={onAccept}>
              Use this observation plan <ArrowRight size={18} aria-hidden="true" />
            </button>
          )
        ) : (
          <button className="button" onClick={onReview}>
            Continue to review <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
        {plan.state === 'planned' && (
          <button className="text-button" onClick={onReview}>
            Skip collection and review
          </button>
        )}
      </div>
      {accepted && (
        <p className="plan-accepted" role="status">
          Plan accepted. The next action creates explicitly synthetic data.
        </p>
      )}
      {plan.state !== 'planned' && (
        <p className="subtle">You can continue to the review even when a reading is missing.</p>
      )}
      <p className="plan-footnote">
        Demonstration effort estimate. Uses an existing prescribed workout.
      </p>
      <details className="planner-policy">
        <summary>Planning basis</summary>
        <p>
          The planner covers required gaps, minimizing added actions first, then opportunities, then
          completion time. It never changes a workout or diagnoses a cause.
        </p>
        <p data-testid="selected-plan">
          Selected record: {plan.selectedIds.join(', ') || 'No collection selected'}
        </p>
        <p>{plan.reasons.join(' ')}</p>
      </details>
    </aside>
  );
}
