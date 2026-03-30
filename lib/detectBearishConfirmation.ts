import type { Candle, ConfirmationMode } from './types';

export type BearishConfirmationResult = {
  passed: boolean;
  bearishBody: boolean;
  closeBelowPrevious: boolean;
  brokePreviousLow: boolean;
  score: number;
  tags: string[];
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function detectBearishConfirmation(
  candles: Candle[],
  index: number,
  mode: ConfirmationMode,
  requireBreakPreviousLow = false,
): BearishConfirmationResult {
  const candle = candles[index];
  const previous = index > 0 ? candles[index - 1] : undefined;

  const bearishBody = candle.close < candle.open;
  const closeBelowPrevious = previous ? candle.close < previous.close : false;
  const brokePreviousLow = previous ? candle.close < previous.low : false;

  let passed = false;
  let score = 0;
  const tags: string[] = [];

  if (mode === 'aggressive') {
    passed = true;
    score = bearishBody || closeBelowPrevious ? 1 : 0.65;
    tags.push('Aggressive mode');
  } else if (mode === 'balanced') {
    passed = bearishBody;
    score = passed ? 1 : closeBelowPrevious ? 0.35 : 0;
    if (passed) tags.push('Bearish close < open');
  } else {
    passed = bearishBody && closeBelowPrevious;
    score = passed ? 1 : bearishBody || closeBelowPrevious ? 0.4 : 0;
    if (passed) tags.push('Bearish close + close < prev close');
  }

  if (requireBreakPreviousLow) {
    if (brokePreviousLow) {
      tags.push('Broke previous low');
    }
    passed = passed && brokePreviousLow;
    score = passed ? Math.max(score, 0.95) : Math.min(score, 0.4);
  } else if (brokePreviousLow) {
    tags.push('Broke previous low');
  }

  return {
    passed,
    bearishBody,
    closeBelowPrevious,
    brokePreviousLow,
    score: clamp01(score),
    tags,
  };
}
