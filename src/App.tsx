import { missionDay } from './scenario/mission';
import { useEffect, useRef, useState } from 'react';
import Exercise from './screens/Exercise';
import ExerciseResearch from './screens/ExerciseResearch';
import MyFitness from './screens/MyFitness';
import Understand from './screens/Understand';
import Evidence from './screens/Evidence';
import { sourceLabel } from './ui/presentation';
import { getResult, getActiveScope } from './ui/dataSource';
import type { RiskId } from './risks/types';
import BodyMapHome from './shell/BodyMapHome';
import CrewProfile from './shell/profile/CrewProfile';
import type { LocalNote } from './shell/BodyMapHome';
import {
  crews,
  navigationHref,
  parseRoute,
  regionForRisk,
  routeHref,
  titles,
} from './shell/routes';
import { riskTabs } from './shell/registry';
import { demoTime, vector } from './shell/vector';
import './shell/shell.css';

export default function App() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  const [, refresh] = useState(0);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const main = useRef<HTMLElement>(null);
  const { page, id, crewId, at } = parseRoute(hash);
  const home = !page || page === 'body-map';
  const profile = page === 'profile';
  const region = page === 'risk' ? regionForRisk(id) : undefined;
  const tab = region ? riskTabs[id as RiskId] : undefined;
  const Component = tab?.Component;
  const result = id && page !== 'risk' ? getResult(id) : undefined;
  const source = sourceLabel(
    page === 'exercise-research'
      ? 'nasa-research-replay'
      : page === 'exercise'
        ? 'simulated-crew'
        : (result?.source ?? getActiveScope().source),
  );
  useEffect(() => {
    const change = () => {
      setHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    };
    const navigate = (event: Event) => {
      const href = navigationHref((event as CustomEvent<unknown>).detail);
      if (href) {
        if (window.location.hash === href) change();
        else window.location.hash = href;
      }
    };
    const update = () => refresh((value) => value + 1);
    window.addEventListener('hashchange', change);
    window.addEventListener('microg:risk-navigation', navigate);
    window.addEventListener('assessmentschange', update);
    return () => {
      window.removeEventListener('hashchange', change);
      window.removeEventListener('microg:risk-navigation', navigate);
      window.removeEventListener('assessmentschange', update);
    };
  }, []);
  useEffect(() => {
    const title = home
      ? 'Body map'
      : region
        ? titles[id as RiskId]
        : page === 'profile'
          ? 'Crew profile'
          : page === 'exercise-research'
            ? 'NASA evidence'
            : page === 'exercise'
              ? 'Exercise monitoring'
              : page === 'fitness'
                ? 'My Fitness'
                : page === 'understand'
                  ? 'Understand my assessment'
                  : 'Evidence and follow-up';
    document.title = title + ' | MicroG Sentinel';
  }, [home, region, id, page]);
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header shell-header">
        <a className="brand" href={routeHref('/', crewId)} aria-label="MicroG Sentinel home">
          MicroG Sentinel
        </a>
        <nav aria-label="Main navigation">
          <a href={routeHref('/', crewId)} aria-current={home ? 'page' : undefined}>
            Body map
          </a>
          <a href={routeHref('/profile', crewId)} aria-current={profile ? 'page' : undefined}>
            Crew profile
          </a>
          <a
            href="#/exercise-research"
            aria-current={page === 'exercise-research' ? 'page' : undefined}
          >
            NASA evidence
          </a>
        </nav>
        {(home || region || profile) && (
          <label className="shell-crew">
            Simulated crew
            <select
              aria-label="Simulated crew"
              value={crewId}
              onChange={(event) => {
                window.location.hash = routeHref(
                  region ? '/risk/' + id : profile ? '/profile' : '/',
                  event.target.value,
                  at,
                );
              }}
            >
              {crews.map((crew) => (
                <option key={crew} value={crew}>
                  {crew}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className={page === 'exercise' ? 'exercise-main' : 'shell-main'}
      >
        {(home || region) && (
          <p className="shell-clock">
            Mission day {missionDay} · <time dateTime={demoTime}>14 Nov 2026</time>
          </p>
        )}
        {!home && !region && !profile && page !== 'exercise' && (
          <div className="source-strip">
            <span className="simulation-badge">{source}</span>
            <a href={routeHref('/', crewId)}>Body map</a>
          </div>
        )}
        {home ? (
          <BodyMapHome
            key={crewId}
            crewId={crewId}
            vector={vector}
            notes={notes}
            queueNote={(note) => setNotes((current) => [...current, note])}
          />
        ) : profile ? (
          <CrewProfile key={crewId} crewId={crewId} vector={vector} />
        ) : region ? (
          <>
            <header className="shell-risk-header">
              <a href={routeHref('/', crewId)}>← Body map</a>
              <h1>{region.name}</h1>
              <nav aria-label="Region tabs">
                {region.tabs.map((risk) => (
                  <a
                    key={risk}
                    href={routeHref('/risk/' + risk, crewId, at)}
                    aria-current={risk === id ? 'page' : undefined}
                  >
                    {titles[risk]}
                  </a>
                ))}
              </nav>
              <span className="shell-person">{crewId} · Simulated</span>
            </header>
            {Component ? (
              <Component key={id + crewId + (at ?? '')} crewId={crewId} vector={vector} />
            ) : (
              <section className="panel">
                <h2>{titles[id as RiskId]}</h2>
                <p>Planned</p>
                <p>No measurements or assessments are available.</p>
              </section>
            )}
          </>
        ) : page === 'exercise' ? (
          <Exercise />
        ) : page === 'exercise-research' ? (
          <ExerciseResearch />
        ) : page === 'fitness' ? (
          <MyFitness />
        ) : result && page === 'understand' ? (
          <Understand result={result} />
        ) : result && page === 'evidence' ? (
          <Evidence result={result} />
        ) : (
          <section className="panel">
            <h1>Assessment not found</h1>
            <p>This route does not match a bundled assessment.</p>
            <a href={routeHref('/', crewId)}>Body map</a>
          </section>
        )}
      </main>
      <footer className="site-footer shell-footer">Prototype · not for clinical use</footer>
    </>
  );
}
