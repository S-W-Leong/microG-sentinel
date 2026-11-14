import { useEffect, useRef, useState } from 'react';
import type { RiskEvaluationContext, RiskTabProps } from '../types';
import { ContextLink, DownloadButton, Registered } from '../cardio/TabUi';
import { makePmcPacket, queuePmcPacket } from '../cardio/pmc';
import { useTabUpdates } from '../cardio/useTabUpdates';
import {
  dateOf,
  emptyInput,
  evaluateMicrobiome,
  gutStore,
  gutSummary,
  loadDemo,
  readFibre,
  saveMicrobiome,
  type MicrobiomeInput,
} from './model';
import { Timeline } from './Timeline';
import { GutForm } from './GutForm';
import './microbiome.css';

const answer = (value: boolean | null) => (value === null ? 'Unknown' : value ? 'Yes' : 'No');

function GutContent(ctx: RiskEvaluationContext) {
  const person = ctx.vector.getVector(ctx.crewId)!;
  useTabUpdates(ctx, gutStore);
  const [draft, setDraft] = useState(() => emptyInput(person.exposures.asOf));
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [packet, setPacket] = useState<ReturnType<typeof makePmcPacket> | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const upload = useRef(0);
  useEffect(
    () => () => {
      upload.current++;
    },
    [],
  );
  const history = gutStore.history(ctx);
  const evaluation = evaluateMicrobiome(ctx, draft);
  const urgent = evaluation.escalation?.level === 'urgent';
  const selectedDate = selected || (history.length ? dateOf(history.slice(-1)[0]!.recordedAt) : '');
  const entry = history.filter((item) => dateOf(item.recordedAt) === selectedDate).slice(-1)[0];
  let currentFibre: number | null = null;
  try {
    currentFibre = readFibre(ctx, draft.recordedAt).grams;
  } catch {
    currentFibre = null;
  }
  const set = <Key extends keyof MicrobiomeInput>(key: Key, value: MicrobiomeInput[Key]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));

  function requestPmc() {
    const next = makePmcPacket(ctx, evaluation, { draft, history }, urgent ? 'urgent' : 'next-pmc');
    setPacket(next);
    setNotice(`${queuePmcPacket(next, null).notice} · not transmitted`);
  }
  function save() {
    try {
      saveMicrobiome(ctx, draft);
      setSelected(dateOf(draft.recordedAt));
      setNotice('Check-in saved for this session');
      setError('');
      setDraft({
        ...emptyInput(
          new Date(
            Math.min(Date.parse(person.exposures.asOf), Date.parse(draft.recordedAt) + 60_000),
          ).toISOString(),
        ),
        missionStart: draft.missionStart,
        fibreTargetG: draft.fibreTargetG,
        targetNote: draft.targetNote,
        antibiotics: draft.antibiotics,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check-in could not be saved.');
    }
  }
  async function preview(file?: File) {
    const token = ++upload.current;
    set('photo', null);
    setError('');
    setPhotoLoading(false);
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Choose a PNG, JPEG or WebP up to 5 MB.');
      return;
    }
    setPhotoLoading(true);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unreadable photo'));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = url;
      await image.decode();
      if (upload.current === token)
        setDraft((previous) => ({
          ...previous,
          photo: { name: file.name, url },
          skin: { redness: null, warmth: null, discharge: null },
        }));
    } catch {
      if (upload.current === token) setError('Choose another photo.');
    } finally {
      if (upload.current === token) setPhotoLoading(false);
    }
  }
  function demo() {
    try {
      loadDemo(ctx);
      const latest = gutStore.history(ctx).slice(-1)[0]!;
      setDraft((previous) => ({
        ...previous,
        missionStart: latest.missionStart,
        fibreTargetG: latest.fibreTargetG,
        targetNote: latest.targetNote,
        antibiotics: latest.antibiotics,
      }));
      setNotice('Simulated history loaded');
    } catch (cause) {
      setError(String(cause));
    }
  }

  return (
    <section className="risk-tab microbiome-tab" aria-label="Microbiome tab">
      <header className="risk-heading">
        <div>
          <span className="risk-kicker">Gut / skin observations</span>
          <h1>Microbiome</h1>
        </div>
        <span className="risk-id">{ctx.crewId}</span>
      </header>
      <div className="risk-badges">
        <span>
          {person.source === 'simulated-crew'
            ? 'Simulated crew'
            : person.source === 'user-entered'
              ? 'User entry'
              : 'Research participant'}
        </span>
        {person.simulated && <strong>Simulated</strong>}
      </div>
      {evaluation.escalation && (
        <aside className="risk-alert" role="alert">
          <strong>{urgent ? 'Contact the flight surgeon now' : 'Raise at your next PMC'}</strong>
          <p>{evaluation.escalation.text}</p>
          <button type="button" className="risk-primary" onClick={requestPmc}>
            Request PMC
          </button>
        </aside>
      )}
      {!urgent && (
        <div className="gut-result" aria-live="polite">
          <h2>{history.length ? gutSummary(history).split(' · ')[0] : 'No check-ins yet'}</h2>
          {gutSummary(history).includes(' · ') && <p>{gutSummary(history).split(' · ')[1]}</p>}
          <span>
            {history.length
              ? `Observed through ${dateOf(history.slice(-1)[0]!.recordedAt)}`
              : 'Record observations to begin.'}
          </span>
        </div>
      )}
      {ctx.crewId === 'SIM-CDR' && person.simulated && !history.length && (
        <button type="button" onClick={demo}>
          Load simulated history
        </button>
      )}
      <h2>Mission timeline</h2>
      <Timeline history={history} selected={selectedDate} onSelect={setSelected} />
      {selectedDate && (
        <section className="gut-day" aria-label="Selected day">
          <h3>{selectedDate}</h3>
          {entry ? (
            <>
              <dl>
                <div>
                  <dt>Fibre / 24h</dt>
                  <dd>
                    {entry.fibre.grams ?? 'Not recorded'}
                    {entry.fibre.grams !== null && ' g'}
                  </dd>
                </div>
                <div>
                  <dt>Appetite / 3</dt>
                  <dd>{entry.appetite ?? 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Skin signs / 3</dt>
                  <dd>
                    {Object.values(entry.skin).includes(null)
                      ? 'Not recorded'
                      : Object.values(entry.skin).filter(Boolean).length}
                  </dd>
                </div>
              </dl>
              <p>
                {entry.fibre.origin === 'simulated-fixture'
                  ? 'Simulated fibre fixture · not a Food log'
                  : 'Food exposure snapshot · complete totals only'}
              </p>
              {entry.photo && (
                <img
                  className="gut-photo"
                  src={entry.photo.url}
                  alt={`Local skin observation on ${selectedDate}`}
                />
              )}
              <p>
                Redness: {answer(entry.skin.redness)} · Warmth: {answer(entry.skin.warmth)} ·
                Discharge: {answer(entry.skin.discharge)}
              </p>
              <div className="gut-actions">
                <ContextLink ctx={ctx} risk="food" at={entry.recordedAt}>
                  Food
                </ContextLink>
                <ContextLink ctx={ctx} risk="immune" at={entry.recordedAt}>
                  Immune
                </ContextLink>
              </div>
            </>
          ) : (
            <p>No check-in recorded.</p>
          )}
        </section>
      )}
      <GutForm
        ctx={ctx}
        draft={draft}
        set={set}
        save={save}
        preview={preview}
        error={error}
        photoLoading={photoLoading}
        fibre={currentFibre}
      />
      <div className="gut-actions">
        <button type="button" onClick={requestPmc}>
          Request PMC
        </button>
        {packet && <DownloadButton value={packet} name="microbiome-pmc" />}
      </div>
      <p role="status">{notice}</p>
      <details>
        <summary>Method and sources</summary>
        <p>GSRS: unverified context only; no clinical score is calculated.</p>
        <p>UTC days use the last explicit daily change answer; missing days break continuity.</p>
        <p>
          Fibre uses complete Food totals captured on the same UTC date, or labelled simulated
          fixtures.
        </p>
        <p>Antibiotic bands show recorded courses, not an inferred cause.</p>
        <p>Gut and skin observations do not measure microbial composition.</p>
        <p>Session-only history; reload clears observations and photos.</p>
        <p>
          Research context: <a href="https://osdr.nasa.gov/bio/repo/">NASA OSDR</a> ·{' '}
          <a href="https://soma.weill.cornell.edu/apps/SOMA_Browser">SOMA</a>; no study files
          integrated or validated here.
        </p>
      </details>
      <footer>Prototype · not for clinical use</footer>
    </section>
  );
}

export default function MicrobiomeTab(props: RiskTabProps) {
  return (
    <Registered {...props}>
      <GutContent key={props.crewId} {...props} />
    </Registered>
  );
}
