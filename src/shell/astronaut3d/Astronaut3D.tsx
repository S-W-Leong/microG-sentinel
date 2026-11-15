import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { regions } from '../routes';
import BodyFigure2D from './BodyFigure2D';
import { createAstronautScene } from './scene';
import type { AstronautProps, MarkerFlag, RegionId } from './types';

const flagText: Record<MarkerFlag, string> = {
  urgent: 'Contact flight surgeon',
  'next-pmc': 'Raise at PMC',
  planned: 'Planned',
  recorded: 'Recorded',
  empty: 'No data',
};
const flagSymbol: Record<MarkerFlag, string> = {
  urgent: '!',
  'next-pmc': '\u2691',
  planned: '\u25cb',
  recorded: '\u2022',
  empty: '\u2013',
};

export default function Astronaut3D(props: AstronautProps) {
  const { selected, onSelect, flags, onProject } = props;
  const stage = useRef<HTMLDivElement>(null);
  const markers = useRef({} as Record<RegionId, HTMLButtonElement>);
  const scene = useRef<ReturnType<typeof createAstronautScene> | null>(null);
  const callbacks = useRef({ onSelect, onProject });
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => {
    callbacks.current = { onSelect, onProject };
  }, [onSelect, onProject]);
  useEffect(() => {
    if (failed || !stage.current) return;
    try {
      scene.current = createAstronautScene(
        stage.current,
        markers.current,
        (id) => callbacks.current.onSelect(id),
        (positions) => callbacks.current.onProject?.(positions),
        () => setFailed(true),
      );
    } catch {
      setFailed(true);
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [failed]);
  useEffect(() => {
    scene.current?.select(selected);
  }, [selected]);
  if (failed) return <BodyFigure2D {...props} />;
  return (
    <div className="astronaut-3d" ref={stage}>
      <div className="astronaut-markers">
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            className="astronaut-marker"
            ref={(element) => {
              if (element) markers.current[region.id] = element;
            }}
            tabIndex={-1}
            data-marker={region.id}
            data-flag={flags[region.id]}
            aria-pressed={selected === region.id}
            aria-controls={'region-' + region.id}
            aria-label={'Scan ' + region.name}
            aria-description={flagText[flags[region.id]]}
            onClick={() => onSelect(selected === region.id ? null : region.id)}
          >
            <span aria-hidden="true">{flagSymbol[flags[region.id]]}</span>
          </button>
        ))}
      </div>
      {!selected && <span className="astronaut-hint">Drag to rotate</span>}
    </div>
  );
}
