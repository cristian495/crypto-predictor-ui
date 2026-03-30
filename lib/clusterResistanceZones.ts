import { clusterPriceZones } from './clusterPriceZones';
import type { PivotHigh, ResistanceZone } from './types';

export function clusterResistanceZones(
  pivots: PivotHigh[],
  tolerancePct: number,
  minTouches = 1,
): ResistanceZone[] {
  return clusterPriceZones(pivots, tolerancePct, 'resistance')
    .filter((zone) => zone.touches >= Math.max(1, Math.floor(minTouches))) as ResistanceZone[];
}
