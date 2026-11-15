import { useEffect, useRef, useState } from 'react';
import ResearchReplay from './research/ResearchReplay';
import type { RiskTabProps, Rating03 } from '../types';
import {
  ContextLink,
  Field,
  Metric,
  NumberField,
  Rating,
  RedFlags,
  Registered,
  TabFrame,
  TextField,
  TriState,
} from '../cardio/TabUi';
import { display, scopeKey, urgentEvaluation } from '../cardio/presentation';
import { useTabUpdates } from '../cardio/useTabUpdates';
import {
  bodyAreas,
  emptyImmune,
  evaluateImmune,
  immuneFlags,
  immuneSample,
  immuneStore,
  saveImmune,
  scoreImmune,
  type BodyArea,
  type ImmuneInput,
} from './model';

const areaLabels: Record<BodyArea, string> = {
  'head-neck': 'Head / neck',
  trunk: 'Trunk',
  'left-arm': 'Left arm',
  'right-arm': 'Right arm',
  'left-leg': 'Left leg',
  'right-leg': 'Right leg',
};
function ImmunePanel(ctx: RiskTabProps) {
  useTabUpdates(ctx, immuneStore);
  const person = ctx.vector.getVector(ctx.crewId)!;
  const [draft, setDraft] = useState(
    () => immuneStore.current(ctx) ?? emptyImmune(person.exposures.asOf),
  );
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );
  const input = immuneStore.current(ctx),
    raw = input ? scoreImmune(input) : null;
  const urgent = Object.values(draft.flags).includes(true);
  const evaluation = urgent
    ? urgentEvaluation(ctx, 'immune', 'Hives pattern', '%')
    : photoChanged
      ? {
          risk: 'immune' as const,
          crewId: ctx.crewId,
          kind: 'pattern-match' as const,
          value: null,
          unit: '%' as const,
          label: 'Hives pattern',
          reasons: [],
          evidence: 'insufficient' as const,
          simulated: person.simulated,
          escalation: null,
        }
      : evaluateImmune(ctx);
  const hidden = evaluation.escalation?.level === 'urgent' || photoChanged;
  const set = <K extends keyof ImmuneInput>(key: K, value: ImmuneInput[K]) =>
    setDraft((x) => ({ ...x, [key]: value }));
  async function preview(file: File | undefined) {
    const request = ++generation.current;
    setPhoto(null);
    setError('');
    if (!file) return;
    setPhotoChanged(true);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose another photo');
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('Unreadable image');
      if (request !== generation.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setPhoto({ url, name: file.name });
      // A new photo supplies no symptom groups and no prior exposure assumptions.
      setDraft((x) => ({ ...emptyImmune(person.exposures.asOf), flags: x.flags }));
    } catch {
      URL.revokeObjectURL(url);
      if (request === generation.current) setError('Choose another photo');
    }
  }
  const exposures = ctx.vector.getExposures(ctx.crewId, 6);
  return (
    <TabFrame
      ctx={ctx}
      title="Immune"
      evaluation={evaluation}
      raw={{ selected: input, draft, photoName: photo?.name ?? null, reference: 'demo-immune-v1' }}
    >
      <p>Demo rule · five confirmed observation groups.</p>
      <RedFlags questions={immuneFlags} flags={draft.flags} onChange={(f) => set('flags', f)} />
      <div className="risk-pair">
        <section>
          <h2>Your photo</h2>
          <Field label="Upload photo">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                void preview(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </Field>
          {photo ? (
            <>
              <img
                className="risk-photo"
                src={photo.url}
                alt={`Local skin observation · ${draft.photoArea ? areaLabels[draft.photoArea] : 'area not recorded'}`}
              />
              <p>{photo.name}</p>
            </>
          ) : (
            <div className="risk-photo-placeholder">
              Local photo unavailable
              <br />
              Simulated samples use a labelled placeholder.
            </div>
          )}
          <p>
            {draft.photoArea ? areaLabels[draft.photoArea] : 'Area not recorded'} ·{' '}
            {draft.photoTime ?? 'Time not recorded'}
          </p>
        </section>
        <section>
          <h2>Reference pattern</h2>
          <div className="risk-photo-placeholder">
            Hives reference
            <br />
            Synthetic observation fixture
            <br />
            No reference photograph bundled
          </div>
          <p>demo-immune-v1 · unvalidated reference.</p>
        </section>
      </div>
      {!hidden && (
        <>
          <dl>
            <Metric label="Wheals" value={display(raw?.signals.whealCountBand, '/3')} />
            <Metric label="Itch" value={display(raw?.signals.itch, '/3')} />
            <Metric
              label="Shape"
              value={
                input
                  ? [input.raised, input.clearEdges, input.paleCentre]
                      .map((x) => (x === null ? '?' : x ? 'Yes' : 'No'))
                      .join(' · ')
                  : 'Not recorded'
              }
            />
            <Metric
              label="Fades within 24h"
              value={
                input?.fadesWithin24h === null || !input
                  ? 'Not recorded'
                  : input.fadesWithin24h
                    ? 'Yes'
                    : 'No'
              }
            />
            <Metric label="Spread" value={display(raw?.signals.bodyAreasCount, 'areas')} />
          </dl>
          {raw?.signals.hivesPatternPct !== null && raw?.signals.hivesPatternPct !== undefined ? (
            <button
              type="button"
              className="risk-match"
              onClick={() => setReferenceOpen((x) => !x)}
              aria-expanded={referenceOpen}
            >
              <span>Hives · base match {display(raw.signals.hivesPatternPct, '%')}</span>
              <progress value={raw.signals.hivesPatternPct} max={100} />
              <span>Demo rule · synthetic reference</span>
            </button>
          ) : (
            <p>Pattern match unavailable · {raw?.groups ?? 0}/5 groups recorded.</p>
          )}
          {evaluation.value !== null && (
            <p>
              Personalised {display(evaluation.value, '%')} · Demo rule
              {person.simulated ? ' · Simulated' : ''}.
            </p>
          )}
          {referenceOpen && (
            <section>
              <h3>Recorded reference groups</h3>
              <p>Wheals 2 · itch 2 · shape all yes · fade yes · spread 1.</p>
              <p>Exact group matches divided by five; unknown groups do not match.</p>
              <p>At least three groups must be recorded.</p>
              <p>Scores describe this synthetic reference, without image analysis.</p>
            </section>
          )}
          <details>
            <summary>Why this?</summary>
            <p>Base match: {display(raw?.signals.hivesPatternPct, '%')}.</p>
            <p>Personalised: {display(evaluation.value, '%')}.</p>
            {evaluation.reasons.map((r, i) => (
              <p key={i}>
                {r.direction === 'up' ? '↑' : '↓'} {r.text} · {r.signal}
              </p>
            ))}
            {evaluation.reasons.length > 0 && (
              <p>
                Demo assumptions · matching declared allergy +10 points; recent reviewed exposure
                +10 points.
              </p>
            )}
            <p>Food timing is context, without proof of a cause.</p>
            {exposures?.allergensEaten?.map((meal, i) => (
              <p key={i}>
                {meal.allergen} ·{' '}
                {display(
                  (Date.parse(input?.recordedAt ?? person.exposures.asOf) -
                    Date.parse(meal.eatenAt)) /
                    3_600_000,
                  'h',
                )}{' '}
                ago ·{' '}
                <ContextLink ctx={ctx} risk="food" at={meal.eatenAt}>
                  View meal
                </ContextLink>
              </p>
            ))}
          </details>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (photoChanged && !photo) throw new Error('Choose another photo');
            if (photo && (!draft.photoArea || !draft.photoTime))
              throw new Error('Record photo area and time');
            saveImmune(ctx, draft);
            setPhotoChanged(false);
            setError('');
            setNotice('Saved for this session');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Entry unavailable');
          }
        }}
      >
        <h2>Confirm observations</h2>
        <div className="risk-grid">
          <TextField
            label="Observation UTC"
            value={draft.recordedAt}
            onChange={(s) => set('recordedAt', s ?? '')}
          />
          <TextField
            label="Photo UTC"
            value={draft.photoTime}
            onChange={(s) => set('photoTime', s)}
          />
          <TextField label="Onset UTC" value={draft.onset} onChange={(s) => set('onset', s)} />
          <Field label="Photo area">
            <select
              value={draft.photoArea ?? ''}
              onChange={(e) =>
                set('photoArea', e.target.value ? (e.target.value as BodyArea) : null)
              }
            >
              <option value="">Unknown</option>
              {bodyAreas.map((a) => (
                <option key={a} value={a}>
                  {areaLabels[a]}
                </option>
              ))}
            </select>
          </Field>
          <TriState
            label="Rash present"
            value={draft.rashActive}
            onChange={(v) => set('rashActive', v)}
          />
        </div>
        <fieldset>
          <legend>1 · Wheals</legend>
          <Rating
            label="Last 24h"
            value={draft.whealCountBand}
            anchors={['0 · None', '1 · 1–19 wheals', '2 · 20–50 wheals', '3 · More than 50']}
            onChange={(n) => set('whealCountBand', n as Rating03 | null)}
          />
          <p>Confirm total wheals across the body.</p>
        </fieldset>
        <fieldset>
          <legend>2 · Itch</legend>
          <Rating
            label="Itch interference"
            value={draft.itch}
            anchors={[
              '0 · None',
              '1 · Mild, not troublesome',
              '2 · Troublesome, no activity or sleep interference',
              '3 · Interferes with activity or sleep',
            ]}
            onChange={(n) => set('itch', n as Rating03 | null)}
          />
        </fieldset>
        <fieldset>
          <legend>3 · Shape</legend>
          <div className="risk-grid">
            <TriState label="Raised" value={draft.raised} onChange={(b) => set('raised', b)} />
            <TriState
              label="Clear edges"
              value={draft.clearEdges}
              onChange={(b) => set('clearEdges', b)}
            />
            <TriState
              label="Pale centre"
              value={draft.paleCentre}
              onChange={(b) => set('paleCentre', b)}
            />
          </div>
        </fieldset>
        <fieldset>
          <legend>4 · Fading</legend>
          <TriState
            label="Fades within 24h"
            value={draft.fadesWithin24h}
            onChange={(b) => set('fadesWithin24h', b)}
          />
          <p>Confirm disappearance of the same individual wheal.</p>
        </fieldset>
        <fieldset>
          <legend>5 · Spread</legend>
          <TriState
            label="Whole-body review"
            value={draft.areas === null ? null : true}
            onChange={(b) => set('areas', b === true ? [] : null)}
          />
          {draft.areas !== null && (
            <div className="risk-grid">
              {bodyAreas.map((area) => (
                <Field key={area} label={areaLabels[area]}>
                  <input
                    type="checkbox"
                    checked={draft.areas!.includes(area)}
                    onChange={(e) =>
                      set(
                        'areas',
                        e.target.checked
                          ? [...draft.areas!, area]
                          : draft.areas!.filter((x) => x !== area),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
          )}
          <p>Reviewed with no areas selected means zero.</p>
        </fieldset>
        <div className="risk-actions">
          <button className="risk-primary" type="submit">
            Save check-in
          </button>
          {person.source === 'simulated-crew' && ctx.crewId === 'SIM-CDR' && (
            <button
              type="button"
              onClick={() => {
                generation.current++;
                setPhoto(null);
                setPhotoChanged(false);
                setDraft(immuneSample());
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
      <p>Photos remain local; confirm observations manually.</p>
      <details>
        <summary>Observed itch range</summary>
        <p>Enter the person's previously observed range, when available.</p>
        <div className="risk-grid">
          <NumberField
            label="Observed minimum"
            value={draft.observedItchRange?.[0] ?? null}
            min={0}
            max={3}
            step={1}
            onChange={(n) =>
              set('observedItchRange', n === null ? null : [n, draft.observedItchRange?.[1] ?? n])
            }
          />
          <NumberField
            label="Observed maximum"
            value={draft.observedItchRange?.[1] ?? null}
            min={0}
            max={3}
            step={1}
            onChange={(n) =>
              set('observedItchRange', n === null ? null : [draft.observedItchRange?.[0] ?? n, n])
            }
          />
        </div>
      </details>
      <div className="risk-links">
        <ContextLink ctx={ctx} risk="food" at={input?.recordedAt}>
          Food
        </ContextLink>
        <ContextLink ctx={ctx} risk="microbiome" at={input?.recordedAt}>
          Microbiome
        </ContextLink>
      </div>
      <details>
        <summary>Methods and sources</summary>
        <p>The five-group match is a demo rule, without a working photo classifier.</p>
        <p>This simplified observation set is not UAS7.</p>
        <p>
          <a href="https://github.com/google-research-datasets/scin">SCIN reference</a> · hives
          coverage unverified; no assets or model bundled.
        </p>
        <p>
          <a href="https://github.com/google-research-datasets/scin/blob/main/LICENSE">
            SCIN Data Use License
          </a>{' '}
          · retain attribution and notices for any future assets.
        </p>
        <p>
          <a href="https://fdc.nal.usda.gov/download-datasets.html">FoodData Central reference</a> ·
          CC0 · ingredient tags require human confirmation.
        </p>
      </details>
    </TabFrame>
  );
}
function ImmuneViews(ctx: RiskTabProps) {
  const [research, setResearch] = useState(false);
  return (
    <>
      <nav className="risk-tab immune-view-switch" aria-label="Immune data source">
        <div className="risk-actions">
          <button type="button" aria-pressed={!research} onClick={() => setResearch(false)}>
            Crew check-in
          </button>
          <button type="button" aria-pressed={research} onClick={() => setResearch(true)}>
            NASA labs
          </button>
        </div>
      </nav>
      <div hidden={research}>
        <ImmunePanel {...ctx} />
      </div>
      {research && <ResearchReplay />}
    </>
  );
}
export default function ImmuneTab(ctx: RiskTabProps) {
  return (
    <Registered {...ctx}>
      <ImmuneViews key={scopeKey(ctx)} {...ctx} />
    </Registered>
  );
}
