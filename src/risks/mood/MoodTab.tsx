import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { MoodSignals, Rating03, RiskTabProps } from '../types';
import {
  ContextLink,
  DownloadButton,
  Field,
  Registered,
  TextField,
  TriState,
} from '../cardio/TabUi';
import { scopeKey } from '../cardio/presentation';
import { useTabUpdates } from '../cardio/useTabUpdates';
import { makePmcPacket, queuePmcPacket, type PmcPacket } from '../cardio/pmc';
import {
  dailyHistory,
  emptyMood,
  evaluateMood,
  isUrgent,
  moodBaseline,
  moodSample,
  moodStore,
  phqBand,
  phqTotal,
  saveMood,
  sleepContext,
  type MoodInput,
} from './model';
import './mood.css';

const scales = [
  ['mood', 'Mood', 'Very low', 'Very good'],
  ['stress', 'Stress', 'None', 'Extreme'],
  ['workload', 'Workload', 'None', 'Extreme'],
  ['isolation', 'Isolation', 'None', 'Extreme'],
] as const;
const questions = [
  ['Interest', 'Little interest or pleasure in doing things'],
  ['Low mood', 'Feeling down, depressed, or hopeless'],
  ['Sleep', 'Trouble falling or staying asleep, or sleeping too much'],
  ['Energy', 'Feeling tired or having little energy'],
  ['Appetite', 'Poor appetite or overeating'],
  [
    'Self-worth',
    'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
  ],
  ['Concentration', 'Trouble concentrating on things, such as reading or watching television'],
  ['Movement', 'Moving or speaking noticeably slowly, or being unusually fidgety or restless'],
  [
    'Self-harm thoughts',
    'Thoughts that you would be better off dead or of hurting yourself in some way',
  ],
];
const rating = (value: number | null | undefined) =>
  value == null ? 'Not recorded' : value + '/10';
const conflict = (value: boolean | null) => (value === null ? 'Unknown' : value ? 'Yes' : 'No');

