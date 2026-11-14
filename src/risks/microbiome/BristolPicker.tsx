const labels = [
  'Hard lumps',
  'Lumpy sausage',
  'Cracked surface',
  'Smooth sausage',
  'Soft blobs',
  'Mushy pieces',
  'Watery',
];
function StoolIcon({ type }: { type: number }) {
  return (
    <svg viewBox="0 0 64 32" aria-hidden="true" focusable="false">
      {type === 1 &&
        [12, 28, 44, 54].map((left, index) => (
          <ellipse key={left} cx={left} cy={index % 2 ? 20 : 12} rx="6" ry="5" />
        ))}
      {type === 2 && (
        <path d="M6 20 Q3 9 14 10 Q18 2 27 8 Q36 2 42 10 Q54 5 58 15 Q60 26 48 24 Q38 30 31 24 Q19 30 15 23 Q9 27 6 20Z" />
      )}
      {(type === 3 || type === 4) && (
        <path d="M8 14 Q27 2 52 12 Q63 21 52 25 Q30 16 13 26 Q3 29 8 14Z" />
      )}
      {type === 3 && <path className="gut-cracks" d="m21 10-2 7 4 5m15-12-3 7 4 4" />}
      {type === 5 && (
        <>
          <ellipse cx="16" cy="13" rx="11" ry="8" />
          <ellipse cx="43" cy="21" rx="13" ry="8" />
        </>
      )}
      {type === 6 && <path d="m7 9 8-4 6 8-5 8-11-4Zm22 7 8-8 9 4-3 14-12-1Zm21-12 8 6-3 9-7-5Z" />}
      {type === 7 && (
        <path
          d="M4 10q7-7 14 0t14 0 14 0 14 0M4 21q7-7 14 0t14 0 14 0 14 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
export function BristolPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <fieldset>
      <legend>Bristol type</legend>
      <div className="gut-stool-picker">
        {labels.map((label, index) => (
          <label key={label}>
            <input
              type="radio"
              name="bristol"
              value={index + 1}
              checked={value === index + 1}
              onChange={() => onChange(index + 1)}
            />
            <StoolIcon type={index + 1} />
            <strong>{index + 1}</strong>
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className="gut-check">
        <input
          type="radio"
          name="bristol"
          checked={value === null}
          onChange={() => onChange(null)}
        />
        No stool recorded
      </label>
    </fieldset>
  );
}
