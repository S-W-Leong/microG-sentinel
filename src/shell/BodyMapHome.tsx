import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { RiskTabProps } from '../risks/types';
import astronaut from './astronaut.svg?raw';
import { regions, routeHref, titles } from './routes';
import { tabStatus } from './registry';

type RegionId = (typeof regions)[number]['id'];
export interface LocalNote {
  crewId: string;
  text: string;
}

export default function BodyMapHome({
  crewId,
  vector,
  notes,
  queueNote,
}: RiskTabProps & {
  notes: LocalNote[];
  queueNote: (note: LocalNote) => void;
}) {
  const [selected, setSelected] = useState<RegionId | null>(null);
  const [, refresh] = useReducer((value) => value + 1, 0);
  const [leaders, setLeaders] = useState<{ id: string; path: string }[]>([]);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const board = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const noteButton = useRef<HTMLButtonElement>(null);
  useEffect(() => vector.subscribe(crewId, refresh), [crewId, vector]);
  const region = regions.find((item) => item.id === selected);
  const art = astronaut
    .replace(
      /cx="240" cy="100" r="49"/g,
      region
        ? 'cx="' + region.point[0] + '" cy="' + region.point[1] + '" r="' + region.radius + '"'
        : 'cx="240" cy="100" r="49"',
    )
    .replace(
      'id="lens-pass"',
      'id="lens-pass" transform="translate(0 ' + (region?.point[1] ?? 100) + ')"',
    );
  useLayoutEffect(() => {
    const element = board.current;
    if (!element) return;
    const draw = () => {
      const bounds = element.getBoundingClientRect();
      const stage = figure.current?.getBoundingClientRect();
      if (!stage) return;
      setLeaders(
        regions.map((item, index) => {
          const card = element
            .querySelector('[data-card="' + item.id + '"]')!
            .getBoundingClientRect();
          const left = index % 2 === 0;
          const startX = (left ? card.right : card.left) - bounds.left;
          const startY = card.top - bounds.top + 28;
          const endX = stage.left - bounds.left + (stage.width * item.point[0]) / 480;
          const endY = stage.top - bounds.top + (stage.height * item.point[1]) / 640;
          return {
            id: item.id,
            path:
              'M' +
              startX +
              ' ' +
              startY +
              'H' +
              (startX + (left ? 18 : -18)) +
              'L' +
              endX +
              ' ' +
              endY,
          };
        }),
      );
    };
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    if (figure.current) observer.observe(figure.current);
    element.querySelectorAll('[data-card]').forEach((card) => observer.observe(card));
    draw();
    // Entrance animations move cards without resizing them, so redraw once they settle.
    element.addEventListener('animationend', draw);
    element.addEventListener('transitionend', draw);
    const settle = window.setTimeout(draw, 900);
    return () => {
      observer.disconnect();
      element.removeEventListener('animationend', draw);
      element.removeEventListener('transitionend', draw);
      window.clearTimeout(settle);
    };
  }, [selected]);
  function selectRegion(id: RegionId) {
    setSelected((current) => (current === id ? null : id));
  }
  return (
    <section
      className="body-home"
      aria-labelledby="body-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !dialog.current?.open && selected) {
          board.current
            ?.querySelector<HTMLButtonElement>('[data-select="' + selected + '"]')
            ?.focus();
          setSelected(null);
        }
      }}
    >
      <p className="eyebrow">Simulated crew</p>
      <h1 id="body-title">Body map</h1>
      <div className="body-board" ref={board}>
        <svg className="body-leaders" aria-hidden="true">
          {leaders.map((leader) => (
            <path
              key={leader.id}
              d={leader.path}
              className={selected === leader.id ? 'active' : ''}
            />
          ))}
        </svg>
        <div className="body-figure">
          <div
            className="body-stage"
            ref={figure}
            data-selected={selected === 'heart-lungs' ? 'heart' : (selected ?? '')}
          >
            <div
              className="body-art"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: art }}
            />
            {regions.map((item) => (
              <button
                key={item.id}
                className="body-hotspot"
                type="button"
                data-select={item.id}
                style={{
                  left: (item.point[0] / 480) * 100 + '%',
                  top: (item.point[1] / 640) * 100 + '%',
                }}
                aria-label={'Scan ' + item.name}
                aria-pressed={selected === item.id}
                aria-controls={'region-' + item.id}
                onClick={() => selectRegion(item.id)}
              />
            ))}
          </div>
          <p className="body-caption" role="status">
            {region ? region.name : 'Tap a region'}
          </p>
          <button
            type="button"
            ref={noteButton}
            onClick={() => {
              setNotice('');
              dialog.current?.showModal();
            }}
          >
            + Something else
          </button>
        </div>
        {regions.map((item, index) => {
          const statuses = item.tabs.map((risk) => ({
            risk,
            ...tabStatus(risk, { crewId, vector }),
          }));
          const escalations = statuses.filter((status) => status.evaluation?.escalation);
          const expanded = item.id === selected;
          return (
            <article
              key={item.id}
              data-card={item.id}
              className={'body-card' + (expanded ? ' expanded' : '')}
              style={{ gridColumn: index % 2 === 0 ? 1 : 3, gridRow: Math.floor(index / 2) + 1 }}
            >
              <button
                type="button"
                className="body-chip"
                aria-expanded={expanded}
                aria-controls={'region-' + item.id}
                onClick={() => selectRegion(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  {statuses.map((status) => (
                    <span className="body-status" key={status.risk}>
                      {titles[status.risk]} ·{' '}
                      <span className={status.evaluation?.value != null ? 'body-value' : ''}>
                        {status.text}
                      </span>
                    </span>
                  ))}
                </span>
                <span aria-hidden="true">{expanded ? '−' : '+'}</span>
              </button>
              {escalations.map((status) => (
                <p className="body-escalation" key={status.risk}>
                  <span aria-hidden="true">
                    {status.evaluation!.escalation!.level === 'urgent' ? '⚠' : '⚑'}
                  </span>{' '}
                  {status.evaluation!.escalation!.level === 'urgent'
                    ? 'Contact the flight surgeon now'
                    : 'Raise at your next PMC'}
                  <small>{status.evaluation!.escalation!.text}</small>
                </p>
              ))}
              <div id={'region-' + item.id} hidden={!expanded} className="body-details">
                {statuses.map((status) => (
                  <div key={status.risk}>
                    {status.evaluation?.value != null && <p>{status.evaluation.label}</p>}
                    <a href={routeHref('/risk/' + status.risk, crewId)}>
                      {titles[status.risk]} <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <details className="shell-demo">
        <summary>Demo path</summary>
        <p>
          For SIM-CDR: Food → Load demo → Save check-in; Skin → Immune → Load sample → Save
          check-in.
        </p>
        <p>
          The simulated rule changes the base 60% match to 80% using food exposure and allergy
          traits.
        </p>
      </details>
      <dialog
        className="shell-note"
        ref={dialog}
        aria-labelledby="note-title"
        onClose={() => noteButton.current?.focus()}
      >
        <h2 id="note-title">Raise at your next PMC</h2>
        <p>Local session only · not transmitted.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) return;
            queueNote({ crewId, text: note.trim() });
            setNote('');
            setNotice('Queued locally · not transmitted.');
          }}
        >
          <label htmlFor="body-note">Your note</label>
          <textarea
            id="body-note"
            maxLength={500}
            required
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button type="submit" className="shell-primary">
            Queue note
          </button>
          <button type="button" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </form>
        <p role="status">{notice}</p>
        <ul>
          {notes
            .filter((item) => item.crewId === crewId)
            .map((item, index) => (
              <li key={index}>{item.text}</li>
            ))}
        </ul>
      </dialog>
    </section>
  );
}
