import { useEffect, useRef, useState } from 'react';
import BodyMap from './components/BodyMap';
import MyFitness from './screens/MyFitness';
import Understand from './screens/Understand';
import Evidence from './screens/Evidence';
import { sourceLabel } from './ui/presentation';
import { getReplayResult, getResult, getActiveScope } from './ui/dataSource';

export default function App() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    window.addEventListener('assessmentschange', update);
    return () => window.removeEventListener('assessmentschange', update);
  }, []);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const change = () => {
      setHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
      main.current?.focus();
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const [, route, id] = hash.split('/');
  const result = id ? getResult(id) : undefined;
  const replay = getReplayResult();
  useEffect(() => {
    document.title = `${route === 'fitness' ? 'My Fitness' : route === 'understand' ? 'Understand My Assessment' : route === 'evidence' ? 'Evidence and Follow-up' : 'Body Map'} | MicroG Sentinel`;
  }, [route]);
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
      <header className="site-header">
        <a className="brand" href="#/" aria-label="MicroG Sentinel home">
          <span className="brand-mark" aria-hidden="true">
            µG
          </span>{' '}
          MicroG Sentinel
        </a>
        <span className="simulation-badge">
          {sourceLabel(result?.source ?? getActiveScope().source)}
        </span>
        <nav aria-label="Main navigation">
          <a href="#/" aria-current={!route ? 'page' : undefined}>
            Body Map
          </a>
          <a href="#/fitness" aria-current={route === 'fitness' ? 'page' : undefined}>
            My Fitness
          </a>
          {replay && <a href={`#/understand/${replay.assessmentId}`}>Demo: research replay</a>}
        </nav>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {!route ? (
          <BodyMap />
        ) : route === 'fitness' ? (
          <MyFitness />
        ) : result && route === 'understand' ? (
          <Understand result={result} />
        ) : result && route === 'evidence' ? (
          <Evidence result={result} />
        ) : (
          <section className="panel">
            <h1>Assessment not found</h1>
            <p>This route does not match a bundled assessment.</p>
            <a href="#/fitness">Return to My Fitness</a>
          </section>
        )}
      </main>
      <footer>
        <span>MicroG Sentinel · NASA Space Apps 2026 prototype</span>
        <span>
          Simulated crew demonstration and NASA analog research replay · No clinical or mission
          determination
        </span>
      </footer>
    </>
  );
}
