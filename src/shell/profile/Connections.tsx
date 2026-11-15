import { useId, useState } from 'react';
import type { RiskId } from '../../risks/types';
import { routeHref, titles } from '../routes';
import { signalLabels, type Connection } from './model';

// Neighbouring nodes share a body region; the numbered paths key the readable ledger.
const nodes: { risk: RiskId; region: string; x: number; y: number }[] = [
  { risk: 'sleep', region: 'Head', x: 110, y: 70 },
  { risk: 'balance', region: 'Head', x: 110, y: 160 },
  { risk: 'mood', region: 'Head', x: 110, y: 250 },
  { risk: 'sans', region: 'Eyes', x: 110, y: 400 },
  { risk: 'cardio', region: 'Heart & lungs', x: 500, y: 520 },
  { risk: 'food', region: 'Gut', x: 890, y: 70 },
  { risk: 'microbiome', region: 'Gut', x: 890, y: 160 },
  { risk: 'immune', region: 'Skin', x: 890, y: 300 },
  { risk: 'bone', region: 'Bones', x: 890, y: 420 },
];

export default function Connections({
  connections,
  crewId,
}: {
  connections: Connection[];
  crewId: string;
}) {
  const id = useId().replace(/:/g, '');
  const [producer, setProducer] = useState<RiskId>('food');
  const pairs = [...new Set(connections.map((link) => `${link.producer}:${link.consumer}`))].map(
    (key) => {
      const links = connections.filter((link) => `${link.producer}:${link.consumer}` === key);
      return {
        key,
        links,
        producer: links[0].producer,
        consumer: links[0].consumer,
        active: links.some((link) => link.active),
        changed: links.some((link) => link.reason),
      };
    },
  );
  const focused = pairs.filter((pair) => pair.producer === producer);
  // Only connections with recorded data are listed up front; the full catalogue stays one click away.
  const activePairs = pairs.filter((pair) => pair.links.some((link) => link.active));
  const renderPair = (pair: (typeof pairs)[number], index: number) => (
    <div className="profile-link-group" key={pair.key}>
      <h3>
        <span className="profile-number">{index + 1}</span>{' '}
        <a href={routeHref('/risk/' + pair.producer, crewId)}>{titles[pair.producer]}</a> →{' '}
        <a href={routeHref('/risk/' + pair.consumer, crewId)}>{titles[pair.consumer]}</a>
      </h3>
      {pair.links.map((link) => (
        <a
          key={link.signal}
          href={routeHref('/risk/' + link.consumer, crewId)}
          className={`profile-link ${link.active ? 'active' : 'missing'} ${link.reason ? 'changed' : ''}`}
          data-signal={link.signal}
          data-consumer={link.consumer}
          data-active={link.active}
        >
          <span className="profile-link-label">
            {signalLabels[link.field]}{' '}
            <span
              aria-label={
                link.reason ? 'Changed result' : link.active ? 'Recorded' : 'Not recorded'
              }
            >
              {link.reason ? '↗' : link.active ? '●' : '○'}
            </span>
          </span>
          <span
            className={
              link.active && !['foodsEaten', 'allergensEaten'].includes(link.field)
                ? 'profile-value'
                : ''
            }
          >
            {link.value}
          </span>
          {link.reason && <small>↗ Changed result · {link.reason}</small>}
        </a>
      ))}
    </div>
  );
  return (
    <section className="profile-section profile-connections" aria-labelledby="connections-title">
      <header className="profile-section-head">
        <div>
          <h2 id="connections-title">Connections</h2>
          <p>One crew vector, nine connected tabs.</p>
        </div>
        <div className="profile-legend">
          <span>━ Recorded</span>
          <span>┄ Not recorded</span>
          <span className="profile-changed">↗ Changed result</span>
        </div>
      </header>
      <label className="profile-trace">
        Trace producer{' '}
        <select value={producer} onChange={(event) => setProducer(event.target.value as RiskId)}>
          {nodes.map((node) => (
            <option key={node.risk} value={node.risk}>
              {titles[node.risk]}
            </option>
          ))}
        </select>
      </label>
      <svg
        className="profile-graph"
        viewBox="0 0 1000 580"
        aria-label="Risk connections by body region"
      >
        <defs>
          {['active', 'missing', 'changed'].map((state) => (
            <marker
              key={state}
              id={`${id}-${state}`}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0 0 L8 4 L0 8 Z" className={`profile-arrow ${state}`} />
            </marker>
          ))}
        </defs>
        <rect className="profile-region" x="12" y="15" width="196" height="278" rx="16" />
        <rect className="profile-region" x="792" y="15" width="196" height="188" rx="16" />
        {pairs.map((pair, index) => {
          const from = nodes.find((node) => node.risk === pair.producer)!;
          const to = nodes.find((node) => node.risk === pair.consumer)!;
          const sameSide = from.x === to.x;
          const startX = from.x + (from.x < 500 ? 82 : from.x > 500 ? -82 : 0);
          const endX = to.x + (to.x < 500 ? 82 : to.x > 500 ? -82 : 0);
          const bend = sameSide
            ? from.x < 500
              ? 330 + index * 5
              : 670 - index * 5
            : 430 + index * 7;
          const selected = pair.producer === producer;
          const labelY = 55 + focused.indexOf(pair) * (390 / Math.max(1, focused.length - 1));
          const fromY = from.x === 500 ? from.y - 28 : from.y;
          const toY = to.x === 500 ? to.y - 28 : to.y;
          const inputX = from.x > 500 ? 645 : 355;
          const outputX = to.x > 500 ? 645 : 355;
          const inputBend = from.x > 500 ? 730 : 270;
          const outputBend = to.x > 500 ? 730 : 270;
          const path = selected
            ? `M ${startX} ${fromY} C ${inputBend} ${fromY}, ${inputBend} ${labelY - 12}, ${inputX} ${labelY - 12} M ${outputX} ${labelY + 12} C ${outputBend} ${labelY + 12}, ${outputBend} ${toY}, ${endX} ${toY}`
            : `M ${startX} ${fromY} C ${bend} ${fromY}, ${bend} ${toY}, ${endX} ${toY}`;
          const state = pair.changed ? 'changed' : pair.active ? 'active' : 'missing';
          const label = `${titles[pair.producer]} → ${titles[pair.consumer]} · ${pair.links.map((link) => `${signalLabels[link.field]}: ${link.value}${link.reason ? `; ${link.reason}` : ''}`).join(' · ')}`;
          return (
            <a
              key={pair.key}
              href={routeHref('/risk/' + pair.consumer, crewId)}
              aria-label={label}
              className={`profile-path ${state} ${selected ? 'selected' : 'unselected'}`}
            >
              <title>{label}</title>
              <path d={path} className="profile-path-hit" />
              <path d={path} className="profile-path-line" markerEnd={`url(#${id}-${state})`} />
              {!selected && (
                <text
                  x={(startX + 6 * bend + endX) / 8}
                  y={(from.y + to.y) / 2 - 5}
                  className="profile-edge-number"
                >
                  {index + 1}
                </text>
              )}
            </a>
          );
        })}
        {focused.map((pair, index) => {
          const y = 55 + index * (390 / Math.max(1, focused.length - 1));
          const reason = pair.links.find((link) => link.reason)?.reason;
          return (
            <a
              key={pair.key}
              href={routeHref('/risk/' + pair.consumer, crewId)}
              className={`profile-annotation ${pair.changed ? 'changed' : ''}`}
            >
              <rect
                x="355"
                y={y - 28}
                width="290"
                height={35 + pair.links.length * 15 + (reason ? 16 : 0)}
                rx="5"
              />
              <text x="368" y={y - 10}>
                {titles[pair.producer]} → {titles[pair.consumer]}
                {reason ? ' ↗' : ''}
              </text>
              {pair.links.map((link, line) => (
                <text
                  key={link.signal}
                  className="profile-annotation-value"
                  x="368"
                  y={y + 9 + line * 15}
                >
                  {signalLabels[link.field]} ·{' '}
                  {link.value.length > 32 ? link.value.slice(0, 31) + '…' : link.value}
                </text>
              ))}
              {reason && (
                <text
                  x="368"
                  y={y + 10 + pair.links.length * 15}
                  className="profile-annotation-reason"
                >
                  {reason}
                </text>
              )}
            </a>
          );
        })}
        {nodes.map((node) => (
          <a
            key={node.risk}
            href={routeHref('/risk/' + node.risk, crewId)}
            aria-label={`${titles[node.risk]}, ${node.region}`}
            className="profile-node"
          >
            <rect x={node.x - 80} y={node.y - 27} width="160" height="54" rx="6" />
            <text x={node.x} y={node.y - 6} className="profile-node-region">
              {node.region}
            </text>
            <text x={node.x} y={node.y + 14}>
              {titles[node.risk]}
            </text>
          </a>
        ))}
      </svg>
      <nav className="profile-mobile-nodes" aria-label="Risk tabs">
        {nodes.map((node) => (
          <a key={node.risk} href={routeHref('/risk/' + node.risk, crewId)}>
            {titles[node.risk]}
            <small>{node.region}</small>
          </a>
        ))}
      </nav>
      <p className="profile-graph-key">
        {focused.length === 0
          ? 'No outgoing catalogue links for this tab.'
          : 'Recorded links are listed below.'}
      </p>
      {activePairs.length > 0 && (
        <div className="profile-links">
          {activePairs.map((pair, index) => renderPair(pair, index))}
        </div>
      )}
      <details className="profile-all-links">
        <summary>All connections ({pairs.length})</summary>
        <div className="profile-links">{pairs.map((pair, index) => renderPair(pair, index))}</div>
      </details>
    </section>
  );
}
