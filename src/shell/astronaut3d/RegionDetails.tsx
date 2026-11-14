import { useState } from 'react';
import type { RiskId } from '../../risks/types';
import { routeHref, titles } from '../routes';
import type { tabStatus } from '../registry';
import type { RegionId } from './types';

type Status = ReturnType<typeof tabStatus> & { risk: RiskId };
export default function RegionDetails({
  region,
  name,
  statuses,
  crewId,
}: {
  region: RegionId;
  name: string;
  statuses: Status[];
  crewId: string;
}) {
  const [active, setActive] = useState(statuses[0].risk);
  const status = statuses.find((item) => item.risk === active) ?? statuses[0];
  return (
    <>
      <div role="tablist" aria-label={name} className="body-tabs">
        {statuses.map((item, index) => (
          <button
            key={item.risk}
            type="button"
            role="tab"
            id={`tab-${region}-${item.risk}`}
            aria-controls={`panel-${region}`}
            aria-selected={item.risk === status.risk}
            tabIndex={item.risk === status.risk ? 0 : -1}
            onClick={() => setActive(item.risk)}
            onKeyDown={(event) => {
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? statuses.length - 1
                    : event.key === 'ArrowRight'
                      ? (index + 1) % statuses.length
                      : event.key === 'ArrowLeft'
                        ? (index + statuses.length - 1) % statuses.length
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setActive(statuses[next].risk);
              const buttons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              buttons?.[next].focus();
            }}
          >
            {titles[item.risk]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${region}`} aria-labelledby={`tab-${region}-${status.risk}`}>
        {status.evaluation?.value != null && <p>{status.evaluation.label}</p>}
        {status.text === 'Planned' && <p>Planned</p>}
        <a className="shell-primary" href={routeHref('/risk/' + status.risk, crewId)}>
          Open <span aria-hidden="true">&#8599;</span>
        </a>
      </div>
    </>
  );
}
