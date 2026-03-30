import type { Candle, ConfirmationMode } from './types';

export type BullishConfirmationResult = {
  passed: boolean;
  bullishBody: boolean;
  closeAbovePrevious: boolean;
  score: number;
  tags: string[];
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function detectBullishConfirmation(
  candles: Candle[],
  index: number,
  mode: ConfirmationMode,
): BullishConfirmationResult {
  const candle = candles[index];
  const previous = index > 0 ? candles[index - 1] : undefined;

  const bullishBody = candle.close > candle.open;
  const closeAbovePrevious = previous ? candle.close > previous.close : false;

  let passed = false;
  let score = 0;
  const tags: string[] = [];

  if (mode === 'aggressive') {
    passed = true;
    score = bullishBody || closeAbovePrevious ? 1 : 0.65;
    tags.push('Aggressive mode');
  } else if (mode === 'balanced') {
    passed = bullishBody;
    score = passed ? 1 : closeAbovePrevious ? 0.35 : 0;
    if (passed) tags.push('Bullish close > open');
  } else {
    passed = bullishBody && closeAbovePrevious;
    score = passed ? 1 : bullishBody || closeAbovePrevious ? 0.4 : 0;
    if (passed) tags.push('Bullish close + close > prev close');
  }

  return {
    passed,
    bullishBody,
    closeAbovePrevious,
    score: clamp01(score),
    tags,
  };
}
