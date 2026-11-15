import { useRef, useState } from 'react';
import ResearchReplay from './research/ResearchReplay';
import type { ComponentProps } from 'react';
import type { RiskTabProps } from '../types';
import {
  ContextLink,
  DownloadButton,
  Field,
  Metric,
  NumberField,
  RedFlags,
  Registered,
  TabFrame,
  TextField,
  TriState,
} from '../cardio/TabUi';
import { display, scopeKey, urgentEvaluation } from '../cardio/presentation';
import { useTabUpdates } from '../cardio/useTabUpdates';
import { makePmcPacket, queuePmcPacket, type PmcPacket } from '../cardio/pmc';
import {
  calculateSans,
  emptySans,
  evaluateSans,
  sansFlags,
  sansSample,
  sansStore,
  saveSans,
  type Eye,
  type Mark,
  type SansInput,
} from './model';
import './sans.css';

function SansFrame(props: ComponentProps<typeof TabFrame>) {
  const [packet, setPacket] = useState<PmcPacket | null>(null);
  const [notice, setNotice] = useState('');
  if (props.evaluation.escalation?.level !== 'urgent') return <TabFrame {...props} />;
  const person = props.ctx.vector.getVector(props.ctx.crewId)!;
  return (
    <section className="risk-tab">
      <header className="risk-heading">
        <h1>SANS</h1>
        <span className="risk-id">{props.ctx.crewId}</span>
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
      <aside className="risk-alert" role="alert">
        <strong>Contact the flight surgeon now</strong>
        <p>{props.evaluation.escalation.text}</p>
        <button
          type="button"
          className="risk-primary"
          onClick={() => {
            const next = makePmcPacket(props.ctx, props.evaluation, props.raw, 'urgent');
            setPacket(next);
            let storage: Storage | null = null;
            try {
              storage = window.localStorage;
            } catch {
              storage = null;
            }
            setNotice(queuePmcPacket(next, storage).notice);
          }}
        >
          Request PMC
        </button>
      </aside>
      {packet && (
        <section className="risk-packet">
          <h2>Unscheduled PMC request</h2>
          <p>Request an unscheduled PMC through the flight director.</p>
          <p>Prepared locally · not transmitted.</p>
          <p role="status">{notice}</p>
          <DownloadButton value={packet} />
          <button type="button" onClick={() => setPacket(null)}>
            Close packet
          </button>
        </section>
      )}
      {props.children}
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}

function AmslerGrid({ marks, onChange }: { marks: Mark[]; onChange: (marks: Mark[]) => void }) {
  const [cursor, setCursor] = useState<Mark>({ x: 0.5, y: 0.5 });
  const grid = useRef<SVGSVGElement>(null);
  function toggle(mark: Mark) {
    setCursor(mark);
    const exists = marks.some((point) => point.x === mark.x && point.y === mark.y);
    onChange(
      exists ? marks.filter((point) => point.x !== mark.x || point.y !== mark.y) : [...marks, mark],
    );
  }
  const quadrants = new Set(
    marks
      .filter((mark) => mark.x !== 0.5 && mark.y !== 0.5)
      .map((mark) => `${mark.x < 0.5}:${mark.y < 0.5}`),
  ).size;
  return (
    <div className="sans-amsler">
      <svg
        ref={grid}
        viewBox="-5 -5 110 110"
        role="button"
        tabIndex={0}
        aria-label="Amsler grid. Arrow keys move; Space or Enter toggles a distortion mark."
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const coordinate = (value: number) =>
            Math.max(0, Math.min(1, Math.round(value * 20) / 20));
          toggle({
            x: coordinate((((event.clientX - bounds.left) / bounds.width) * 110 - 5) / 100),
            y: coordinate((((event.clientY - bounds.top) / bounds.height) * 110 - 5) / 100),
          });
          grid.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            toggle(cursor);
          }
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            const clamp = (value: number) => Math.max(0, Math.min(1, Math.round(value * 20) / 20));
            setCursor({
              x: clamp(
                cursor.x +
                  (event.key === 'ArrowRight' ? 0.05 : event.key === 'ArrowLeft' ? -0.05 : 0),
              ),
              y: clamp(
                cursor.y + (event.key === 'ArrowDown' ? 0.05 : event.key === 'ArrowUp' ? -0.05 : 0),
              ),
            });
          }
        }}
      >
        <rect x="0" y="0" width="100" height="100" fill="#f4f4ed" />
        {Array.from({ length: 21 }, (_, index) => (
          <g key={index} stroke="#263038" strokeWidth="0.25">
            <path d={`M ${index * 5} 0 V 100 M 0 ${index * 5} H 100`} />
          </g>
        ))}
        <circle cx="50" cy="50" r="1.5" fill="#101820" />
        {marks.map((mark) => (
          <g key={`${mark.x}:${mark.y}`} stroke="#9c2859" strokeWidth="1.5">
            <path d={`M ${mark.x * 100 - 2} ${mark.y * 100 - 2} l 4 4 m -4 0 l 4 -4`} />
          </g>
        ))}
        <circle
          className="sans-cursor"
          cx={cursor.x * 100}
          cy={cursor.y * 100}
          r="3"
          fill="none"
          stroke="#00607d"
          strokeWidth="1"
        />
      </svg>
      <p>Tap distorted areas; arrows move, Space marks.</p>
      <p role="status">
        {marks.length} marks · {quadrants} quadrants
        {marks.some((mark) => mark.x === 0.5 || mark.y === 0.5)
          ? ' · Axis marks: confirm sides in rating'
          : ''}
      </p>
      <button type="button" onClick={() => onChange([])}>
        Clear marks
      </button>
    </div>
  );
}

