import { cloneElement, isValidElement, useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { RiskEvaluation, RiskEvaluationContext, RiskId, RiskTabProps } from '../types';
import { display } from './presentation';
import { makePmcPacket, queuePmcPacket } from './pmc';
import './tabs.css';

const sourceLabels = {
  'simulated-crew': 'Simulated crew',
  'nasa-research-replay': 'Research participant',
  'user-entered': 'User entry',
};

export function Registered({ children, ...ctx }: RiskTabProps & { children: ReactNode }) {
  if (!ctx.vector.getVector(ctx.crewId))
    return (
      <section className="risk-tab">
        <h1>Crew registration needed</h1>
        <p>Select a registered person.</p>
        <footer>Prototype · not for clinical use</footer>
      </section>
    );
  return children;
}
export function DownloadButton({
  value,
  name = 'microg-review',
}: {
  value: unknown;
  name?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${name}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      Download packet
    </button>
  );
}
export function TabFrame({
  ctx,
  title,
  evaluation,
  raw,
  children,
}: {
  ctx: RiskEvaluationContext;
  title: string;
  evaluation: RiskEvaluation;
  raw: unknown;
  children: ReactNode;
}) {
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [packet, setPacket] = useState<unknown>(null);
  const [request, setRequest] = useState<'urgent' | 'next-pmc' | null>(null);
  const [queueNotice, setQueueNotice] = useState('');
  function prepare(level: 'urgent' | 'next-pmc') {
    const next = makePmcPacket(ctx, evaluation, raw, level);
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* Keep the session queue available. */
    }
    setQueueNotice(queuePmcPacket(next, storage).notice);
    setPacket(next);
    setRequest(level);
  }
  return (
    <section className="risk-tab" aria-label={`${title} tab`}>
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Crew observations</span>
          <h1>{title}</h1>
        </div>
        <span className="risk-id">{ctx.crewId}</span>
      </header>
      <div className="risk-badges">
        <span>{sourceLabels[person.source]}</span>
        {person.simulated && <strong>Simulated</strong>}
      </div>
      {evaluation.escalation && (
        <aside className="risk-alert" role="alert">
          <strong>
            ⚑{' '}
            {evaluation.escalation.level === 'urgent'
              ? 'Contact the flight surgeon now'
              : 'Raise at your next PMC'}
          </strong>
          <p>{evaluation.escalation.text}</p>
          <button
            type="button"
            className="risk-primary"
            onClick={() => prepare(evaluation.escalation!.level)}
          >
            {evaluation.escalation.level === 'urgent' ? 'Request call' : 'Add to PMC'}
          </button>
        </aside>
      )}
      {evaluation.escalation?.level !== 'urgent' && (
        <div className="risk-result" aria-live="polite">
          <span>{evaluation.label}</span>
          <strong>
            {evaluation.value === null
              ? evaluation.evidence === 'conflicting'
                ? 'Comparison unavailable'
                : evaluation.kind === 'pattern-match'
                  ? 'Pattern match unavailable'
                  : 'Baseline needed'
              : display(
                  evaluation.value,
                  evaluation.unit,
                  evaluation.kind === 'change-vs-baseline' && evaluation.unit !== '%',
                )}
          </strong>
          <span>
            {evaluation.evidence === 'supported'
              ? '● Recorded comparison'
              : '○ Evidence incomplete'}
          </span>
          {evaluation.reasons.map((r, i) => (
            <p key={i}>
              {r.direction === 'up' ? '↑' : '↓'} because {r.text}
            </p>
          ))}
        </div>
      )}
      {children}
      <section className="risk-contact">
        <button type="button" onClick={() => prepare('next-pmc')}>
          Request PMC
        </button>
        <p>Packets are prepared locally for the mission medical channel.</p>
      </section>
      {request && (
        <section className="risk-packet" aria-label="Medical request packet">
          <h2>{request === 'urgent' ? 'Unscheduled PMC request' : 'Weekly PMC packet'}</h2>
          <p>
            {request === 'urgent'
              ? 'Request an unscheduled PMC through the flight director.'
              : 'Share this packet at your private medical conference.'}
          </p>
          <p>Prepared locally · not transmitted.</p>
          <p role="status">{queueNotice}</p>
          <DownloadButton value={packet} />
          <button type="button" onClick={() => setRequest(null)}>
            Close packet
          </button>
          <details>
            <summary>Packet preview</summary>
            <pre>{JSON.stringify(packet, null, 2)}</pre>
          </details>
        </section>
      )}
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="risk-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id: string }>, { id })
        : children}
    </div>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 'any',
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="Not recorded"
      />
    </Field>
  );
}
export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (s: string | null) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
      />
    </Field>
  );
}
export function TriState({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (b: boolean | null) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
      >
        <option value="">Unknown</option>
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    </Field>
  );
}
export function Rating({
  label,
  value,
  anchors,
  onChange,
}: {
  label: string;
  value: number | null;
  anchors: readonly string[];
  onChange: (n: number | null) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">Not recorded</option>
        {anchors.map((anchor, index) => (
          <option value={index} key={anchor}>
            {anchor}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function RedFlags<K extends string>({
  questions,
  flags,
  onChange,
}: {
  questions: Record<K, string>;
  flags: Record<K, boolean | null>;
  onChange: (f: Record<K, boolean | null>) => void;
}) {
  const id = useId();
  return (
    <fieldset className="risk-flags">
      <legend>Contact check</legend>
      {(Object.keys(questions) as K[]).map((key) => (
        <div key={key}>
          <label htmlFor={`${id}-${key}`}>{questions[key]}?</label>
          <select
            id={`${id}-${key}`}
            value={flags[key] === null ? '' : String(flags[key])}
            onChange={(e) =>
              onChange({
                ...flags,
                [key]: e.target.value === '' ? null : e.target.value === 'true',
              })
            }
          >
            <option value="">Unknown</option>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      ))}
    </fieldset>
  );
}
export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="risk-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
export function ContextLink({
  ctx,
  risk,
  children,
  at,
}: {
  ctx: RiskEvaluationContext;
  risk: RiskId;
  children: ReactNode;
  at?: string;
}) {
  // Shell integration can handle this event; the URL retains crew and observation context.
  const time = at ?? ctx.vector.getVector(ctx.crewId)?.exposures.asOf;
  return (
    <a
      href={`#/risk/${risk}?crewId=${encodeURIComponent(ctx.crewId)}&at=${encodeURIComponent(time ?? '')}`}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('microg:risk-navigation', {
            detail: { risk, crewId: ctx.crewId, recordedAt: time },
          }),
        )
      }
    >
      {children}
    </a>
  );
}
