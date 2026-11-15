import { useEffect } from 'react';
import astronaut from '../astronaut.svg?raw';
import { regions } from '../routes';
import type { AstronautProps } from './types';

export default function BodyFigure2D({
  selected,
  onSelect,
  onProject,
}: Pick<AstronautProps, 'selected' | 'onSelect' | 'onProject'>) {
  useEffect(() => {
    onProject?.(null);
  }, [onProject]);
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
  return (
    <div
      className="body-fallback"
      data-selected={selected === 'heart-lungs' ? 'heart' : (selected ?? '')}
    >
      <div className="body-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art }} />
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
          onClick={() => onSelect(selected === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
}