function Trends({ ctx, eye }: { ctx: RiskTabProps; eye: Eye }) {
  const [selected, setSelected] = useState<SansInput | null>(null);
  function select(input: SansInput) {
    setSelected(input);
    sansStore.select(ctx, input.recordedAt);
  }
  const history = sansStore.history(ctx).filter((input) => input.eye === eye);
  const points = history.map((input) => ({ input, signals: calculateSans(ctx, input).signals }));
  const dates = points.flatMap((point) => [
    Date.parse(point.input.recordedAt),
    ...(point.input.octAt ? [Date.parse(point.input.octAt)] : []),
  ]);
  const start = Math.min(...dates),
    end = Math.max(...dates);
  return (
    <div className="sans-trends">
      {(['near', 'oct'] as const).map((kind) => {
        const unit = kind === 'near' ? 'lines' : 'µm';
        const rows = points
          .map((point) => ({
            input: point.input,
            time: kind === 'near' ? point.input.recordedAt : point.input.octAt,
            value:
              kind === 'near'
                ? point.signals.nearVisionChangeLines
                : point.signals.octThicknessChangeUm,
          }))
          .filter((row) => row.value !== null && row.time !== null);
        const extent = Math.max(1, ...rows.map((row) => Math.abs(row.value!)));
        const horizontal = (time: string) =>
          start === end ? 160 : 42 + ((Date.parse(time) - start) / (end - start)) * 250;
        const vertical = (value: number) => 60 - (value / extent) * 35;
        return (
          <section
            key={kind}
            aria-label={`${kind === 'near' ? 'Near vision' : 'OCT'} change trend`}
          >
            <h3>
              {kind === 'near' ? 'Near vision change' : 'OCT change'} ({unit})
            </h3>
            {rows.length ? (
              <>
                <svg
                  viewBox="0 0 320 120"
                  role="group"
                  aria-label={`Change versus personal baseline in ${unit}; values below`}
                >
                  <path
                    d="M 42 20 V 95 H 300 M 42 60 H 300"
                    fill="none"
                    stroke="currentColor"
                    opacity="0.4"
                  />
                  <text x="2" y="28">
                    +{extent}
                  </text>
                  <text x="20" y="64">
                    0
                  </text>
                  <text x="2" y="98">
                    −{extent}
                  </text>
                  {rows.map((row) => (
                    <circle
                      key={row.input.recordedAt}
                      role="button"
                      tabIndex={0}
                      aria-label={`${row.time}: ${display(row.value, unit, true)}; show test conditions`}
                      onClick={() => select(row.input)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          select(row.input);
                        }
                      }}
                      cx={horizontal(row.time!)}
                      cy={vertical(row.value!)}
                      r="4"
                      fill="currentColor"
                    >
                      <title>
                        {row.time}: {display(row.value, unit, true)}
                      </title>
                    </circle>
                  ))}
                  <text x="42" y="116">
                    {new Date(start).toISOString().slice(5, 10)}
                  </text>
                  <text x="250" y="116">
                    {new Date(end).toISOString().slice(5, 10)}
                  </text>
                </svg>
                <details>
                  <summary>Test conditions</summary>
                  {rows.map((row) => (
                    <button
                      type="button"
                      key={row.input.recordedAt}
                      onClick={() => select(row.input)}
                    >
                      {row.time?.slice(0, 10)} · {display(row.value, unit, true)}
                    </button>
                  ))}
                </details>
              </>
            ) : (
              <p>No matched records</p>
            )}
          </section>
        );
      })}
      {selected && (
        <p className="sans-point-details" role="status">
          {selected.recordedAt} · {selected.chart ?? 'Chart missing'} ·{' '}
          {display(selected.distanceCm, 'cm')} · Correction{' '}
          {selected.correction === null ? 'unknown' : selected.correction ? 'yes' : 'no'} ·{' '}
          {selected.device ?? 'Device missing'} · {selected.calibration ?? 'Calibration missing'} ·
          OCT {selected.octDevice ?? 'not recorded'} / {selected.octProtocol ?? 'not recorded'} /{' '}
          {selected.octAt ?? 'date missing'}
        </p>
      )}
    </div>
  );
}

function SansPanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, sansStore);
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [eye, setEye] = useState<Eye>(() => sansStore.current(ctx)?.eye ?? 'left-eye');
  const [drafts, setDrafts] = useState<Record<Eye, SansInput>>(() => {
    const history = sansStore.history(ctx);
    return {
      'left-eye':
        history.filter((input) => input.eye === 'left-eye').slice(-1)[0] ??
        emptySans(person.exposures.asOf),
      'right-eye':
        history.filter((input) => input.eye === 'right-eye').slice(-1)[0] ??
        emptySans(person.exposures.asOf, 'right-eye'),
    };
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const draft = drafts[eye];
  const set = <Key extends keyof SansInput>(key: Key, value: SansInput[Key]) =>
    setDrafts((previous) => ({ ...previous, [eye]: { ...previous[eye], [key]: value } }));
  const input = sansStore.current(ctx);
  const raw = input ? calculateSans(ctx, input) : null;
  const evaluation = Object.values(drafts).some((value) =>
    Object.values(value.flags).includes(true),
  )
    ? urgentEvaluation(ctx, 'sans', 'Near vision vs baseline', 'lines')
    : evaluateSans(ctx);
  const hidden = evaluation.escalation?.level === 'urgent';
  const exposures = ctx.vector.getExposures(ctx.crewId, 24);
  function changeEye(next: Eye) {
    setEye(next);
    const latest = sansStore
      .history(ctx)
      .filter((value) => value.eye === next)
      .slice(-1)[0];
    if (latest) sansStore.select(ctx, latest.recordedAt);
    else sansStore.clearSelection(ctx);
  }
  return (
    <SansFrame ctx={ctx} title="SANS" evaluation={evaluation} raw={{ saved: input, draft }}>
      <div className="risk-actions" aria-label="Eye selection">
        {(['left-eye', 'right-eye'] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={eye === value}
            onClick={() => changeEye(value)}
          >
            {value === 'left-eye' ? 'Left eye' : 'Right eye'}
          </button>
        ))}
      </div>
      {!hidden && input && (
        <section aria-label="Saved eye results">
          <p>
            {input.eye === 'left-eye' ? 'Left eye' : 'Right eye'} · Saved {input.recordedAt}
          </p>
          {evaluation.value !== null && (
            <p>
              Near vision {display(evaluation.value, 'lines', true)} vs baseline
              {raw?.signals.octThicknessChangeUm !== null && raw
                ? ` · OCT ${display(raw.signals.octThicknessChangeUm, 'µm', true)}`
                : ''}
            </p>
          )}
          <dl className="risk-metrics">
            <Metric label="Distortion / 3" value={display(input.amslerDistortion)} />
            <Metric label="Headache / 10" value={display(input.headache)} />
            <Metric label="Frisén grade / 5" value={display(input.frisen)} />
          </dl>
          <details>
            <summary>Saved conditions</summary>
            <p>
              {input.chart ?? 'Chart missing'} · {display(input.distanceCm, 'cm')} · Correction{' '}
              {input.correction === null ? 'unknown' : input.correction ? 'yes' : 'no'}
            </p>
            <p>
              {input.device ?? 'Device missing'} · {input.calibration ?? 'Calibration missing'}
            </p>
            <p>
              OCT: {input.octDevice ?? 'Device missing'} · {input.octProtocol ?? 'Protocol missing'}{' '}
              · {input.octAt ?? 'Date missing'}
            </p>
          </details>
        </section>
      )}
      {!hidden && <Trends key={eye} ctx={ctx} eye={eye} />}
      <dl className="risk-metrics">
        <Metric label="Sodium · 24 h" value={display(exposures?.sodiumMg, 'mg')} />
        <Metric label="Cabin CO₂" value={display(exposures?.cabinCo2MmHg, 'mmHg')} />
      </dl>
      <p className="sans-context">
        Sodium: {exposures?.refs.sodiumMg?.recordedAt ?? 'Not recorded'} · CO₂:{' '}
        {exposures?.refs.cabinCo2MmHg?.recordedAt ?? 'Not recorded'}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            saveSans(ctx, draft);
            setError('');
            setNotice('Eye check saved locally');
          } catch (caught) {
            setError((caught as Error).message);
          }
        }}
      >
        <RedFlags
          flags={draft.flags}
          questions={sansFlags}
          onChange={(value) => set('flags', value)}
        />
        <h2>Amsler check</h2>
        <p>Display calibration needed · no screen acuity measurement.</p>
        <AmslerGrid marks={draft.marks} onChange={(value) => set('marks', value)} />
        <Field label="Distortion rating">
          <select
            value={draft.amslerDistortion ?? ''}
            onChange={(event) =>
              set(
                'amslerDistortion',
                event.target.value === '' ? null : (Number(event.target.value) as 0 | 1 | 2 | 3),
              )
            }
          >
            <option value="">Not recorded</option>
            <option value="0">0 · None</option>
            <option value="1">1 · One quadrant</option>
            <option value="2">2 · Two quadrants</option>
            <option value="3">3 · Three/four quadrants</option>
          </select>
        </Field>
        <p>Confirm affected quadrants, not tap count or severity.</p>
        <h2>Near vision</h2>
        <p>Enter a chart result; larger line numbers mean finer print.</p>
        <div className="risk-grid">
          <TextField
            label="Check-in time"
            value={draft.recordedAt}
            onChange={(value) => set('recordedAt', value ?? '')}
            placeholder="ISO time with UTC offset"
          />
          <TextField
            label="Comparison series"
            value={draft.comparisonGroupId}
            onChange={(value) => set('comparisonGroupId', value)}
          />
          <TextField
            label="Chart / protocol"
            value={draft.chart}
            onChange={(value) => set('chart', value)}
          />
          <TextField
            label="Viewing device"
            value={draft.device}
            onChange={(value) => set('device', value)}
          />
          <NumberField
            label="Distance cm"
            value={draft.distanceCm}
            min={0.1}
            onChange={(value) => set('distanceCm', value)}
          />
          <TriState
            label="Correction used"
            value={draft.correction}
            onChange={(value) => set('correction', value)}
          />
          <TextField
            label="Calibration ID"
            value={draft.calibration}
            onChange={(value) => set('calibration', value)}
          />
          <TriState
            label="Half-lines supported"
            value={draft.halfLines}
            onChange={(value) => set('halfLines', value)}
          />
          <NumberField
            label="Smallest line read"
            value={draft.nearLines}
            min={0}
            max={20}
            step={draft.halfLines ? 0.5 : 1}
            onChange={(value) => set('nearLines', value)}
          />
          <NumberField
            label="Headache / 10"
            value={draft.headache}
            min={0}
            max={10}
            step={1}
            onChange={(value) => set('headache', value)}
          />
        </div>
        <Field label="Pre-exposure baseline">
          <input
            type="checkbox"
            checked={draft.nearBaseline}
            onChange={(event) => set('nearBaseline', event.target.checked)}
          />
        </Field>
        <details>
          <summary>Medical-team OCT</summary>
          <p>Mean peripapillary RNFL only; Frisén grade is display-only.</p>
          <div className="risk-grid">
            <NumberField
              label="RNFL µm"
              value={draft.octUm}
              min={0.1}
              onChange={(value) => set('octUm', value)}
            />
            <TextField
              label="Scan time"
              value={draft.octAt}
              onChange={(value) => set('octAt', value)}
              placeholder="ISO time with UTC offset"
            />
            <TextField
              label="OCT device"
              value={draft.octDevice}
              onChange={(value) => set('octDevice', value)}
            />
            <TextField
              label="OCT protocol"
              value={draft.octProtocol}
              onChange={(value) => set('octProtocol', value)}
            />
            <NumberField
              label="Frisén grade"
              value={draft.frisen}
              min={0}
              max={5}
              step={1}
              onChange={(value) => set('frisen', value)}
            />
          </div>
          <Field label="Pre-exposure OCT">
            <input
              type="checkbox"
              checked={draft.octBaseline}
              onChange={(event) => set('octBaseline', event.target.checked)}
            />
          </Field>
        </details>
        <details>
          <summary>Cabin context</summary>
          <NumberField
            label="CO₂ mmHg"
            value={draft.cabinCo2MmHg}
            min={0}
            max={20}
            onChange={(value) => set('cabinCo2MmHg', value)}
          />
          <p>Measured at check-in time; context only.</p>
        </details>
        <div className="risk-actions">
          <button type="submit" className="risk-primary">
            Save check-in
          </button>
          <button
            type="button"
            onClick={() => {
              setDrafts((previous) => ({
                ...previous,
                [eye]: {
                  ...previous[eye],
                  recordedAt: ctx.vector.getVector(ctx.crewId)!.exposures.asOf,
                  nearBaseline: false,
                  octBaseline: false,
                },
              }));
              setNotice('New check-in time set');
            }}
          >
            New check-in
          </button>
          {ctx.crewId === 'SIM-CDR' && person.simulated && (
            <button
              type="button"
              onClick={() => {
                try {
                  const samples = sansSample(
                    new Date(
                      Date.parse(ctx.vector.getVector(ctx.crewId)!.exposures.asOf) - 60000,
                    ).toISOString(),
                  );
                  samples.forEach((sample) => saveSans(ctx, sample));
                  setDrafts((previous) => ({ ...previous, 'left-eye': samples[1] }));
                  setEye('left-eye');
                  setError('');
                  setNotice('Simulated baseline and check-in loaded');
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
      <details>
        <summary>Research context</summary>
        <p>
          One-carbon/B-vitamin flag:{' '}
          {person.traits.geneticFlags === null
            ? 'unknown'
            : person.traits.geneticFlags.includes('one-carbon-risk')
              ? 'recorded'
              : 'not recorded'}{' '}
          · research only, never a score multiplier.
        </p>
        <p>Session-local records; comparisons require matching eye, series and test conditions.</p>
      </details>
      <ContextLink ctx={ctx} risk="food">
        Food context
      </ContextLink>
    </SansFrame>
  );
}
function SansViews(ctx: RiskTabProps) {
  const [research, setResearch] = useState(false);
  return (
    <>
      <nav className="risk-tab sans-view-switch" aria-label="SANS data source">
        <div className="risk-actions">
          <button type="button" aria-pressed={!research} onClick={() => setResearch(false)}>
            Crew check-in
          </button>
          <button type="button" aria-pressed={research} onClick={() => setResearch(true)}>
            NASA replay
          </button>
        </div>
      </nav>
      <div hidden={research}>
        <SansPanel {...ctx} />
      </div>
      {research && <ResearchReplay />}
    </>
  );
}
export default function SansTab(ctx: RiskTabProps) {
  return (
    <Registered {...ctx}>
      <SansViews key={scopeKey(ctx)} {...ctx} />
    </Registered>
  );
}
