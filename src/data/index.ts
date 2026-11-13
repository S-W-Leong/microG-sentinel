import { simulatedCrew } from './simulated';
import { researchReplay } from './replay';
import type { Assessment } from '../types';

export { simulatedCrew, researchReplay };
export const allRecords: Assessment[] = [...simulatedCrew, ...researchReplay];
