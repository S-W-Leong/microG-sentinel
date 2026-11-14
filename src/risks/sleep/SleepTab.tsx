import { useState } from 'react';
import type { RiskTabProps } from '../types';
import {
  ContextLink,
  Field,
  Metric,
  NumberField,
  Registered,
  TabFrame,
  TextField,
  TriState,
} from '../cardio/TabUi';
import { display, scopeKey, urgentEvaluation } from '../cardio/presentation';
import { useTabUpdates } from '../cardio/useTabUpdates';
import { day, hour, instant } from '../cardio/support';
import {
  calculateSleep,
  emptySleep,
  evaluateSleep,
  saveSleep,
  sleepSample,
  sleepStore,
  type Interval,
  type SleepInput,
} from './model';

const kss = [
  '1 · Extremely alert',
  '2 · Very alert',
  '3 · Alert',
  '4 · Rather alert',
  '5 · Neither alert nor sleepy',
  '6 · Some signs of sleepiness',
  '7 · Sleepy, no effort to stay awake',
  '8 · Sleepy, some effort to stay awake',
  '9 · Very sleepy, fighting sleep',
];
const fatigue = [
  '1 · Fully alert, wide awake',
  '2 · Very lively, responsive, not at peak',
  '3 · Okay, somewhat fresh',
  '4 · A little tired, less than fresh',
  '5 · Moderately tired, let down',
  '6 · Extremely tired, difficult to concentrate',
  '7 · Completely exhausted, unable to function effectively',
];
function Scale({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Not recorded</option>
        {values.map((text, i) => (
          <option key={text} value={i + 1}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Pair({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Interval | null;
  onChange: (value: Interval | null) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="risk-grid">
        <TextField
          label="Start UTC"
          value={value?.start ?? null}
          placeholder="2026-11-14T00:00:00Z"
          onChange={(s) =>
            onChange(s === null && !value?.end ? null : { start: s ?? '', end: value?.end ?? '' })
          }
        />
        <TextField
          label="End UTC"
          value={value?.end ?? null}
          placeholder="2026-11-14T08:00:00Z"
          onChange={(s) =>
            onChange(
              s === null && !value?.start ? null : { start: value?.start ?? '', end: s ?? '' },
            )
          }
        />
      </div>
    </fieldset>
  );
}
function SleepTrace({ input }: { input: SleepInput }) {
  const [wide, setWide] = useState(false);
  const [detail, setDetail] = useState('');
  const valid = input.start !== null && input.end !== null;
  if (!valid) return <p>Night trace unavailable.</p>;
  const end = wide ? instant(input.recordedAt) : instant(input.end!);
  const start = wide ? end - day : instant(input.start!);
  const x = (time: string) => 76 + ((instant(time) - start) / (end - start)) * 570;
  const clipped = (span: Interval) => ({
    x: Math.max(76, x(span.start)),
    width: Math.max(0, Math.min(646, x(span.end)) - Math.max(76, x(span.start))),
  });
  const stages = ['awake', 'REM', 'light', 'deep'];
  const source = input.mode === 'manual' ? 'Morning check-in' : input.deviceId;
  const describe = (span: Interval, name: string) =>
    `${name} · ${source} · ${display((instant(span.end) - instant(span.start)) / hour, 'h')} · ${span.start}`;
  const spans =
    input.mode === 'manual'
      ? [{ start: input.start!, end: input.end!, stage: 'manual' }]
      : input.stages;
  return (
    <section aria-label="Sleep timeline">
      <div className="risk-actions">
        <button type="button" aria-pressed={!wide} onClick={() => setWide(false)}>
          Night
        </button>
        <button type="button" aria-pressed={wide} onClick={() => setWide(true)}>
          24 hours
        </button>
      </div>
      <div className="risk-chart-scroll" tabIndex={0} aria-label="Scrollable sleep trace">
        <svg
          className="risk-chart"
          viewBox="0 0 670 250"
          role="img"
          aria-label="Night stages and schedule in UTC"
        >
          {stages.map((label, i) => (
            <g key={label}>
              <text x="8" y={48 + i * 36}>
                {label}
              </text>
              <line x1="76" x2="646" y1={44 + i * 36} y2={44 + i * 36} stroke="#3c505b" />
            </g>
          ))}
          {input.duty && (
            <rect {...clipped(input.duty)} y="20" height="164" fill="#9cb2c2" opacity=".15">
              <title>Duty period</title>
            </rect>
          )}
          {input.planned && (
            <rect
              {...clipped(input.planned)}
              y="18"
              height="168"
              fill="none"
              stroke="#acc8d6"
              strokeDasharray="5 4"
            >
              <title>Planned sleep</title>
            </rect>
          )}
          {spans
            .filter((span) => span.stage !== 'unknown')
            .map((span, i) => (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={describe(span, span.stage)}
                onClick={() => setDetail(describe(span, span.stage))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setDetail(describe(span, span.stage));
                }}
              >
                <rect
                  {...clipped(span)}
                  y={span.stage === 'manual' ? 174 : 39 + stages.indexOf(span.stage) * 36}
                  height="8"
                  rx="3"
                  fill="#b6e2e6"
                >
                  <title>{describe(span, span.stage)}</title>
                </rect>
              </g>
            ))}
          {input.naps.map((span, i) => (
            <rect key={i} {...clipped(span)} y="174" height="8" fill="#b6e2e6">
              <title>{describe(span, 'Nap')}</title>
            </rect>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <text
              className="risk-numeric"
              key={f}
              x={76 + f * 570}
              y="211"
              textAnchor={f === 1 ? 'end' : 'start'}
            >
              {new Date(start + f * (end - start)).toISOString().slice(11, 16)}
            </text>
          ))}
          <text x="76" y="239">
            UTC ·{' '}
            {input.mode === 'manual'
              ? 'Manual interval, stages unavailable'
              : 'Unknown stages are gaps'}
          </text>
        </svg>
        {input.mode === 'wearable' && input.stages.some((x) => x.movement !== null) && (
          <svg
            className="risk-chart"
            viewBox="0 0 670 90"
            role="img"
            aria-label={`Movement in ${input.movementUnit}`}
          >
            <text x="8" y="18">
              Movement · {input.movementUnit}
            </text>
            {input.stages
              .filter((x) => x.movement !== null)
              .map((span, i) => (
                <rect
                  key={i}
                  {...clipped(span)}
                  y={
                    75 -
                    (span.movement! / Math.max(1, ...input.stages.map((x) => x.movement ?? 0))) * 45
                  }
                  height={
                    (span.movement! / Math.max(1, ...input.stages.map((x) => x.movement ?? 0))) * 45
                  }
                  fill="#a9c1d3"
                >
                  <title>
                    {span.movement} {input.movementUnit}
                  </title>
                </rect>
              ))}
          </svg>
        )}
      </div>
      <p>Duty = shaded · planned sleep = outline.</p>
      {detail && <p role="status">{detail}</p>}
    </section>
  );
}
function SleepPanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, sleepStore);
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [draft, setDraft] = useState(
    () => sleepStore.current(ctx) ?? emptySleep(person.exposures.asOf),
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importText, setImportText] = useState('');
  const input = sleepStore.current(ctx),
    history = sleepStore.history(ctx);
  const urgent = draft.criticalTaskSleep === true;
  const evaluation = urgent
    ? urgentEvaluation(ctx, 'sleep', 'Sleep change vs baseline', 'h')
    : evaluateSleep(ctx);
  const raw = input ? calculateSleep(input, history) : null;
  const set = <K extends keyof SleepInput>(key: K, value: SleepInput[K]) =>
    setDraft((x) => ({ ...x, [key]: value }));
  function act(fn: () => void) {
    try {
      fn();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Entry unavailable');
    }
  }
  return (
    <TabFrame
      ctx={ctx}
      title="Sleep"
      evaluation={evaluation}
      raw={{ selected: input, draft, history }}
    >
      {evaluation.escalation?.level !== 'urgent' && (
        <>
          <dl>
            <Metric label="Sleep" value={display(raw?.signals.sleepHours, 'h')} />
            <Metric label="Efficiency" value={display(raw?.signals.sleepEfficiencyPct, '%')} />
            <Metric label="KSS" value={display(raw?.signals.sleepinessKarolinska, '/9')} />
            <Metric label="Samn–Perelli" value={display(raw?.signals.fatigueSamnPerelli, '/7')} />
            <Metric
              label="Clock shift"
              value={display(raw?.signals.bodyClockShiftHours, 'h', true)}
            />
          </dl>
          <p>
            {raw?.signals.sleepDebtHours !== null && raw?.signals.sleepDebtHours !== undefined
              ? `Sleep debt ${display(raw.signals.sleepDebtHours, 'h')} over 3 days`
              : `${raw?.completeDays ?? 0}/3 days recorded`}
          </p>
          <p>Demo reference · 8 h/day.</p>
          {input && <SleepTrace input={input} />}
        </>
      )}
      {history.length > 0 && (
        <Field label="Recorded night">
          <select
            value={input?.recordedAt ?? ''}
            onChange={(e) => {
              sleepStore.select(ctx, e.target.value);
              setDraft(sleepStore.current(ctx)!);
            }}
          >
            {history.map((x) => (
              <option key={x.recordedAt} value={x.recordedAt}>
                {x.recordedAt}
              </option>
            ))}
          </select>
        </Field>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(() => {
            saveSleep(ctx, draft);
            setNotice('Saved for this session');
          });
        }}
      >
        <h2>Morning check-in</h2>
        <TriState
          label="Critical-task sleep"
          value={draft.criticalTaskSleep}
          onChange={(b) => set('criticalTaskSleep', b)}
        />
        <p>Fell asleep during a critical task?</p>
        <div className="risk-grid">
          <TextField
            label="Observation UTC"
            value={draft.recordedAt}
            onChange={(s) => set('recordedAt', s ?? '')}
          />
          <TextField
            label="Sleep start UTC"
            value={draft.start}
            onChange={(s) => set('start', s)}
          />
          <TextField label="Sleep end UTC" value={draft.end} onChange={(s) => set('end', s)} />
          <NumberField
            label="Latency min"
            value={draft.latencyMinutes}
            min={0}
            max={1440}
            onChange={(n) => set('latencyMinutes', n)}
          />
          <NumberField
            label="Awake min"
            value={draft.awakeMinutes}
            min={0}
            max={1440}
            onChange={(n) => set('awakeMinutes', n)}
          />
          <Scale
            label="Karolinska sleepiness"
            values={kss}
            value={draft.sleepinessKarolinska}
            onChange={(n) => set('sleepinessKarolinska', n)}
          />
          <Scale
            label="Samn–Perelli fatigue"
            values={fatigue}
            value={draft.fatigueSamnPerelli}
            onChange={(n) => set('fatigueSamnPerelli', n)}
          />
        </div>
        <Field label="24h log complete">
          <input
            type="checkbox"
            checked={draft.complete}
            onChange={(e) => set('complete', e.target.checked)}
          />
        </Field>
        <details>
          <summary>Naps and schedule</summary>
          {draft.naps.map((nap, i) => (
            <div key={i}>
              <Pair
                label={`Nap ${i + 1}`}
                value={nap}
                onChange={(value) =>
                  set(
                    'naps',
                    value
                      ? draft.naps.map((x, j) => (j === i ? value : x))
                      : draft.naps.filter((_, j) => j !== i),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    'naps',
                    draft.naps.filter((_, j) => j !== i),
                  )
                }
              >
                Remove nap
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('naps', [...draft.naps, { start: '', end: '' }])}
          >
            Add nap
          </button>
          <Pair label="Planned sleep" value={draft.planned} onChange={(v) => set('planned', v)} />
          <Pair label="Duty period" value={draft.duty} onChange={(v) => set('duty', v)} />
          <NumberField
            label="Baseline midpoint UTC"
            value={draft.baselineMidpointHourUtc}
            min={0}
            max={23.999}
            onChange={(n) => set('baselineMidpointHourUtc', n)}
          />
          <p>Sleep timing proxy · baseline midpoint uses UTC hours.</p>
          <TextField
            label="Baseline series"
            value={draft.comparisonGroupId}
            onChange={(s) => set('comparisonGroupId', s)}
          />
          <div className="risk-grid">
            <NumberField
              label="Observed minimum h"
              value={draft.observedSleepRange?.[0] ?? null}
              onChange={(n) =>
                set(
                  'observedSleepRange',
                  n === null ? null : [n, draft.observedSleepRange?.[1] ?? n],
                )
              }
            />
            <NumberField
              label="Observed maximum h"
              value={draft.observedSleepRange?.[1] ?? null}
              onChange={(n) =>
                set(
                  'observedSleepRange',
                  n === null ? null : [draft.observedSleepRange?.[0] ?? n, n],
                )
              }
            />
          </div>
        </details>
        <details>
          <summary>Wearable import</summary>
          <p>Import a complete SleepInput JSON with device, timezone and stages.</p>
          <Field label="Wearable JSON">
            <textarea rows={4} value={importText} onChange={(e) => setImportText(e.target.value)} />
          </Field>
          <button
            type="button"
            onClick={() =>
              act(() => {
                const candidate = JSON.parse(importText) as SleepInput;
                if (candidate.mode !== 'wearable') throw new Error('Wearable mode required');
                calculateSleep(candidate, []);
                setDraft(candidate);
              })
            }
          >
            Preview import
          </button>
          <p>Manual and wearable episodes are alternative inputs.</p>
        </details>
        <div className="risk-actions">
          <button className="risk-primary" type="submit">
            Save check-in
          </button>
          {person.source === 'simulated-crew' && ctx.crewId === 'SIM-CDR' && (
            <button
              type="button"
              onClick={() =>
                act(() => {
                  const sample = sleepSample();
                  sample.forEach((n) => saveSleep(ctx, n));
                  setDraft(sample[2]);
                  setNotice('Simulated sample saved');
                })
              }
            >
              Load sample
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="risk-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <p>Session-local entries · download a PMC packet to keep them.</p>
      <div className="risk-links">
        <ContextLink ctx={ctx} risk="cardio" at={input?.recordedAt}>
          Cardiovascular
        </ContextLink>
        <ContextLink ctx={ctx} risk="balance" at={input?.recordedAt}>
          Balance
        </ContextLink>
        <ContextLink ctx={ctx} risk="mood" at={input?.recordedAt}>
          Mood
        </ContextLink>
      </div>
      <details>
        <summary>Methods and sources</summary>
        <p>Sleep debt sums three complete, consecutive 24-hour windows.</p>
        <p>Shift and workload are context, without numerical adjustment.</p>
        <p>Chronotype: {person.traits.chronotype ?? 'Not recorded'}.</p>
        <p>Workload: {display(ctx.vector.getSignals('mood', ctx.crewId, 24)?.signals.workload)}.</p>
        <p>
          <a href="https://www.physionet.org/content/sleep-edfx/1.0.0/">Sleep-EDF reference</a> ·
          ODC-By · reference recordings, not imported crew data.
        </p>
      </details>
    </TabFrame>
  );
}
export default function SleepTab(ctx: RiskTabProps) {
  return (
    <Registered {...ctx}>
      <SleepPanel key={scopeKey(ctx)} {...ctx} />
    </Registered>
  );
}
