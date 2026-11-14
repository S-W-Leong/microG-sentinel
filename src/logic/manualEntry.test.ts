import { expect, it } from 'vitest';
import { parseManualEntry } from './manualEntry';
const draft=(value:string)=>{const f=new FormData();f.set('subjectId','P');f.set('group','A');f.set('value',value);return f;};
it('preserves blank versus zero',()=>{expect(parseManualEntry(draft(''),'USER-1').record?.value).toBeNull();expect(parseManualEntry(draft('0'),'USER-1').record?.value).toBe(0);});
it('rejects malformed numbers and preserves precision',()=>{expect(parseManualEntry(draft('2.04x'),'USER-1').record).toBeNull();expect(parseManualEntry(draft('2.04'),'USER-1').record?.value).toBe(2.04);});
it('requires participant and series',()=>{expect(parseManualEntry(new FormData(),'USER-1').record).toBeNull();});
