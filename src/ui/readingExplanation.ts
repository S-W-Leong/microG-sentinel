import type { StageReading } from './exercisePresentation';

export function explainReading(row: StageReading): string {
  if (row.state === 'incompatible')
    return 'The test conditions do not match. These readings cannot be compared.';
  if (row.currentBpm === null) return 'No reading recorded. There is no change to calculate yet.';
  if (row.deltaBpm === null || row.state === 'insufficient')
    return 'More matching baseline evidence is needed before comparing.';
  if (row.deltaBpm === 0) return 'The same as your baseline average.';
  return `${Number(Math.abs(row.deltaBpm).toFixed(1))} bpm ${row.deltaBpm > 0 ? 'higher' : 'lower'} than your baseline average.`;
}
