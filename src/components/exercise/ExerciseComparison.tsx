import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { ArrowRight, Circle, MinusCircle } from '@phosphor-icons/react';
import { evidenceLabel, type StageReading } from '../../ui/exercisePresentation';

export default function ExerciseComparison({ rows }: { rows: readonly StageReading[] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const draw = () => {
      const width = host.clientWidth;
      if (!width) return;
      const baseline = rows.filter((r) => r.baselineRange !== null);
      const latest = rows.filter((r) => r.currentBpm !== null);
      const numbers = rows.flatMap((r) => [
        ...(r.baselineRange ?? []),
        ...(r.currentBpm === null ? [] : [r.currentBpm]),
      ]);
      const lower = numbers.length ? Math.floor((Math.min(...numbers) - 5) / 10) * 10 : 0;
      const upper = numbers.length ? Math.ceil((Math.max(...numbers) + 5) / 10) * 10 : 100;
      const ticks = Array.from(
        { length: Math.floor((upper - lower) / 10) + 1 },
        (_, i) => lower + i * 10,
      );
      const plot = Plot.plot({
        width,
        height: window.innerHeight < 800 ? 350 : 420,
        marginTop: 35,
        marginBottom: 55,
        marginLeft: 92,
        marginRight: 28,
        style: {
          background: 'transparent',
          color: '#aab7bd',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '13px',
        },
        x: { domain: [lower, upper], axis: null },
        y: { domain: rows.map((r) => r.id), axis: null, label: null, padding: 0.45 },
        marks: [
          Plot.axisX({
            ticks,
            tickSize: 7,
            label: 'HEART RATE (BPM)',
            labelAnchor: 'right',
            labelOffset: 42,
          }),
          Plot.axisY({
            tickSize: 0,
            tickPadding: 20,
            fontSize: 27,
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontWeight: 600,
            tickFormat: (id: string) => {
              const row = rows.find((r) => r.id === id);
              return row?.workloadW === null ? 'Unknown' : `${row?.workloadW} W`;
            },
          }),
          Plot.ruleY(baseline, {
            y: 'id',
            x1: (r: StageReading) => r.baselineRange![0],
            x2: (r: StageReading) => r.baselineRange![1],
            stroke: '#aabfc8',
            strokeWidth: 3,
            dy: 5,
          }),
          Plot.dot(baseline, {
            x: 'baselineMean',
            y: 'id',
            r: 6,
            fill: '#aabfc8',
            dy: 5,
            title: (r: StageReading) => `Recorded baseline: ${r.baselineRange!.join('–')} bpm`,
          }),
          Plot.dot(latest, {
            x: 'currentBpm',
            y: 'id',
            r: 6.5,
            fill: '#f2efe7',
            stroke: '#111315',
            strokeWidth: 1.5,
            dy: -5,
            title: (r: StageReading) => `Current: ${r.currentBpm} bpm`,
          }),
          Plot.text(baseline, {
            x: 'baselineMean',
            y: 'id',
            text: (r: StageReading) => `${r.baselineRange!.join('–')} bpm`,
            dy: 31,
            fill: '#aabfc8',
            fontSize: 13,
          }),
          Plot.text(latest, {
            x: 'currentBpm',
            y: 'id',
            text: (r: StageReading) => `${r.currentBpm} bpm`,
            dy: -24,
            fill: '#f2efe7',
            fontSize: 13,
          }),
          // An absent measurement has no x coordinate and no quantitative mark.
          Plot.text(
            rows.filter((r) => r.currentBpm === null),
            {
              y: 'id',
              frameAnchor: 'right',
              text: () => 'MISSING / NO POINT PLOTTED',
              textAnchor: 'end',
              fill: '#ff6b3d',
              fontSize: 12,
            },
          ),
        ],
      });
      plot.setAttribute(
        'aria-label',
        'Heart rate by prescribed workload. Missing measurements are not plotted. Full values follow.',
      );
      host.replaceChildren(plot);
    };
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    draw();
    return () => {
      observer.disconnect();
      host.replaceChildren();
    };
  }, [rows]);

  return (
    <>
      <div className="comparison-plot" ref={container} />
      <div className="mobile-readings" aria-label="Exercise response values">
        {rows.map((row) => (
          <article className="mobile-reading" key={row.id}>
            <header>
              <strong>{row.workloadW ?? 'Unknown'} W</strong>
              <span className="reading-state">
                {row.currentBpm === null ? (
                  <MinusCircle size={16} />
                ) : (
                  <Circle size={12} weight="fill" />
                )}
                {evidenceLabel[row.state]}
              </span>
            </header>
            <dl>
              <div>
                <dt>Baseline HR</dt>
                <dd>{row.baselineRange ? `${row.baselineRange.join('–')} bpm` : 'Withheld'}</dd>
              </div>
              <div>
                <dt>Current HR</dt>
                <dd className={row.currentBpm === null ? 'text-accent' : ''}>
                  {row.currentBpm === null ? 'Missing' : `${row.currentBpm} bpm`}
                </dd>
              </div>
              <div>
                <dt>Difference</dt>
                <dd>
                  {row.deltaBpm === null
                    ? 'Withheld'
                    : `${row.deltaBpm >= 0 ? '+' : ''}${row.deltaBpm.toFixed(1)} bpm`}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <details className="comparison-values">
        <summary>
          View measurement values <ArrowRight size={15} aria-hidden="true" />
        </summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Exercise response and evidence status by workload</caption>
            <thead>
              <tr>
                <th scope="col">Workload</th>
                <th scope="col">Baseline HR</th>
                <th scope="col">Current HR</th>
                <th scope="col">Difference</th>
                <th scope="col">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.workloadW ?? 'Unknown'} W</th>
                  <td>{row.baselineRange ? `${row.baselineRange.join('–')} bpm` : 'Withheld'}</td>
                  <td>{row.currentBpm === null ? 'Missing' : `${row.currentBpm} bpm`}</td>
                  <td>
                    {row.deltaBpm === null
                      ? 'Withheld'
                      : `${row.deltaBpm >= 0 ? '+' : ''}${row.deltaBpm.toFixed(1)} bpm`}
                  </td>
                  <td>{evidenceLabel[row.state]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
