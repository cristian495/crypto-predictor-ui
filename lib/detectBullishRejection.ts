import type { Candle } from './types';

export type BullishRejectionResult = {
  passed: boolean;
  lowerWick: number;
  body: number;
  fullRange: number;
  wickRatio: number;
  score: number;
  tags: string[];
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function detectBullishRejection(
  candle: Candle,
  rejectionThreshold: number,
): BullishRejectionResult {
  const safeThreshold = Math.max(0.05, rejectionThreshold);
  const lowerWick = Math.max(0, Math.min(candle.open, candle.close) - candle.low);
  const body = Math.abs(candle.close - candle.open);
  const fullRange = Math.max(0, candle.high - candle.low);
  const wickRatio = fullRange > 0 ? lowerWick / fullRange : 0;
  const wickVsBody = body > 0 ? lowerWick / body : lowerWick > 0 ? 1 : 0;

  const wickRatioPass = wickRatio >= safeThreshold;
  const wickBodyPass = lowerWick > body;
  const passed = fullRange > 0 && (wickRatioPass || wickBodyPass);

  const wickRatioStrength = clamp01(wickRatio / safeThreshold);
  const wickBodyStrength = clamp01(wickVsBody / 1.5);
  const score = passed ? Math.max(wickRatioStrength, wickBodyStrength) : 0;

  const tags: string[] = [];
  if (wickRatioPass) {
    tags.push(`Bullish rejection wick ${(wickRatio * 100).toFixed(1)}%`);
  } else if (wickBodyPass) {
    tags.push('Lower wick > body');
  }

  return {
    passed,
    lowerWick,
    body,
    fullRange,
    wickRatio,
    score,
    tags,
  };
}
