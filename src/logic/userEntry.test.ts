import { describe, it, expect } from 'vitest';
import { assess } from './assess';
import { status } from '../ui/presentation';
import type { Assessment } from '../types';
const base: Assessment = {id:'b',source:'user-entered',subjectId:'P',comparisonGroupId:'A',date:'2026-01-01',phase:'not-applicable',metric:'VO2peak',unit:'L/min',value:3,bodyMassKg:null,method:'Graded capacity test',modality:'cycle',protocol:null,isBaseline:true,sourceNotes:[]};
const current = {...base,id:'c',date:'2026-02-01',value:2.1,isBaseline:false};
describe('user-entered comparisons',()=>{
 it('compares real transcriptions without reference determination or amber',()=>{const r=assess([base,current],'c');expect(r.evidence).toBe('supported');expect(r.calculation?.retainedPct).toBeCloseTo(70);expect(r.reference.state).toBe('not-applicable');expect(status(r).tone).toBe('neutral');});
 it('isolates comparison series',()=>{expect(assess([{...base,comparisonGroupId:'B'},current],'c').calculation).toBeNull();});
 it('isolates sources',()=>{expect(assess([{...base,source:'simulated-crew'},current],'c').calculation).toBeNull();});
 it('blocks contradictory linked measurements',()=>{expect(assess([base,current,{...current,id:'copy',duplicateOf:'c',value:2.9}],'c').calculation).toBeNull();});
});
