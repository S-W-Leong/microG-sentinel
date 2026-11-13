import { useState } from 'react';
import { getLatestResult } from '../ui/dataSource';
import { nasa } from '../ui/presentation';
import { StatusBadge } from './AssessmentCard';

const planned = [
  {
    name: 'Head · sleep and stress',
    text: 'NASA studies risks from inadequate sleep and irregular schedules, as well as behavioral changes. This planned module does not assess these risks.',
    x: 150,
    y: 52,
    r: 27,
  },
  {
    name: 'Skin and immune',
    text: 'NASA identifies altered immune system responses as a spaceflight risk. This planned module has no measurements or assessment.',
    x: 87,
    y: 184,
    r: 19,
  },
  {
    name: 'Eyes and circulation',
    text: 'NASA studies cardiovascular adaptations and spaceflight-associated neuro-ocular syndrome (SANS). This planned module provides no assessment.',
    x: 183,
    y: 82,
    r: 16,
  },
  {
    name: 'Bones and muscles',
    text: 'NASA studies spaceflight-induced bone changes. This planned module provides no bone or muscle assessment.',
    x: 175,
    y: 330,
    r: 23,
  },
];
export default function BodyMap() {
  const [selected, setSelected] = useState<number | null>(null);
  const latest = getLatestResult();
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">CREW REVIEW / 01</div>
        <h1>Your fitness, in context.</h1>
        <p>
          Start with heart and lungs to review your aerobic fitness assessment against your personal
          baseline.
        </p>
      </div>
      <div className="body-layout panel">
        <div className="body-figure">
          <svg
            viewBox="0 0 300 460"
            role="group"
            aria-label="Body map. Heart and lungs is the live module; all other regions are planned."
          >
            <path
              className="figure-outline"
              d="M150 22a29 29 0 1 1 0 58a29 29 0 1 1 0-58M126 87L99 102 73 206 87 215 113 146 116 239 105 418 130 418 150 278 170 418 195 418 184 239 187 146 213 215 227 206 201 102 174 87Z"
            />
            <path
              className="figure-detail"
              d="M150 96V239M119 239H181M126 114L119 178M174 114L181 178"
            />
            {planned.map((region, index) => (
              <g
                key={region.name}
                className="body-region planned-region"
                role="button"
                tabIndex={0}
                aria-label={`${region.name}. Planned module. ${region.text}`}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelected(index);
                  }
                }}
              >
                <circle cx={region.x} cy={region.y} r={region.r} />
                <text x={region.x} y={region.y + 5} textAnchor="middle" aria-hidden="true">
                  {index + 1}
                </text>
              </g>
            ))}
            <a
              href="#/fitness"
              className="body-region live-region"
              aria-label={`Heart and lungs. Live module. Latest evidence: ${latest?.evidence ?? 'unavailable'}. Open My Fitness.`}
            >
              <rect x="112" y="108" width="76" height="85" rx="24" />
              <path d="M145 124C129 123 122 148 124 164Q130 177 145 165ZM155 124C171 123 178 148 176 164Q170 177 155 165Z" />
              <path d="M142 157Q150 148 158 157Q163 164 150 176Q137 164 142 157Z" />
            </a>
            <text x="150" y="450" textAnchor="middle" className="figure-caption">
              Select a region to explore
            </text>
          </svg>
        </div>
        <div className="body-modules">
          <div className="live-module">
            <div className="eyebrow">LIVE MODULE</div>
            <h2>Heart and lungs</h2>
            <p>Aerobic capacity · personal baseline comparison</p>
            {latest && <StatusBadge result={latest} />}
            <p>
              <a className="button" href="#/fitness">
                Open My Fitness →
              </a>
            </p>
          </div>
          <h3>Future modules</h3>
          <div className="planned-list">
            {planned.map((region, index) => (
              <button
                key={region.name}
                className={`planned-button ${selected === index ? 'selected' : ''}`}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                aria-expanded={selected === index}
                aria-controls="planned-description"
              >
                <span>
                  {index + 1} / {region.name}
                </span>
                <small>Planned module</small>
              </button>
            ))}
          </div>
          <div id="planned-description" className="planned-description" aria-live="polite">
            {selected === null ? (
              <p>
                Select a planned region for its NASA risk context. No values or scores are assigned.
              </p>
            ) : (
              <>
                <h3>{planned[selected].name}</h3>
                <p>{planned[selected].text}</p>
                <a href={nasa.risks}>NASA · Risks of Human Spaceflight ↗</a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
