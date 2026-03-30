import { clusterResistanceZones } from './clusterResistanceZones';
import { detectPivotHighs } from './detectPivotHighs';
import type { Candle, DetectorOptions, ResistanceZone } from './types';

const DEFAULT_OPTIONS: DetectorOptions = {
  tolerancePct: 0.6,
  minTouches: 2,
  pivotWindow: 1,
};

export function detectResistances(
  candles: Candle[],
  options: Partial<DetectorOptions> = {},
): ResistanceZone[] {
  if (!candles.length) {
    return [];
  }

  const { tolerancePct, minTouches, pivotWindow } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const pivots = detectPivotHighs(candles, Math.max(1, Math.floor(pivotWindow)));

  return clusterResistanceZones(pivots, Math.max(0.01, tolerancePct), minTouches)
    .sort((a, b) => b.score - a.score || b.touches - a.touches);
}
