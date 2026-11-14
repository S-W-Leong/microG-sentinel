import type { regions } from '../routes';

export type RegionId = (typeof regions)[number]['id'];
export type MarkerFlag = 'urgent' | 'next-pmc' | 'planned' | 'recorded' | 'empty';
export type RegionFlags = Record<RegionId, MarkerFlag>;
export type ProjectedMarkers = Record<RegionId, { x: number; y: number; visible: boolean }>;
export interface AstronautProps {
  selected: RegionId | null;
  onSelect: (id: RegionId | null) => void;
  flags: RegionFlags;
  onProject?: (markers: ProjectedMarkers | null) => void;
}
