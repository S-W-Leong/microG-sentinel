import type { VectorApi } from '../risks/types';
import { createVector } from './store';

const vector = createVector();
export const emitSignals: VectorApi['emitSignals'] = vector.emitSignals;
export const getVector: VectorApi['getVector'] = vector.getVector;
export const getExposures: VectorApi['getExposures'] = vector.getExposures;
export const getSignals: VectorApi['getSignals'] = vector.getSignals;
export const personalise: VectorApi['personalise'] = vector.personalise;
export const subscribe: VectorApi['subscribe'] = vector.subscribe;