function Slider({
  label,
  value,
  low,
  high,
  onChange,
}: {
  label: string;
  value: number | null;
  low: string;
  high: string;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    onChange(
      Math.max(0, Math.min(10, Math.round(((event.clientX - bounds.left) / bounds.width) * 10))),
    );
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 2,
      PageDown: -2,
    };
    if (event.key === 'Home' || event.key === 'End' || event.key in steps) {
      event.preventDefault();
      onChange(
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? 10
            : value === null
              ? 0
              : Math.max(0, Math.min(10, value + steps[event.key])),
      );
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onChange(null);
    }
  }
  return (
    <div className="mood-scale">
      <div className="mood-scale-heading">
        <span id={id}>{label}</span>
        <output>{rating(value)}</output>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? undefined}
        aria-valuetext={
          value === null ? 'Not recorded; use arrow keys to set' : value + ' out of 10'
        }
        className="mood-slider"
        onKeyDown={key}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event);
        }}
        onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      >
        <span className="mood-track" />
        {value !== null && <span className="mood-thumb" style={{ left: value * 10 + '%' }} />}
      </div>
      <div className="mood-anchors">
        <span>0 · {low}</span>
        <span>10 · {high}</span>
      </div>
      {value !== null && (
        <button
          type="button"
          className="mood-clear"
          aria-label={'Clear ' + label}
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function Calendar({ history, now }: { history: MoodInput[]; now: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = new Date(now.slice(0, 10) + 'T00:00:00Z');
  const monday = current.getTime() - (((current.getUTCDay() + 6) % 7) + 21) * 86400000;
  const records = dailyHistory(history);
  const chosen = records.find((entry) => entry.recordedAt.slice(0, 10) === selected);
  return (
    <section aria-label="Mood calendar">
      <h2>Mood calendar</h2>
      <p>0–10 mood · bar: workload 0–10 · UTC</p>
      <div className="mood-calendar">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => (
          <span key={name} className="mood-weekday">
            {name}
          </span>
        ))}
        {Array.from({ length: 28 }, (_, index) => {
          const date = new Date(monday + index * 86400000).toISOString().slice(0, 10);
          const entry = records.find((record) => record.recordedAt.slice(0, 10) === date);
          const future = date > now.slice(0, 10);
          return (
            <button
              key={date}
              type="button"
              disabled={future}
              className={'mood-day' + (entry?.mood == null ? ' mood-missing' : '')}
              style={
                entry?.mood != null
                  ? ({
                      '--mood-fill': 'hsl(195 20% ' + (18 + entry.mood * 3) + '%)',
                    } as CSSProperties)
                  : undefined
              }
              aria-label={
                date +
                (future
                  ? ': Future'
                  : ': Mood ' +
                    rating(entry?.mood) +
                    ', workload ' +
                    rating(entry?.workload) +
                    ', conflict ' +
                    conflict(entry?.crewConflict ?? null))
              }
              onClick={() => setSelected(date)}
            >
              <small>{Number(date.slice(-2))}</small>
              <strong>{future ? '' : (entry?.mood ?? '—')}</strong>
              {entry?.workload != null && (
                <span className="mood-workload" style={{ width: entry.workload * 10 + '%' }} />
              )}
              {entry?.crewConflict && <span className="mood-conflict">! Conflict</span>}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mood-day-detail" role="status">
          <strong>{selected}</strong>
          {chosen ? (
            <>
              <p>
                Mood {rating(chosen.mood)} · stress {rating(chosen.stress)}
              </p>
              <p>
                Workload {rating(chosen.workload)} · isolation {rating(chosen.isolation)}
              </p>
              <p>Crew conflict: {conflict(chosen.crewConflict)}</p>
            </>
          ) : (
            <p>Not recorded</p>
          )}
        </div>
      )}
    </section>
  );
}

function MoodPanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, moodStore);
  const person = ctx.vector.getVector(ctx.crewId)!;
  const now = person.exposures.asOf;
  const [draft, setDraft] = useState(() => moodStore.current(ctx) ?? emptyMood(now));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [packet, setPacket] = useState<PmcPacket | null>(null);
  const [queueNotice, setQueueNotice] = useState('');
  const contactButton = useRef<HTMLButtonElement>(null);
  const saved = moodStore.current(ctx);
  const history = moodStore.history(ctx);
  const urgent = isUrgent(draft) || (saved !== null && isUrgent(saved));
  useEffect(() => {
    if (urgent) contactButton.current?.focus();
  }, [urgent]);
  const evaluation = evaluateMood(ctx, isUrgent(draft) ? draft : undefined);
  const total = phqTotal(draft.phq9);
  const baseline = saved ? moodBaseline(saved, history) : null;
  const sleep = sleepContext(ctx);
  function update(patch: Partial<MoodInput>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setNotice('');
    setPacket(null);
  }
  function requestPmc() {
    const next = makePmcPacket(
      ctx,
      evaluation,
      { saved, draft, history },
      urgent ? 'urgent' : 'next-pmc',
    );
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    setQueueNotice(queuePmcPacket(next, storage).notice);
    setPacket(next);
  }
  return (
    <section className="risk-tab mood-tab" aria-label="Mood tab">
      <header className="risk-heading">
        <h1>Mood</h1>
        <span className="risk-id">{ctx.crewId}</span>
      </header>
      <div className="risk-badges">
        <span>
          {person.source === 'nasa-research-replay'
            ? 'Research participant'
            : person.source === 'simulated-crew'
              ? 'Simulated crew'
              : 'User entry'}
        </span>
        {person.simulated && <strong>Simulated</strong>}
      </div>
      {urgent ? (
        <aside className="risk-alert" role="alert">
          <strong>Contact the flight surgeon now</strong>
          <button ref={contactButton} type="button" className="risk-primary" onClick={requestPmc}>
            Request PMC
          </button>
        </aside>
      ) : (
        <>
          {evaluation.escalation && (
            <aside className="risk-alert" role="alert">
              <strong>Raise at your next PMC</strong>
              <button type="button" onClick={requestPmc}>
                Request PMC
              </button>
            </aside>
          )}
          <div className="risk-result" aria-live="polite">
            <strong>
              Mood {rating(saved?.mood)} · workload {rating(saved?.workload)}
            </strong>
            {evaluation.value !== null && baseline && saved ? (
              <>
                <span>
                  {evaluation.value < 0 ? '↓ ' : evaluation.value > 0 ? '↑ ' : ''}
                  {Math.abs(Number(evaluation.value.toFixed(1)))} vs your baseline
                </span>
                <small>
                  {saved.baselineStart} – {saved.baselineEnd} · {baseline.count} days
                </small>
              </>
            ) : (
              <span>Baseline needed</span>
            )}
          </div>
          {(sleep.debt !== null || sleep.fatigue !== null) && (
            <p className="mood-context">
              {sleep.debt !== null && <>Sleep debt {sleep.debt} h</>}
              {sleep.debt !== null && sleep.fatigue !== null && ' · '}
              {sleep.fatigue !== null && <>Fatigue {sleep.fatigue}/7</>} · 24 h context
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                saveMood(ctx, draft);
                setError('');
                setNotice('Check-in saved');
              } catch (caught) {
                setError((caught as Error).message);
              }
            }}
          >
            <h2>Daily check-in</h2>
            <p>20 seconds · leave unknown values unset.</p>
            <div className="mood-scales">
              {scales.map(([key, label, low, high]) => (
                <Slider
                  key={key}
                  label={label}
                  low={low}
                  high={high}
                  value={draft[key]}
                  onChange={(value) => update({ [key]: value } as Partial<MoodSignals>)}
                />
              ))}
            </div>
            <TriState
              label="Crew conflict"
              value={draft.crewConflict}
              onChange={(crewConflict) => update({ crewConflict })}
            />
            <TriState
              label="Thoughts of self-harm?"
              value={draft.selfHarm}
              onChange={(selfHarm) => update({ selfHarm })}
            />
            <details>
              <summary>Screener</summary>
              <p>PHQ-9 · over the last two weeks, how often were you bothered by each item?</p>
              {questions.map(([label, text], index) => (
                <div key={label} className="mood-question">
                  <p>
                    {index + 1}. {text}
                  </p>
                  <Field label={label}>
                    <select
                      value={draft.phq9[index] ?? ''}
                      onChange={(event) =>
                        update({
                          phq9: draft.phq9.map((value, item) =>
                            item === index
                              ? event.target.value === ''
                                ? null
                                : (Number(event.target.value) as Rating03)
                              : value,
                          ),
                        })
                      }
                    >
                      <option value="">Not recorded</option>
                      <option value="0">0 · Not at all</option>
                      <option value="1">1 · Several days</option>
                      <option value="2">2 · More than half the days</option>
                      <option value="3">3 · Nearly every day</option>
                    </select>
                  </Field>
                </div>
              ))}
              <p aria-live="polite">
                {total === null
                  ? 'Complete all nine items for a total.'
                  : total + '/27 · ' + phqBand(total) + ' · screening context'}
              </p>
              {total !== null && total >= 10 && <p>Raise at your next PMC</p>}
              <p>
                Screening context, not a diagnosis; POMS is a separate mood-profile measure, not
                calculated here.
              </p>
            </details>
            <details>
              <summary>Time & baseline</summary>
              <TextField
                label="Recorded UTC"
                value={draft.recordedAt}
                onChange={(value) => update({ recordedAt: value ?? '' })}
              />
              <Field label="Baseline start">
                <input
                  type="date"
                  value={draft.baselineStart}
                  onChange={(event) => update({ baselineStart: event.target.value })}
                />
              </Field>
              <Field label="Baseline end">
                <input
                  type="date"
                  value={draft.baselineEnd}
                  onChange={(event) => update({ baselineEnd: event.target.value })}
                />
              </Field>
              <p>
                Mean of at least three prior recorded days in your chosen window; latest check-in
                per UTC day.
              </p>
            </details>
            <div className="risk-actions">
              <button className="risk-primary" type="submit">
                Save
              </button>
              {ctx.crewId === 'SIM-CDR' &&
                person.simulated &&
                person.source === 'simulated-crew' && (
                  <button
                    type="button"
                    disabled={history.length > 0}
                    onClick={() => {
                      try {
                        const samples = moodSample(now);
                        samples.forEach((input) => saveMood(ctx, input));
                        setDraft({ ...samples[samples.length - 1], recordedAt: now });
                        setNotice('Simulated · 14 check-ins loaded');
                        setError('');
                      } catch (caught) {
                        setError((caught as Error).message);
                      }
                    }}
                  >
                    Load sample
                  </button>
                )}
            </div>
          </form>
          {error && (
            <p role="alert" className="risk-error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <Calendar history={history} now={now} />
          <details>
            <summary>History</summary>
            <p>Session-local observations; refreshing clears check-ins.</p>
            {dailyHistory(history).map((entry) => (
              <p key={entry.recordedAt}>
                {entry.recordedAt.slice(0, 10)} · mood {rating(entry.mood)} · workload{' '}
                {rating(entry.workload)}
              </p>
            ))}
          </details>
          <div className="risk-links">
            <ContextLink ctx={ctx} risk="sleep">
              Sleep context
            </ContextLink>
            <ContextLink ctx={ctx} risk="food">
              Food log
            </ContextLink>
          </div>
          {!evaluation.escalation && (
            <button type="button" onClick={requestPmc}>
              Request PMC
            </button>
          )}
        </>
      )}
      {packet && (
        <section className="risk-packet" aria-label="Medical request packet">
          <p role="status">{queueNotice} · not transmitted</p>
          <DownloadButton value={packet} name="mood-pmc" />
        </section>
      )}
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}

export default function MoodTab(ctx: RiskTabProps) {
  return (
    <Registered {...ctx}>
      <MoodPanel key={scopeKey(ctx)} {...ctx} />
    </Registered>
  );
}
