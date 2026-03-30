import type { Candle, PivotLow, PivotPoint } from './types';

type PivotMode = 'low' | 'high';

function isLocalExtreme(
  candles: Candle[],
  index: number,
  pivotWindow: number,
  mode: PivotMode,
): boolean {
  const current = mode === 'low' ? candles[index].low : candles[index].high;

  for (let offset = 1; offset <= pivotWindow; offset += 1) {
    const left = mode === 'low' ? candles[index - offset].low : candles[index - offset].high;
    const right = mode === 'low' ? candles[index + offset].low : candles[index + offset].high;

    if (mode === 'low') {
      if (!(current < left && current < right)) {
        return false;
      }
    } else if (!(current > left && current > right)) {
      return false;
    }
  }

  return true;
}

// Genérico para facilitar futura extensión a resistencias (high pivots).
export function detectPivotExtremes(
  candles: Candle[],
  pivotWindow = 1,
  mode: PivotMode = 'low',
): PivotPoint[] {
  const pivots: PivotPoint[] = [];

  if (candles.length < pivotWindow * 2 + 1) {
    return pivots;
  }

  for (let i = pivotWindow; i < candles.length - pivotWindow; i += 1) {
    if (!isLocalExtreme(candles, i, pivotWindow, mode)) {
      continue;
    }

    pivots.push({
      index: i,
      time: candles[i].time,
      price: mode === 'low' ? candles[i].low : candles[i].high,
    });
  }

  return pivots;
}

export function detectPivotLows(candles: Candle[], pivotWindow = 1): PivotLow[] {
  return detectPivotExtremes(candles, pivotWindow, 'low');
}
