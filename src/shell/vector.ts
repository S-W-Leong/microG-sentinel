import type { VectorApi } from '../risks/types';
import { createVector } from '../vector/store';

export const demoTime = '2026-11-14T11:00:00.000Z';
export const vector: VectorApi = createVector({ clock: () => Date.parse(demoTime) });
