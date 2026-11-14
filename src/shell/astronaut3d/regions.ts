import type { RegionId } from './types';

export type Point = [number, number, number];
export const anatomy: Record<RegionId, { anchor: Point; target: Point; distance: number }> = {
  head: { anchor: [-0.48, 7.79, 0.45], target: [0, 7.2, 0], distance: 7.4 },
  eyes: { anchor: [0.38, 7.25, 0.83], target: [0, 7.2, 0], distance: 7.4 },
  'heart-lungs': { anchor: [0, 5.67, 0.72], target: [0, 5.6, 0], distance: 8.6 },
  skin: { anchor: [1.59, 4.43, 0.37], target: [0.9, 4.55, 0], distance: 9 },
  gut: { anchor: [0, 4.44, 0.53], target: [0, 4.35, 0], distance: 9 },
  bones: { anchor: [0.51, 3.25, 0.47], target: [0.45, 3.05, 0], distance: 10 },
};
export const regionIds = Object.keys(anatomy) as RegionId[];
