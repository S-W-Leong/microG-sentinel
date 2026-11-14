import { useId, useState } from 'react';
import type { BoneSite, RiskTabProps } from '../types';
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
import {
  boneSample,
  boneSites,
  boneStore,
  calculateBone,
  emptyBone,
  evaluateBone,
  saveBone,
  siteLabel,
  type BoneInput,
  type DxaScan,
  type ResistanceEntry,
} from './model';

function ScanForm({
  label,
  scan,
  site,
  baseline,
  onChange,
}: {
  label: string;
  scan: DxaScan | null;
  site: BoneSite;
  baseline: boolean;
  onChange: (scan: DxaScan | null) => void;
}) {
  const defaults: DxaScan = {
    date: '',
    site,
    bmd: null,
    side: null,
    scannerId: null,
    protocolId: null,
    region: null,
    isBaseline: baseline,
  };
  const set = <K extends keyof DxaScan>(key: K, value: DxaScan[K]) =>
    onChange({ ...(scan ?? defaults), [key]: value });
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="risk-grid">
        <TextField
          label="Scan date"
          value={scan?.date ?? null}
          placeholder="YYYY-MM-DD"
          onChange={(s) => set('date', s ?? '')}
        />
        <NumberField
          label="BMD g/cm²"
          value={scan?.bmd ?? null}
          min={0.000001}
          onChange={(n) => set('bmd', n)}
        />
        <Field label="Side">
          <select
            value={scan?.side ?? ''}
            onChange={(e) =>
              set('side', e.target.value ? (e.target.value as DxaScan['side']) : null)
            }
          >
            <option value="">Not recorded</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="central">Central</option>
          </select>
        </Field>
        <TextField
          label="Scanner ID"
          value={scan?.scannerId ?? null}
          onChange={(s) => set('scannerId', s)}
        />
        <TextField
          label="Protocol ID"
          value={scan?.protocolId ?? null}
          onChange={(s) => set('protocolId', s)}
        />
        <TextField
          label="Scan region"
          value={scan?.region ?? null}
          onChange={(s) => set('region', s)}
        />
      </div>
      <button type="button" onClick={() => onChange(null)}>
        Clear scan
      </button>
    </fieldset>
  );
}
function BonePanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, boneStore);
  const hatchId = useId();
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [draft, setDraft] = useState(
    () => boneStore.current(ctx) ?? emptyBone(person.exposures.asOf),
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const input = boneStore.current(ctx),
    history = boneStore.history(ctx),
    result = input ? calculateBone(input) : null;
  const evaluation =
    draft.suddenPain === true
      ? urgentEvaluation(ctx, 'bone', 'BMD change per month', '%/month')
      : evaluateBone(ctx);
  const hidden = evaluation.escalation?.level === 'urgent';
  const exposures = person.exposures;
  const set = <K extends keyof BoneInput>(key: K, value: BoneInput[K]) =>
    setDraft((x) => ({ ...x, [key]: value }));
  function selectSite(site: BoneSite) {
    const entries = history.filter((x) => x.site === site),
      selected = entries[entries.length - 1];
    if (selected) {
      boneStore.select(ctx, selected.recordedAt);
      setDraft(selected);
    } else {
      boneStore.clearSelection(ctx);
      setDraft({ ...emptyBone(person.exposures.asOf), site, suddenPain: draft.suddenPain });
    }
  }
  const bySite = (site: BoneSite) => {
    const entries = history.filter((x) => x.site === site);
    return entries.length
      ? calculateBone(entries[entries.length - 1]).signals.bmdChangePctPerMonth
      : null;
  };
  const fill = (site: BoneSite) => {
    if (hidden) return '#667d87';
    const change = bySite(site);
    return change === null ? `url(#${hatchId})` : change < 0 ? '#7f9db4' : '#b5d5cc';
  };
  const opacity = (site: BoneSite) =>
    hidden || bySite(site) === null ? 1 : Math.min(0.95, 0.35 + Math.abs(bySite(site)!) / 5);
  const select = (site: BoneSite) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Select ${siteLabel[site]}`,
    onClick: () => selectSite(site),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') selectSite(site);
    },
  });
  return (
    <TabFrame
      ctx={ctx}
      title="Bone"
      evaluation={evaluation}
      raw={{ selected: input, draft, history, nutrientRefs: exposures.refs }}
    >
      <TriState
        label="Sudden bone pain"
        value={draft.suddenPain}
        onChange={(b) => set('suddenPain', b)}
      />
      <p>Sudden bone pain after load or impact?</p>
      <div className="risk-pair">
        <svg
          className="risk-chart risk-skeleton"
          viewBox="0 0 250 470"
          role="img"
          aria-label="Selectable skeleton with BMD change per site"
        >
          <defs>
            <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M0 7L7 0" stroke="#9ab2be" strokeWidth="1" />
            </pattern>
          </defs>
          <g stroke="#8b9ea9" strokeWidth="8" fill="none" strokeLinecap="round">
            <ellipse cx="125" cy="40" rx="27" ry="32" />
            <path d="M125 75V105M76 100L125 90L174 100M76 100L55 184L43 264M174 100L195 184L207 264M99 274L90 363L85 440M151 274L160 363L165 440" />
            <path d="M95 112Q125 100 155 112M90 133Q125 119 160 133M89 154Q125 140 161 154M97 175Q125 164 153 175" />
          </g>
          <g {...select('lumbar-spine')}>
            <rect
              x="111"
              y="105"
              width="28"
              height="119"
              rx="9"
              fill={fill('lumbar-spine')}
              fillOpacity={opacity('lumbar-spine')}
              stroke={draft.site === 'lumbar-spine' ? '#f5a35c' : '#d7e7ec'}
              strokeWidth="3"
            />
            <title>
              Spine ·{' '}
              {hidden ? 'Review requested' : display(bySite('lumbar-spine'), '%/month', true)}
            </title>
          </g>
          <g {...select('total-hip')}>
            <path
              d="M80 224Q125 204 170 224L158 274L139 259H111L92 274Z"
              fill={fill('total-hip')}
              fillOpacity={opacity('total-hip')}
              stroke={draft.site === 'total-hip' ? '#f5a35c' : '#d7e7ec'}
              strokeWidth="3"
            />
            <title>
              Hip · {hidden ? 'Review requested' : display(bySite('total-hip'), '%/month', true)}
            </title>
          </g>
          <g
            {...select('femoral-neck')}
            fill={fill('femoral-neck')}
            fillOpacity={opacity('femoral-neck')}
            stroke={draft.site === 'femoral-neck' ? '#f5a35c' : '#d7e7ec'}
            strokeWidth="3"
          >
            <ellipse cx="99" cy="280" rx="15" ry="22" />
            <ellipse cx="151" cy="280" rx="15" ry="22" />
            <title>
              Femoral neck ·{' '}
              {hidden ? 'Review requested' : display(bySite('femoral-neck'), '%/month', true)}
            </title>
          </g>
        </svg>
        <div className="risk-sites">
          <h2>BMD change</h2>
          {boneSites.map((site) => (
            <button
              type="button"
              key={site}
              aria-pressed={draft.site === site}
              onClick={() => selectSite(site)}
            >
              {siteLabel[site]} ·{' '}
              {hidden
                ? 'Review requested'
                : bySite(site) === null
                  ? 'No DXA'
                  : display(bySite(site), '%/month', true)}
            </button>
          ))}
          <p>Blue = decrease · green = increase · hatch = No DXA.</p>
        </div>
      </div>
      {!hidden && (
        <>
          <dl>
            <Metric
              label="BMD change"
              value={display(result?.signals.bmdChangePctPerMonth, '%/month', true)}
            />
            <Metric
              label="Resistance load"
              value={display(result?.signals.resistanceLoadPct, '% of plan')}
            />
            <Metric
              label="Calcium + D"
              value={
                <>
                  Calcium {display(exposures.calciumMg, 'mg')}
                  <br />
                  Vitamin D {display(exposures.vitaminDIu, 'IU')}
                </>
              }
            />
            <Metric label="Sodium" value={display(exposures.sodiumMg, 'mg')} />
            <Metric
              label="Flight days"
              value={
                result?.preFlight ? 'Pre-flight' : display(result?.signals.daysInFlight, 'days')
              }
            />
          </dl>
          {result?.signals.resistanceLoadPct !== null &&
            result?.signals.resistanceLoadPct !== undefined && (
              <>
                <progress
                  max={Math.max(100, result.signals.resistanceLoadPct)}
                  value={result.signals.resistanceLoadPct}
                />
                <p>Resistance volume · {display(result.signals.resistanceLoadPct, '%')} of plan.</p>
              </>
            )}
          {input?.baseline?.bmd !== null &&
            input?.baseline &&
            input?.current?.bmd !== null &&
            input?.current && (
              <section>
                <h2>{siteLabel[input.site!]} measurements</h2>
                <div className="risk-chart-scroll" tabIndex={0} aria-label="Scrollable DXA chart">
                  <svg
                    className="risk-chart"
                    viewBox="0 0 500 180"
                    role="img"
                    aria-label="Two recorded DXA values by date"
                  >
                    <text x="10" y="20">
                      BMD · g/cm²
                    </text>
                    <line x1="90" x2="410" y1="120" y2="120" stroke="#627e8d" />
                    {[input.baseline, input.current].map((scan, i) => (
                      <g key={i}>
                        <circle
                          cx={90 + i * 320}
                          cy={
                            105 -
                            (scan.bmd! / Math.max(input.baseline!.bmd!, input.current!.bmd!)) * 50
                          }
                          r="6"
                          fill="#c2dde3"
                        />
                        <text x={90 + i * 320} y="35" textAnchor="middle" className="risk-numeric">
                          {display(scan.bmd, 'g/cm²', false, 4)}
                        </text>
                        <text x={90 + i * 320} y="148" textAnchor="middle" className="risk-numeric">
                          {scan.date}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <p>
                  {display(result?.elapsedDays, 'days')} between scans · no daily interpolation.
                </p>
              </section>
            )}
          <details>
            <summary>Nutrient context</summary>
            <p>Targets are entered by the medical team.</p>
            <p>Calcium target: {display(input?.calciumTargetMg, 'mg')}.</p>
            <p>Vitamin D target: {display(input?.vitaminDTargetIu, 'IU')}.</p>
            <p>Sodium target: {display(input?.sodiumTargetMg, 'mg')}.</p>
            {(['calciumMg', 'vitaminDIu', 'sodiumMg'] as const).map((key) => (
              <p key={key}>
                {key}: {exposures.refs[key]?.recordedAt ?? 'Source time unavailable'}.
              </p>
            ))}
            <p>Aerobic exercise context: {display(exposures.exerciseLoadPct, '% of plan')}.</p>
          </details>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            saveBone(ctx, draft);
            setError('');
            setNotice('Saved for this session');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Entry unavailable');
          }
        }}
      >
        <h2>Medical-team observations</h2>
        <TextField
          label="Observation UTC"
          value={draft.recordedAt}
          onChange={(s) => set('recordedAt', s ?? '')}
        />
        <ScanForm
          label="Pre-exposure DXA"
          scan={draft.baseline}
          site={draft.site ?? 'total-hip'}
          baseline
          onChange={(s) => set('baseline', s)}
        />
        <ScanForm
          label="Current DXA"
          scan={draft.current}
          site={draft.site ?? 'total-hip'}
          baseline={false}
          onChange={(s) => set('current', s)}
        />
        <details>
          <summary>Resistance log</summary>
          <p>Record the same scheduled seven-day exercise set.</p>
          <Field label="7d log complete">
            <input
              type="checkbox"
              checked={draft.resistanceComplete}
              onChange={(e) => set('resistanceComplete', e.target.checked)}
            />
          </Field>
          {draft.resistance?.map((log, index) => {
            const update = <K extends keyof ResistanceEntry>(key: K, value: ResistanceEntry[K]) =>
              set(
                'resistance',
                draft.resistance!.map((x, i) => (i === index ? { ...x, [key]: value } : x)),
              );
            return (
              <fieldset key={index}>
                <legend>Exercise {index + 1}</legend>
                <div className="risk-grid">
                  <TextField
                    label="Log date"
                    value={log.date}
                    onChange={(s) => update('date', s ?? '')}
                  />
                  <TextField
                    label="Exercise ID"
                    value={log.exerciseId}
                    onChange={(s) => update('exerciseId', s ?? '')}
                  />
                  <TextField
                    label="Device protocol"
                    value={log.deviceId}
                    onChange={(s) => update('deviceId', s ?? '')}
                  />
                  {(
                    [
                      'plannedSets',
                      'plannedReps',
                      'plannedKg',
                      'performedSets',
                      'performedReps',
                      'actualKg',
                    ] as const
                  ).map((key, i) => (
                    <NumberField
                      key={key}
                      label={
                        [
                          'Planned sets',
                          'Planned reps',
                          'Planned kg',
                          'Completed sets',
                          'Completed reps',
                          'Actual kg',
                        ][i]
                      }
                      value={log[key]}
                      min={0}
                      step={key.endsWith('Kg') ? 'any' : 1}
                      onChange={(n) => update(key, n)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'resistance',
                      draft.resistance!.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove exercise
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            onClick={() =>
              set('resistance', [
                ...(draft.resistance ?? []),
                {
                  date: '',
                  exerciseId: '',
                  deviceId: '',
                  plannedSets: null,
                  plannedReps: null,
                  plannedKg: null,
                  performedSets: null,
                  performedReps: null,
                  actualKg: null,
                },
              ])
            }
          >
            Add exercise
          </button>
        </details>
        <details>
          <summary>Mission and targets</summary>
          <div className="risk-grid">
            <TextField
              label="Mission start UTC"
              value={draft.missionStart}
              onChange={(s) => set('missionStart', s)}
            />
            <NumberField
              label="Calcium target mg"
              value={draft.calciumTargetMg}
              min={0}
              max={10000}
              onChange={(n) => set('calciumTargetMg', n)}
            />
            <NumberField
              label="Vitamin D IU"
              value={draft.vitaminDTargetIu}
              min={0}
              max={100000}
              onChange={(n) => set('vitaminDTargetIu', n)}
            />
            <NumberField
              label="Sodium target mg"
              value={draft.sodiumTargetMg}
              min={0}
              max={30000}
              onChange={(n) => set('sodiumTargetMg', n)}
            />
            <NumberField
              label="Observed BMD minimum"
              value={draft.observedBmdRange?.[0] ?? null}
              onChange={(n) =>
                set('observedBmdRange', n === null ? null : [n, draft.observedBmdRange?.[1] ?? n])
              }
            />
            <NumberField
              label="Observed BMD maximum"
              value={draft.observedBmdRange?.[1] ?? null}
              onChange={(n) =>
                set('observedBmdRange', n === null ? null : [draft.observedBmdRange?.[0] ?? n, n])
              }
            />
          </div>
          <p>Vitamin D conversion: 1 µg = 40 IU.</p>
        </details>
        <div className="risk-actions">
          <button className="risk-primary" type="submit">
            Save observation
          </button>
          {person.source === 'simulated-crew' && ctx.crewId === 'SIM-CDR' && (
            <button
              type="button"
              onClick={() => {
                setDraft(boneSample());
                setNotice('Simulated fixture loaded');
              }}
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
        <ContextLink ctx={ctx} risk="food" at={input?.recordedAt}>
          Food
        </ContextLink>
        <ContextLink ctx={ctx} risk="cardio" at={input?.recordedAt}>
          Cardiovascular
        </ContextLink>
      </div>
      <details>
        <summary>Methods and sources</summary>
        <p>BMD rate uses actual scan days divided by 30.4375.</p>
        <p>Resistance volume compares kg × completed repetitions with the recorded plan.</p>
        <p>
          <a href="https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2013/DataFiles/DXXSPN_H.htm">
            NHANES spine DXA reference
          </a>{' '}
          · NCHS citation and data-use conditions apply.
        </p>
        <p>NHANES is not a longitudinal astronaut baseline or a hip source.</p>
        <p>
          <a href="https://www.nasa.gov/ames/research/space-biosciences/lsda/">
            NASA LSDA reference
          </a>{' '}
          · access required, data not bundled.
        </p>
      </details>
    </TabFrame>
  );
}
export default function BoneTab(ctx: RiskTabProps) {
  return (
    <Registered {...ctx}>
      <BonePanel key={scopeKey(ctx)} {...ctx} />
    </Registered>
  );
}
