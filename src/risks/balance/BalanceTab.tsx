import { useEffect, useRef, useState } from 'react';
import type { RiskTabProps, Rating03 } from '../types';
import {
  ContextLink,
  Metric,
  NumberField,
  Rating,
  RedFlags,
  Registered,
  TabFrame,
  TextField,
} from '../cardio/TabUi';
import { display, scopeKey, urgentEvaluation } from '../cardio/presentation';
import { useTabUpdates } from '../cardio/useTabUpdates';
import {
  balanceFlags,
  balanceSample,
  balanceStore,
  baselineFor,
  calculateBalance,
  centredSamples,
  ellipse,
  emptyBalance,
  evaluateBalance,
  replayTest,
  saveBalance,
  type BalanceInput,
  type Condition,
  type StandTest,
} from './model';
import { sensorPermission, startStandTest } from './sensor';
import './balance.css';

export function SwayTrace({
  test,
  baseline,
  demo,
}: {
  test?: StandTest;
  baseline: number | null;
  demo: boolean;
}) {
  const current = test ? ellipse(test.samples) : null;
  const points = current?.points ?? centredSamples(test?.samples ?? []);
  const reference =
    baseline === null
      ? null
      : demo
        ? ellipse(replayTest(test!.condition, baseline).samples)
        : { major: Math.sqrt(baseline / Math.PI), minor: Math.sqrt(baseline / Math.PI), angle: 0 };
  const limit =
    Math.max(
      1,
      current?.major ?? 0,
      reference?.major ?? 0,
      ...points.flatMap((point) => [Math.abs(point.roll), Math.abs(point.pitch)]),
    ) * 1.2;
  const scale = 110 / limit;
  const latest = points[points.length - 1];
  return (
    <figure className="balance-trace">
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="Angular sway: centred roll versus pitch, equal degree axes"
      >
        <path d="M40 150H260M150 40V260" className="balance-axis" />
        <text x="150" y="288" textAnchor="middle">
          Roll (°)
        </text>
        <text x="16" y="150" transform="rotate(-90 16 150)" textAnchor="middle">
          Pitch (°)
        </text>
        <text x="42" y="168">
          −{limit.toFixed(1)}
        </text>
        <text x="260" y="168" textAnchor="end">
          {limit.toFixed(1)}
        </text>
        <text x="154" y="44">
          {limit.toFixed(1)}
        </text>
        <text x="154" y="262">
          −{limit.toFixed(1)}
        </text>
        <g transform={`translate(150 150) scale(${scale} ${-scale})`}>
          {reference && (
            <ellipse
              rx={reference.major}
              ry={reference.minor}
              transform={`rotate(${reference.angle})`}
              className="balance-baseline"
            />
          )}
          {current && (
            <ellipse
              rx={current.major}
              ry={current.minor}
              transform={`rotate(${current.angle})`}
              className="balance-current"
            />
          )}
          <polyline
            points={points.map((point) => `${point.roll},${point.pitch}`).join(' ')}
            className="balance-path"
          />
          {latest && (
            <circle cx={latest.roll} cy={latest.pitch} r={3 / scale} className="balance-dot" />
          )}
        </g>
      </svg>
      <figcaption>
        Solid: current 95% ellipse · Dashed:{' '}
        {demo ? 'simulated personal baseline' : 'baseline area-equivalent circle'}
      </figcaption>
      {baseline === null && <p>No matching baseline.</p>}
    </figure>
  );
}
function BalancePanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, balanceStore);
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [draft, setDraft] = useState<BalanceInput>(
    () =>
      balanceStore.current(ctx) ??
      emptyBalance(new Date(Date.parse(person.exposures.asOf) - 60_000).toISOString()),
  );
  const [condition, setCondition] = useState<Condition>('eyes-closed');
  const [active, setActive] = useState<StandTest>();
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const capture = useRef<ReturnType<typeof startStandTest> | null>(null);
  const mounted = useRef(true);
  const attempt = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      capture.current?.dispose();
    };
  }, []);
  const urgent = Object.values(draft.flags).includes(true);
  const evaluation = urgent
    ? urgentEvaluation(ctx, 'balance', 'Comparison withheld', 'ratio')
    : evaluateBalance(ctx);
  const suppressScores = evaluation.escalation?.level === 'urgent';
  const test = active ?? draft.tests[condition];
  const traceInput = test ? { ...draft, tests: { ...draft.tests, [condition]: test } } : draft;
  const baseline = baselineFor(ctx, traceInput, condition);
  const saved = balanceStore.current(ctx);
  const signals = saved ? calculateBalance(ctx, saved) : null;
  const set = <K extends keyof BalanceInput>(key: K, value: BalanceInput[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  async function begin(replay: boolean) {
    setError('');
    setNotice('');
    if (!replay && window.screen.orientation?.type.startsWith('landscape')) {
      setError('Use portrait orientation for this protocol.');
      return;
    }
    const version = ++attempt.current;
    setRunning(true);
    const permission = replay
      ? { orientation: false, gravity: false }
      : await sensorPermission({
          DeviceOrientationEvent: window.DeviceOrientationEvent,
          DeviceMotionEvent: window.DeviceMotionEvent,
        });
    if (!mounted.current || version !== attempt.current) return;
    capture.current = startStandTest({
      host: window,
      condition,
      deviceId: deviceId.trim(),
      permission,
      replay: replay || (!permission.orientation && !permission.gravity),
      update: setActive,
      done: (result) => {
        setDraft((previous) => ({
          ...previous,
          tests: { ...previous.tests, [condition]: result },
        }));
        setActive(undefined);
        setRunning(false);
        setNotice(
          result.complete
            ? '30 s complete. Save this check-in.'
            : 'Test stopped. No comparison; no repeat required.',
        );
      },
    });
  }
  function save() {
    try {
      const previous = balanceStore.current(ctx);
      const next =
        previous?.recordedAt === draft.recordedAt &&
        JSON.stringify(previous) !== JSON.stringify(draft)
          ? { ...draft, recordedAt: new Date(Date.parse(draft.recordedAt) + 1).toISOString() }
          : draft;
      saveBalance(ctx, next);
      setDraft(next);
      setError('');
      setNotice('Check-in saved locally');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Save failed');
    }
  }
  return (
    <TabFrame
      ctx={ctx}
      title="Balance"
      evaluation={evaluation}
      raw={urgent ? draft : (saved ?? draft)}
    >
      <RedFlags
        questions={balanceFlags}
        flags={draft.flags}
        onChange={(flags) => {
          set('flags', flags);
          if (Object.values(flags).includes(true)) {
            attempt.current++;
            capture.current?.abort();
            setRunning(false);
          }
        }}
      />
      {!suppressScores && (
        <>
          <dl className="risk-metrics">
            <Metric label="Eyes open" value={display(signals?.swayAreaEyesOpenDeg2, '°²')} />
            <Metric label="Eyes closed" value={display(signals?.swayAreaEyesClosedDeg2, '°²')} />
            <Metric label="MISC" value={display(saved?.misc, '/10')} />
          </dl>
          <section aria-label="Stand test">
            <h2>30 s stand test</h2>
            <p>Ground / partial-gravity demo only. Not free-floating ISS standing.</p>
            <div className="risk-actions" aria-label="Test condition">
              {(['eyes-open', 'eyes-closed'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={running}
                  aria-pressed={condition === value}
                  onClick={() => {
                    setCondition(value);
                    setActive(undefined);
                  }}
                >
                  {value === 'eyes-open' ? 'Eyes open' : 'Eyes closed'}
                  {draft.tests[value] ? ' · recorded' : ' · not recorded'}
                </button>
              ))}
            </div>
            <strong role="status">
              {running && !test?.samples.length
                ? 'Waiting for sensor'
                : test?.mode === 'replay'
                  ? 'Simulated replay · not measured'
                  : test
                    ? 'Live device · angular sway'
                    : 'No test recorded'}
            </strong>
            <SwayTrace test={test} baseline={baseline.value} demo={baseline.demo} />
            <label>
              Elapsed {Math.floor(test?.duration ?? 0)} / 30 s
              <progress max={30} value={test?.duration ?? 0} />
            </label>
            <p>
              {test?.samples.length ?? 0} samples ·{' '}
              {test && test.duration > 0 ? (test.samples.length / test.duration).toFixed(1) : '—'}{' '}
              Hz · {test?.complete ? 'Complete' : 'Incomplete'}
            </p>
            <TextField
              label="Device ID (same physical tablet for comparisons)"
              value={deviceId}
              onChange={(value) => setDeviceId(value ?? '')}
            />
            <p>Hold the tablet at your chest, portrait. Stop if uncomfortable.</p>
            <div className="risk-actions">
              <button
                type="button"
                disabled={running || !deviceId.trim()}
                onClick={() => void begin(false)}
              >
                Start device test
              </button>
              <button type="button" disabled={running} onClick={() => void begin(true)}>
                Run simulated replay
              </button>
              <button
                type="button"
                disabled={!running}
                onClick={() => {
                  attempt.current++;
                  capture.current?.abort();
                  setRunning(false);
                }}
              >
                Stop test
              </button>
            </div>
          </section>
          <div className="risk-grid">
            <NumberField
              label="Dizziness · 0–10"
              min={0}
              max={10}
              step={1}
              value={draft.dizziness}
              onChange={(value) => set('dizziness', value)}
            />
            <NumberField
              label="MISC · 0–10"
              min={0}
              max={10}
              step={1}
              value={draft.misc}
              onChange={(value) => set('misc', value)}
            />
            <Rating
              label="Head-movement tolerance"
              value={draft.headMovementTolerance}
              anchors={[
                '0 · Unable',
                '1 · Small motion',
                '2 · Slow full motion',
                '3 · Unrestricted reported motion',
              ]}
              onChange={(value) => set('headMovementTolerance', value as Rating03 | null)}
            />
          </div>
          <p>MISC: 0–1 none · 2–5 pre-nausea · 6–9 nausea · 10 vomiting.</p>
          <details>
            <summary>Observation details</summary>
            <NumberField
              label="Fast Motion Sickness Scale · 0–20 (separate from MISC)"
              min={0}
              max={20}
              step={1}
              value={draft.motionSickness}
              onChange={(value) => set('motionSickness', value)}
            />
            <TextField
              label="Observation time (UTC offset required)"
              value={draft.recordedAt}
              onChange={(value) => set('recordedAt', value ?? '')}
            />
            <TextField
              label="Comparison group ID"
              value={draft.comparisonGroupId}
              onChange={(value) => set('comparisonGroupId', value ?? '')}
            />
          </details>
        </>
      )}
      <div className="risk-actions">
        <button type="button" className="risk-primary" disabled={running} onClick={save}>
          Save check-in
        </button>
        {!suppressScores && ctx.crewId === 'SIM-CDR' && person.simulated && (
          <button
            type="button"
            disabled={running}
            onClick={() => {
              try {
                const sample = balanceSample(
                  new Date(Date.parse(person.exposures.asOf) - 60_000).toISOString(),
                );
                saveBalance(ctx, sample);
                setDraft(sample);
                setActive(undefined);
                setCondition('eyes-closed');
                setError('');
                setNotice('Simulated sample and personal baseline loaded');
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Load failed');
              }
            }}
          >
            Load 2.1× sample
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="risk-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <p>Session-local entries. Download a PMC packet to keep them.</p>
      <div className="risk-links">
        <ContextLink ctx={ctx} risk="sleep">
          Sleep
        </ContextLink>
        <ContextLink ctx={ctx} risk="cardio">
          Cardiovascular
        </ContextLink>
        <ContextLink ctx={ctx} risk="sans">
          SANS
        </ContextLink>
      </div>
      <details>
        <summary>Methods and sources</summary>
        <p>
          95% covariance ellipse, centred after angular unwrapping. A comparison needs 30 s, at
          least three paired samples, and a positive same-condition, same-device/protocol baseline.
        </p>
        <p>
          Only the SIM-CDR replay fixture supplies a local synthetic personal baseline. It is not a
          NASA or measured crew baseline. Live tests never use it.
        </p>
        <p>
          Vector baselines contain area only; their dashed circle shows equivalent area, not
          measured baseline shape. Sampling gaps remain in the packet.
        </p>
        <p>
          Motion sickness history:{' '}
          {urgent ? 'Withheld during urgent contact' : display(person.traits.motionSicknessHistory)}
          . No numerical adjustment.
        </p>
        <p>
          <a href="https://registry.opendata.aws/hbedb/">Human Balance Evaluation Database</a> ·
          ODC-By. Force-platform background reference, not tablet measurements.
        </p>
      </details>
    </TabFrame>
  );
}
export default function BalanceTab(ctx: RiskTabProps) {
  return (
    <Registered {...ctx}>
      <BalancePanel key={scopeKey(ctx)} {...ctx} />
    </Registered>
  );
}
