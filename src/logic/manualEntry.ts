import type { Assessment, Phase, Metric, Unit } from '../types';
export function parseManualEntry(f: FormData, id: string): {record: Assessment | null; error: string} {
          const str = (key: string) => String(f.get(key) ?? '').trim();
          const numeric = (key: string) => (str(key) === '' ? null : Number(str(key)));
          const value = numeric('value'),
            mass = numeric('bodyMassKg');
          if (
            (value !== null && (!Number.isFinite(value) || value < 0)) ||
            (mass !== null && (!Number.isFinite(mass) || mass <= 0))
          ) {
            return {record:null,error:'Enter a finite non-negative capacity and positive body mass.'};
          }
          const date = str('date');
          if (
            date &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              !Number.isFinite(Date.parse(date)) ||
              new Date(date).toISOString().slice(0, 10) !== date)
          ) {
            return {record:null,error:'Review the assessment date.'};
          }
          if (!str('subjectId') || !str('group')) return {record:null,error:'Participant and assessment series are required.'};
          const allowed: Record<string,string[]> = {metric:['','VO2peak','VO2max'],unit:['','L/min','mL/kg/min'],phase:['','pre-mission','in-mission','post-mission','pre-bed-rest','bed-rest','post-bed-rest','recovery','not-applicable']};
  if (Object.entries(allowed).some(([key, values]) => !values.includes(str(key)))) return {record:null,error:'Choose a listed metric, unit and phase, or Unknown.'};
  const record: Assessment = {
            id,
            source: 'user-entered',
            subjectId: str('subjectId'),
            comparisonGroupId: str('group'),
            date: date || null,
            phase: (str('phase') as Phase) || null,
            metric: (str('metric') as Metric) || null,
            unit: (str('unit') as Unit) || null,
            value,
            bodyMassKg: mass,
            method: str('method') || null,
            modality: str('modality') || null,
            protocol: str('protocol') || null,
            isBaseline: f.get('baseline') === 'on',
            sourceNotes: [str('notes') || 'User-entered transcription; source notes not supplied.'],
            ...(str('duplicate') ? { duplicateOf: str('duplicate') } : {}),
          };
          if (record.duplicateOf === record.id) {
            return {record:null,error:'An assessment cannot represent itself.'};
          }

return {record,error:''};
}
