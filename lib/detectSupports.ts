import { clusterSupportZones } from './clusterSupportZones';
import { detectPivotLows } from './detectPivotLows';
import type { Candle, DetectorOptions, SupportZone } from './types';

const DEFAULT_OPTIONS: DetectorOptions = {
  tolerancePct: 0.6,
  minTouches: 2,
  pivotWindow: 1,
};

export function detectSupports(
  candles: Candle[],
  options: Partial<DetectorOptions> = {},
): SupportZone[] {
  if (!candles.length) {
    return [];
  }

  const { tolerancePct, minTouches, pivotWindow } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const pivots = detectPivotLows(candles, Math.max(1, Math.floor(pivotWindow)));

  return clusterSupportZones(pivots, Math.max(0.01, tolerancePct))
    .filter((zone) => zone.touches >= Math.max(1, Math.floor(minTouches)))
    .sort((a, b) => b.score - a.score || b.touches - a.touches);
}
