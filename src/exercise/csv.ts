import type { ExerciseDataset, ExerciseSession, StageObservation } from './types';
import { validateExerciseDataset } from './validation';
export const exerciseCsvHeader =
  'sessionId,subjectId,seriesId,date,isBaseline,deviceId,protocolId,posture,stageId,stageIndex,workloadW,durationSec,hrBpm,rpe,rpeScale,quality,qualityBasis,symptoms,notes';
export type CsvPreview = {
  dataset: ExerciseDataset;
  acceptedRows: readonly number[];
  rejectedRows: readonly { row: number; message: string }[];
  canCommit: boolean;
};
export function parseExerciseCsv(text: string): CsvPreview {
  const sessions: ExerciseSession[] = [];
  const stages: StageObservation[] = [];
  const acceptedRows: number[] = [];
  const rejectedRows: { row: number; message: string }[] = [];
  const result = () => ({
    dataset: { sessions, stages },
    acceptedRows,
    rejectedRows,
    canCommit: !rejectedRows.length && stages.length > 0,
  });
  if (new TextEncoder().encode(text).length > 1048576) {
    rejectedRows.push({ row: 0, message: 'File exceeds 1 MiB' });
    return result();
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || !field) quoted = !quoted;
      else {
        rejectedRows.push({ row: rows.length + 1, message: 'Invalid quote' });
        return result();
      }
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(field.replace(/\r$/, ''));
      field = '';
      if (c === '\n') {
        rows.push(row);
        row = [];
      }
    } else field += c;
  }
  if (quoted) {
    rejectedRows.push({ row: 0, message: 'Unclosed quoted field' });
    return result();
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (rows.shift()?.join(',') !== exerciseCsvHeader || rows.length > 2000) {
    rejectedRows.push({ row: 1, message: 'Use the exact template header and at most 2000 rows' });
    return result();
  }
  const headers = exerciseCsvHeader.split(',');
  for (const [i, values] of rows.entries()) {
    if (values.every((v) => !v.trim())) continue;
    try {
      if (values.length !== headers.length) throw new Error('Unexpected column count');
      const r = Object.fromEntries(headers.map((h, j) => [h, values[j].trim()]));
      const n = (s: string) =>
        s === '' ? null : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ? Number(s) : NaN;
      if (!['true', 'false'].includes(r.isBaseline))
        throw new Error('isBaseline must be true or false');
      const refs = [
        {
          path: 'imported-demo.csv',
          locator: `record ${i + 2}`,
          note: 'Imported demonstration data, not independently verified',
        },
      ];
      const session: ExerciseSession = {
        id: r.sessionId,
        scope: { source: 'simulated-crew', subjectId: r.subjectId, seriesId: r.seriesId },
        date: r.date || null,
        isBaseline: r.isBaseline === 'true',
        researchBasisId: null,
        symptoms: r.symptoms ? [r.symptoms] : [],
        notes: r.notes ? [r.notes] : [],
        sourceRefs: refs,
      };
      const existing = sessions.find((s) => s.id === session.id);
      if (
        existing &&
        JSON.stringify({ ...existing, sourceRefs: [] }) !==
          JSON.stringify({ ...session, sourceRefs: [] })
      )
        throw new Error('Conflicting session metadata');
      const stage = {
        id: r.stageId,
        sessionId: r.sessionId,
        context: {
          deviceId: r.deviceId || null,
          protocolId: r.protocolId || null,
          posture: r.posture || null,
          stageIndex: n(r.stageIndex),
          workloadW: n(r.workloadW),
          durationSec: n(r.durationSec),
          precedingStages: null,
        },
        hrBpm: n(r.hrBpm),
        rpe: n(r.rpe),
        rpeScale: r.rpeScale || null,
        quality: { state: r.quality, basis: r.qualityBasis },
        duplicateOf: null,
        sourceRefs: refs,
      } as StageObservation;
      const valid = validateExerciseDataset({ sessions: [session], stages: [stage] });
      if (!valid.ok) throw new Error(valid.errors.join('; '));
      const old = stages.find((s) => s.id === stage.id);
      if (
        old &&
        JSON.stringify({ ...old, sourceRefs: [] }) !== JSON.stringify({ ...stage, sourceRefs: [] })
      )
        throw new Error('Conflicting stage ID');
      if (!existing) sessions.push(session);
      if (!old) stages.push(stage);
      acceptedRows.push(i + 2);
    } catch (e) {
      rejectedRows.push({ row: i + 2, message: e instanceof Error ? e.message : 'Invalid row' });
    }
  }
  for (const s of stages) {
    const prior = stages
      .filter(
        (p) =>
          p.sessionId === s.sessionId &&
          p.context.stageIndex !== null &&
          p.context.stageIndex < s.context.stageIndex!,
      )
      .sort((a, b) => a.context.stageIndex! - b.context.stageIndex!);
    if (
      s.context.stageIndex !== null &&
      prior.length === s.context.stageIndex - 1 &&
      prior.every(
        (p, i) =>
          p.context.stageIndex === i + 1 &&
          p.context.workloadW !== null &&
          p.context.durationSec !== null,
      )
    )
      s.context.precedingStages = prior.map((p) => ({
        workloadW: p.context.workloadW!,
        durationSec: p.context.durationSec!,
      }));
  }
  return result();
}
