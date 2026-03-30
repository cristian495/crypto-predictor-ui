import { detectBullishConfirmation } from './detectBullishConfirmation';
import { detectBullishRejection } from './detectBullishRejection';
import { findNearestResistanceAbove } from './findNearestResistanceAbove';
import type {
  Candle,
  LongDetectionOptions,
  LongSetup,
  ResistanceZone,
  SupportZone,
} from './types';

type PullbackContextResult = {
  passed: boolean;
  score: number;
  tags: string[];
};

const DEFAULT_OPTIONS: LongDetectionOptions = {
  supportProximityPct: 0.25,
  rejectionThreshold: 0.35,
  minRR: 1.4,
  stopBufferPct: 0.15,
  confirmationMode: 'balanced',
  requirePullback: true,
  pullbackLookback: 6,
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function isNearSupport(
  candle: Candle,
  support: SupportZone,
  supportProximityPct: number,
): boolean {
  const safePct = Math.max(0, supportProximityPct);
  const zoneBuffer = (support.midPrice * safePct) / 100;
  const halfBand = (support.maxPrice - support.minPrice) / 2;
  const expandedMin = support.minPrice - zoneBuffer;
  const expandedMax = support.maxPrice + zoneBuffer;

  const lowInside = candle.low >= expandedMin && candle.low <= expandedMax;
  const closeInside = candle.close >= expandedMin && candle.close <= expandedMax;
  const rangeIntersects = candle.low <= expandedMax && candle.high >= expandedMin;
  const closeNearMid = Math.abs(candle.close - support.midPrice) <= zoneBuffer + halfBand;

  return lowInside || closeInside || rangeIntersects || closeNearMid;
}

export function detectPullbackContext(
  candles: Candle[],
  index: number,
  lookback: number,
): PullbackContextResult {
  const safeLookback = Math.max(2, Math.floor(lookback));
  const start = Math.max(0, index - safeLookback);
  const sample = candles.slice(start, index);

  if (sample.length < 2) {
    return {
      passed: true,
      score: 0.4,
      tags: ['Limited pullback history'],
    };
  }

  const avgClose = sample.reduce((sum, candle) => sum + candle.close, 0) / sample.length;
  const currentClose = candles[index].close;
  const closeBelowAvg = currentClose < avgClose;

  let downSteps = 0;
  for (let i = 1; i < sample.length; i += 1) {
    if (sample[i].close < sample[i - 1].close) {
      downSteps += 1;
    }
  }
  const bearishRatio = downSteps / Math.max(sample.length - 1, 1);
  const hasBearishSequence = bearishRatio >= 0.5;

  const passed = closeBelowAvg || hasBearishSequence;
  const score = passed
    ? clamp01((closeBelowAvg ? 0.55 : 0) + (hasBearishSequence ? 0.65 : 0))
    : clamp01(bearishRatio * 0.5);

  const tags: string[] = [];
  if (closeBelowAvg) {
    tags.push(`Close below ${safeLookback}c avg`);
  }
  if (hasBearishSequence) {
    tags.push('Recent bearish pullback');
  }

  return {
    passed,
    score,
    tags,
  };
}

export function scoreLongSetup(params: {
  rejectionFactor: number;
  confirmationFactor: number;
  contextFactor: number;
  rr: number;
  minRR: number;
}): {
  rejectionScore: number;
  confirmationScore: number;
  contextScore: number;
  rrScore: number;
  totalScore: number;
} {
  const rejectionScore = 20 * clamp01(params.rejectionFactor);
  const confirmationScore = 20 * clamp01(params.confirmationFactor);
  const contextScore = 10 * clamp01(params.contextFactor);
  const rrScore = 20 * clamp01(params.rr / Math.max(params.minRR, 0.1));

  return {
    rejectionScore,
    confirmationScore,
    contextScore,
    rrScore,
    totalScore: Math.min(100, 30 + rejectionScore + confirmationScore + contextScore + rrScore),
  };
}

function buildLongSetup(params: {
  candle: Candle;
  candleIndex: number;
  support: SupportZone;
  resistances: ResistanceZone[];
  rejectionScoreFactor: number;
  rejectionTags: string[];
  confirmationPassed: boolean;
  confirmationScoreFactor: number;
  confirmationTags: string[];
  contextPassed: boolean;
  contextScoreFactor: number;
  contextTags: string[];
  options: LongDetectionOptions;
}): LongSetup | null {
  const {
    candle,
    candleIndex,
    support,
    resistances,
    rejectionScoreFactor,
    rejectionTags,
    confirmationPassed,
    confirmationScoreFactor,
    confirmationTags,
    contextPassed,
    contextScoreFactor,
    contextTags,
    options,
  } = params;

  const entryPrice = candle.close;
  const stopBufferValue = (support.minPrice * Math.max(0, options.stopBufferPct)) / 100;
  const stopPrice = support.minPrice - stopBufferValue;
  const risk = entryPrice - stopPrice;
  if (!(risk > 0)) {
    return null;
  }

  const targetZone = findNearestResistanceAbove(entryPrice, resistances);
  if (!targetZone) {
    return null;
  }

  const targetPrice = targetZone.midPrice;
  const reward = targetPrice - entryPrice;
  if (!(reward > 0)) {
    return null;
  }

  const rr = reward / risk;
  if (rr < options.minRR) {
    return null;
  }

  const scores = scoreLongSetup({
    rejectionFactor: rejectionScoreFactor,
    confirmationFactor: confirmationScoreFactor,
    contextFactor: contextScoreFactor,
    rr,
    minRR: options.minRR,
  });

  const tags = [
    `Near support ${support.minPrice.toFixed(3)}-${support.maxPrice.toFixed(3)}`,
    ...rejectionTags,
    ...(confirmationPassed ? confirmationTags : ['Awaiting bullish confirmation']),
    ...(options.requirePullback
      ? contextPassed
        ? contextTags
        : ['Pullback context missing']
      : ['Pullback filter disabled']),
    `RR ${rr.toFixed(2)}x`,
  ];

  return {
    id: `long-${candle.time}-${candleIndex}-${support.id}`,
    candleIndex,
    time: candle.time,
    entryPrice,
    stopPrice,
    targetPrice,
    rr,
    supportZoneId: support.id,
    resistanceZoneId: targetZone.id,
    rejectionScore: scores.rejectionScore,
    confirmationScore: scores.confirmationScore,
    contextScore: scores.contextScore,
    rrScore: scores.rrScore,
    totalScore: scores.totalScore,
    tags,
    status: confirmationPassed ? 'confirmed' : 'candidate',
  };
}

export function detectLongSetups(
  candles: Candle[],
  supports: SupportZone[],
  resistances: ResistanceZone[],
  options: Partial<LongDetectionOptions> = {},
): LongSetup[] {
  if (!candles.length || !supports.length || !resistances.length) {
    return [];
  }

  const mergedOptions: LongDetectionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    pullbackLookback: Math.max(2, Math.floor(options.pullbackLookback ?? DEFAULT_OPTIONS.pullbackLookback)),
    minRR: Math.max(0.1, options.minRR ?? DEFAULT_OPTIONS.minRR),
    supportProximityPct: Math.max(
      0,
      options.supportProximityPct ?? DEFAULT_OPTIONS.supportProximityPct,
    ),
    rejectionThreshold: Math.max(
      0.05,
      options.rejectionThreshold ?? DEFAULT_OPTIONS.rejectionThreshold,
    ),
    stopBufferPct: Math.max(0, options.stopBufferPct ?? DEFAULT_OPTIONS.stopBufferPct),
  };

  const setups: LongSetup[] = [];

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    const nearSupports = supports
      .filter((support) => isNearSupport(candle, support, mergedOptions.supportProximityPct))
      .sort((a, b) => Math.abs(candle.low - a.midPrice) - Math.abs(candle.low - b.midPrice));

    if (!nearSupports.length) {
      continue;
    }

    const rejection = detectBullishRejection(candle, mergedOptions.rejectionThreshold);
    if (!rejection.passed) {
      continue;
    }

    const confirmation = detectBullishConfirmation(candles, i, mergedOptions.confirmationMode);
    const context = detectPullbackContext(candles, i, mergedOptions.pullbackLookback);

    if (mergedOptions.requirePullback && !context.passed) {
      continue;
    }

    let bestForCandle: LongSetup | null = null;

    nearSupports.forEach((support) => {
      const setup = buildLongSetup({
        candle,
        candleIndex: i,
        support,
        resistances,
        rejectionScoreFactor: rejection.score,
        rejectionTags: rejection.tags,
        confirmationPassed: confirmation.passed,
        confirmationScoreFactor: confirmation.score,
        confirmationTags: confirmation.tags,
        contextPassed: context.passed,
        contextScoreFactor: context.score,
        contextTags: context.tags,
        options: mergedOptions,
      });

      if (!setup) {
        return;
      }

      if (
        !bestForCandle ||
        setup.totalScore > bestForCandle.totalScore ||
        (setup.totalScore === bestForCandle.totalScore && setup.status === 'confirmed')
      ) {
        bestForCandle = setup;
      }
    });

    if (bestForCandle) {
      setups.push(bestForCandle);
    }
  }

  return setups.sort((a, b) => b.totalScore - a.totalScore || b.candleIndex - a.candleIndex);
}
