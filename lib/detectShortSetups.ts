import { detectBearishConfirmation } from './detectBearishConfirmation';
import { detectBearishRejection } from './detectBearishRejection';
import { findNearestSupportBelow } from './findNearestSupportBelow';
import type {
  Candle,
  ResistanceZone,
  ShortDetectionOptions,
  ShortSetup,
  SetupQuality,
  SupportZone,
} from './types';

type RallyContextResult = {
  passed: boolean;
  score: number;
  tags: string[];
};

const DEFAULT_OPTIONS: ShortDetectionOptions = {
  resistanceProximityPct: 0.25,
  rejectionThreshold: 0.35,
  minRR: 1.4,
  stopBufferPct: 0.15,
  confirmationMode: 'balanced',
  requireRally: true,
  rallyLookback: 6,
  requireBreakPreviousLow: false,
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function classifyQuality(totalScore: number, rr: number): SetupQuality {
  if (totalScore >= 80 && rr >= 2) return 'A';
  if (totalScore >= 65 && rr >= 1.5) return 'B';
  return 'C';
}

export function isNearResistance(
  candle: Candle,
  resistance: ResistanceZone,
  resistanceProximityPct: number,
): boolean {
  const safePct = Math.max(0, resistanceProximityPct);
  const zoneBuffer = (resistance.midPrice * safePct) / 100;
  const halfBand = (resistance.maxPrice - resistance.minPrice) / 2;
  const expandedMin = resistance.minPrice - zoneBuffer;
  const expandedMax = resistance.maxPrice + zoneBuffer;

  const highInside = candle.high >= expandedMin && candle.high <= expandedMax;
  const closeInside = candle.close >= expandedMin && candle.close <= expandedMax;
  const rangeIntersects = candle.low <= expandedMax && candle.high >= expandedMin;
  const closeNearMid = Math.abs(candle.close - resistance.midPrice) <= zoneBuffer + halfBand;

  return highInside || closeInside || rangeIntersects || closeNearMid;
}

export function detectRallyContext(
  candles: Candle[],
  index: number,
  lookback: number,
): RallyContextResult {
  const safeLookback = Math.max(2, Math.floor(lookback));
  const start = Math.max(0, index - safeLookback);
  const sample = candles.slice(start, index);

  if (sample.length < 2) {
    return {
      passed: true,
      score: 0.4,
      tags: ['Limited rally history'],
    };
  }

  const avgClose = sample.reduce((sum, candle) => sum + candle.close, 0) / sample.length;
  const currentClose = candles[index].close;
  const closeAboveAvg = currentClose > avgClose;

  let upSteps = 0;
  for (let i = 1; i < sample.length; i += 1) {
    if (sample[i].close > sample[i - 1].close) {
      upSteps += 1;
    }
  }
  const bullishRatio = upSteps / Math.max(sample.length - 1, 1);
  const hasBullishSequence = bullishRatio >= 0.5;

  const passed = closeAboveAvg || hasBullishSequence;
  const score = passed
    ? clamp01((closeAboveAvg ? 0.55 : 0) + (hasBullishSequence ? 0.65 : 0))
    : clamp01(bullishRatio * 0.5);

  const tags: string[] = [];
  if (closeAboveAvg) {
    tags.push(`Close above ${safeLookback}c avg`);
  }
  if (hasBullishSequence) {
    tags.push('Recent bullish rally');
  }

  return {
    passed,
    score,
    tags,
  };
}

export function scoreShortSetup(params: {
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

function buildShortSetup(params: {
  candle: Candle;
  candleIndex: number;
  resistance: ResistanceZone;
  supports: SupportZone[];
  rejectionScoreFactor: number;
  rejectionTags: string[];
  confirmationPassed: boolean;
  confirmationBrokePreviousLow: boolean;
  confirmationScoreFactor: number;
  confirmationTags: string[];
  contextPassed: boolean;
  contextScoreFactor: number;
  contextTags: string[];
  options: ShortDetectionOptions;
}): ShortSetup | null {
  const {
    candle,
    candleIndex,
    resistance,
    supports,
    rejectionScoreFactor,
    rejectionTags,
    confirmationPassed,
    confirmationBrokePreviousLow,
    confirmationScoreFactor,
    confirmationTags,
    contextPassed,
    contextScoreFactor,
    contextTags,
    options,
  } = params;

  const entryPrice = candle.close;
  const stopBufferValue = (resistance.maxPrice * Math.max(0, options.stopBufferPct)) / 100;
  const stopPrice = resistance.maxPrice + stopBufferValue;
  const risk = stopPrice - entryPrice;
  if (!(risk > 0)) {
    return null;
  }

  const targetZone = findNearestSupportBelow(entryPrice, supports);
  if (!targetZone) {
    return null;
  }

  const targetPrice = targetZone.midPrice;
  const reward = entryPrice - targetPrice;
  if (!(reward > 0)) {
    return null;
  }

  const rr = reward / risk;
  if (rr < options.minRR) {
    return null;
  }

  const scores = scoreShortSetup({
    rejectionFactor: rejectionScoreFactor,
    confirmationFactor: confirmationScoreFactor,
    contextFactor: contextScoreFactor,
    rr,
    minRR: options.minRR,
  });

  let status: ShortSetup['status'] = confirmationPassed ? 'confirmed' : 'candidate';
  if (confirmationPassed && confirmationBrokePreviousLow && rr >= options.minRR * 1.2) {
    status = 'strong_confirmed';
  }

  const tags = [
    `Near resistance ${resistance.minPrice.toFixed(3)}-${resistance.maxPrice.toFixed(3)}`,
    ...rejectionTags,
    ...(confirmationPassed ? confirmationTags : ['Awaiting bearish confirmation']),
    ...(options.requireRally
      ? contextPassed
        ? contextTags
        : ['Rally context missing']
      : ['Rally filter disabled']),
    `RR ${rr.toFixed(2)}x`,
  ];

  return {
    id: `short-${candle.time}-${candleIndex}-${resistance.id}`,
    candleIndex,
    time: candle.time,
    entryPrice,
    stopPrice,
    targetPrice,
    rr,
    resistanceZoneId: resistance.id,
    supportZoneId: targetZone.id,
    rejectionScore: scores.rejectionScore,
    confirmationScore: scores.confirmationScore,
    contextScore: scores.contextScore,
    rrScore: scores.rrScore,
    totalScore: scores.totalScore,
    tags,
    status,
    quality: classifyQuality(scores.totalScore, rr),
  };
}

export function detectShortSetups(
  candles: Candle[],
  supports: SupportZone[],
  resistances: ResistanceZone[],
  options: Partial<ShortDetectionOptions> = {},
): ShortSetup[] {
  if (!candles.length || !supports.length || !resistances.length) {
    return [];
  }

  const mergedOptions: ShortDetectionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    rallyLookback: Math.max(2, Math.floor(options.rallyLookback ?? DEFAULT_OPTIONS.rallyLookback)),
    minRR: Math.max(0.1, options.minRR ?? DEFAULT_OPTIONS.minRR),
    resistanceProximityPct: Math.max(
      0,
      options.resistanceProximityPct ?? DEFAULT_OPTIONS.resistanceProximityPct,
    ),
    rejectionThreshold: Math.max(
      0.05,
      options.rejectionThreshold ?? DEFAULT_OPTIONS.rejectionThreshold,
    ),
    stopBufferPct: Math.max(0, options.stopBufferPct ?? DEFAULT_OPTIONS.stopBufferPct),
    requireBreakPreviousLow:
      options.requireBreakPreviousLow ?? DEFAULT_OPTIONS.requireBreakPreviousLow,
  };

  const setups: ShortSetup[] = [];

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    const nearResistances = resistances
      .filter((resistance) =>
        isNearResistance(candle, resistance, mergedOptions.resistanceProximityPct),
      )
      .sort((a, b) => Math.abs(candle.high - a.midPrice) - Math.abs(candle.high - b.midPrice));

    if (!nearResistances.length) {
      continue;
    }

    const rejection = detectBearishRejection(candle, mergedOptions.rejectionThreshold);
    if (!rejection.passed) {
      continue;
    }

    const confirmation = detectBearishConfirmation(
      candles,
      i,
      mergedOptions.confirmationMode,
      mergedOptions.requireBreakPreviousLow,
    );
    const context = detectRallyContext(candles, i, mergedOptions.rallyLookback);

    if (mergedOptions.requireRally && !context.passed) {
      continue;
    }

    let bestForCandle: ShortSetup | null = null;

    nearResistances.forEach((resistance) => {
      const setup = buildShortSetup({
        candle,
        candleIndex: i,
        resistance,
        supports,
        rejectionScoreFactor: rejection.score,
        rejectionTags: rejection.tags,
        confirmationPassed: confirmation.passed,
        confirmationBrokePreviousLow: confirmation.brokePreviousLow,
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
        (setup.totalScore === bestForCandle.totalScore && setup.status === 'strong_confirmed')
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
