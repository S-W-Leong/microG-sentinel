import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { RiskTabProps } from '../risks/types';
import AstronautView from './astronaut3d/AstronautView';
import RegionDetails from './astronaut3d/RegionDetails';
import type { ProjectedMarkers, RegionFlags, RegionId } from './astronaut3d/types';
import { regions, titles } from './routes';
import { tabStatus } from './registry';
import RadiationCard from './radiation/RadiationCard';

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
  const projected = useRef<ProjectedMarkers | null>(null);
  const leaderGeometry = useRef<
    {
      id: RegionId;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      offsetX: number;
      offsetY: number;
      left: boolean;
      path: SVGPathElement;
    }[]
  >([]);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const board = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const noteButton = useRef<HTMLButtonElement>(null);
  useEffect(() => vector.subscribe(crewId, refresh), [crewId, vector]);
  const region = regions.find((item) => item.id === selected);
  const statusesByRegion = regions.map((item) => ({
    id: item.id,
    statuses: item.tabs.map((risk) => ({ risk, ...tabStatus(risk, { crewId, vector }) })),
  }));
  const flags = Object.fromEntries(
    statusesByRegion.map(({ id, statuses }) => [
      id,
      statuses.some((status) => status.evaluation?.escalation?.level === 'urgent')
        ? 'urgent'
        : statuses.some((status) => status.evaluation?.escalation)
          ? 'next-pmc'
          : statuses.every((status) => status.text === 'Planned')
            ? 'planned'
            : statuses.some((status) => status.evaluation?.value != null)
              ? 'recorded'
              : 'empty',
    ]),
  ) as RegionFlags;
  const drawLeaders = useCallback((positions: ProjectedMarkers | null) => {
    projected.current = positions;
    for (const entry of leaderGeometry.current) {
      const position = positions?.[entry.id];
      const endX = position ? entry.offsetX + position.x : entry.endX;
      const endY = position ? entry.offsetY + position.y : entry.endY;
      entry.path.style.display = position && !position.visible ? 'none' : '';
      entry.path.setAttribute(
        'd',
        `M${entry.startX} ${entry.startY}H${entry.startX + (entry.left ? 18 : -18)}L${endX} ${endY}`,
      );
    }
  }, []);
  useLayoutEffect(() => {
    const element = board.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const stage = figure.current?.getBoundingClientRect();
      if (!stage) return;
      leaderGeometry.current = regions.map((item, index) => {
        const card = element
          .querySelector('[data-card="' + item.id + '"]')!
          .getBoundingClientRect();
        const left = index % 2 === 0;
        return {
          id: item.id,
          left,
          startX: (left ? card.right : card.left) - bounds.left,
          startY: card.top - bounds.top + 28,
          offsetX: stage.left - bounds.left,
          offsetY: stage.top - bounds.top,
          endX: stage.left - bounds.left + (stage.width * item.point[0]) / 480,
          endY: stage.top - bounds.top + (stage.height * item.point[1]) / 640,
          path: element.querySelector<SVGPathElement>('[data-leader="' + item.id + '"]')!,
        };
      });
      drawLeaders(projected.current);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (figure.current) observer.observe(figure.current);
    element.querySelectorAll('[data-card]').forEach((card) => observer.observe(card));
    measure();
    element.addEventListener('animationend', measure);
    element.addEventListener('transitionend', measure);
    const settle = window.setTimeout(measure, 900);
    return () => {
      observer.disconnect();
      element.removeEventListener('animationend', measure);
      element.removeEventListener('transitionend', measure);
      window.clearTimeout(settle);
    };
  }, [selected, drawLeaders]);
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
            ?.querySelector<HTMLButtonElement>('[data-card="' + selected + '"] .body-chip')
            ?.focus();
          setSelected(null);
        }
      }}
    >
      <p className="body-simulation">Simulated</p>
      <h1 id="body-title">Body map</h1>
      <div className="body-board" ref={board}>
        <svg className="body-leaders" aria-hidden="true">
          {regions.map((item) => (
            <path
              key={item.id}
              data-leader={item.id}
              className={selected === item.id ? 'active' : ''}
            />
          ))}
        </svg>
        <div className="body-figure">
          <div
            className="body-stage"
            ref={figure}
            data-selected={selected === 'heart-lungs' ? 'heart' : (selected ?? '')}
          >
            <AstronautView
              selected={selected}
              onSelect={setSelected}
              flags={flags}
              onProject={drawLeaders}
            />
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
          const statuses = statusesByRegion[index].statuses;
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
                <RegionDetails
                  region={item.id}
                  name={item.name}
                  statuses={statuses}
                  crewId={crewId}
                />
              </div>
            </article>
          );
        })}
      </div>
      <RadiationCard crewId={crewId} />
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
