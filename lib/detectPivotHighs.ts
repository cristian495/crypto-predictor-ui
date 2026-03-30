import { detectPivotExtremes } from './detectPivotLows';
import type { Candle, PivotHigh } from './types';

export function detectPivotHighs(candles: Candle[], pivotWindow = 1): PivotHigh[] {
  return detectPivotExtremes(candles, pivotWindow, 'high') as PivotHigh[];
}
