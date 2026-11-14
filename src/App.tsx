import { useEffect, useRef, useState } from 'react';
import BodyMap from './components/BodyMap';
import Exercise from './screens/Exercise';
import ExerciseResearch from './screens/ExerciseResearch';
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
  const exercise = !route || route === 'exercise';
  const source = sourceLabel(
    route === 'exercise-research'
      ? 'nasa-research-replay'
      : exercise
        ? 'simulated-crew'
        : (result?.source ?? getActiveScope().source),
  );
  useEffect(() => {
    document.title = `${!route || route === 'exercise' ? 'Exercise Monitoring' : route === 'exercise-research' ? 'Exercise Research' : route === 'fitness' ? 'My Fitness' : route === 'understand' ? 'Understand My Assessment' : route === 'evidence' ? 'Evidence and Follow-up' : 'Body Map'} | MicroG Sentinel`;
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
          MicroG Sentinel
        </a>
        <nav aria-label="Main navigation">
          <a href="#/exercise" aria-current={exercise ? 'page' : undefined}>
            Exercise
          </a>
          <a
            href="#/exercise-research"
            aria-current={route === 'exercise-research' ? 'page' : undefined}
          >
            NASA evidence
          </a>
          <details className="about-menu" key={hash}>
            <summary>About</summary>
            <div className="about-content">
              <span className="eyebrow">MicroG Sentinel prototype</span>
              <h2>Useful evidence. Less collection.</h2>
              <p>
                Compare exercise response, identify evidence gaps and select the smallest useful
                observation from an already prescribed workout.
              </p>
              <a href="#/body-map">Explore the body map</a>
              <a href="#/fitness">Formal VO₂ assessments</a>
              <p className="subtle">
                Simulated crew workflows and a separate NASA bed-rest analog replay. No clinical or
                mission determination.
              </p>
            </div>
          </details>
        </nav>
      </header>
      <main id="main" ref={main} tabIndex={-1} className={exercise ? 'exercise-main' : ''}>
        {!exercise && (
          <div className="source-strip">
            <span className="simulation-badge">{source}</span>
            <a href="#/exercise">Return to exercise</a>
          </div>
        )}
        {!route || route === 'exercise' ? (
          <Exercise />
        ) : route === 'exercise-research' ? (
          <ExerciseResearch />
        ) : route === 'body-map' ? (
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
      <footer className="site-footer">
        <nav aria-label="Supporting tools">
          <a href="#/body-map" aria-current={route === 'body-map' ? 'page' : undefined}>
            Body Map
          </a>
          <a href="#/fitness" aria-current={route === 'fitness' ? 'page' : undefined}>
            My Fitness
          </a>
          {replay && <a href={`#/understand/${replay.assessmentId}`}>Demo: research replay</a>}
        </nav>
        <span className="footer-note">
          Offline prototype · No clinical or mission determination
        </span>
      </footer>
    </>
  );
}
