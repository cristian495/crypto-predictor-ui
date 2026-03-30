import { clusterPriceZones } from './clusterPriceZones';
import type { PivotLow, SupportZone } from './types';

export function clusterSupportZones(pivots: PivotLow[], tolerancePct: number): SupportZone[] {
  return clusterPriceZones(pivots, tolerancePct, 'support') as SupportZone[];
}
