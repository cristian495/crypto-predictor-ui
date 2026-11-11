import type {
  StrategyRun,
  SymbolBacktestResult,
  WalkForwardRun,
  WalkForwardSymbolResult,
} from './types';

const BASE_CONFIG: StrategyRun['config'] = {
  timeframe: '1h',
  lookbackHours: 24,
  dipThresholdPct: -7,
  takeProfitPct: 4,
  stopLossPct: 20,
  holdTimeoutHours: 24,
  oneEntryPerDipEvent: false,
  dipEventResetPct: -4,
  failFastBars: undefined,
  failFastMinReboundPct: 1,
  positionPct: 20,
  maxPositions: 2,
  feePct: 0.1,
  useVolumeFilter: false,
  minVolumeMult: 0.5,
  useRsiFilter: false,
  rsiMin: 10,
  rsiMax: 40,
  symbolOverrides: {
    'BNB/USDT': { dipThresholdPct: -5, useVolumeFilter: true, useRsiFilter: false },
    'DOGE/USDT': { dipThresholdPct: -5, useVolumeFilter: true, useRsiFilter: true },
    'XRP/USDT': {
      dipThresholdPct: -5.5,
      useVolumeFilter: true,
      useRsiFilter: false,
      holdTimeoutHours: 27,
      maxPositions: 4,
      takeProfitPct: 4,
      stopLossPct: 20,
      oneEntryPerDipEvent: false,
      dipEventResetPct: -4,
      failFastBars: undefined,
      failFastMinReboundPct: 1,
    },
    'ADA/USDT': { dipThresholdPct: -6, useVolumeFilter: true, useRsiFilter: false },
  },
};

function pctChange(entry: number, exit: number): number {
  if (entry <= 0) return 0;
  return ((exit - entry) / entry) * 100;
}

function generateMockCandles(
  basePrice: number,
  hours: number,
  endIso: string,
): SymbolBacktestResult['candles'] {
  const endMs = Date.parse(endIso);
  const startMs = endMs - (hours - 1) * 60 * 60 * 1000;
  const rough: SymbolBacktestResult['candles'] = [];

  let previousClose = basePrice * 1.08;

  for (let i = 0; i < hours; i += 1) {
    const wave = Math.sin(i / 5) * 0.005 + Math.cos(i / 17) * 0.003;
    const drift = i > hours - 30 ? -0.0012 : -0.00015;
    const open = previousClose;
    const close = Math.max(basePrice * 0.72, open * (1 + wave + drift));
    const upperWick = 0.003 + ((i + 3) % 7) * 0.0006;
    const lowerWick = 0.0028 + ((i + 1) % 5) * 0.00055;
    const high = Math.max(open, close) * (1 + upperWick);
    const low = Math.min(open, close) * (1 - lowerWick);

    rough.push({
      timestamp: new Date(startMs + i * 60 * 60 * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.round(900 + (i % 24) * 38 + Math.abs(Math.sin(i / 4)) * 260),
    });

    previousClose = close;
  }

  const lastClose = rough[rough.length - 1]?.close ?? basePrice;
  const scale = lastClose > 0 ? basePrice / lastClose : 1;

  return rough.map((candle) => ({
    ...candle,
    open: candle.open * scale,
    high: candle.high * scale,
    low: candle.low * scale,
    close: candle.close * scale,
  }));
}

function buildSymbolBacktest(
  symbol: string,
  metrics: SymbolBacktestResult['metrics'],
  currentSignal: SymbolBacktestResult['currentSignal'],
): SymbolBacktestResult {
  const base = currentSignal.close;
  const symbolSlug = symbol.replace('/', '-').toLowerCase();
  const candles = generateMockCandles(base, 220, currentSignal.timestamp);
  const equityAnchors = [0, 40, 80, 120, 160, 200, candles.length - 1].filter(
    (idx) => idx >= 0 && idx < candles.length,
  );
  const equityValues = [10000, 9970, 10140, 10090, 10320, 10410, metrics.finalCapital];

  const trade1EntryTime = candles[Math.max(0, candles.length - 82)]?.timestamp ?? currentSignal.timestamp;
  const trade1ExitTime = candles[Math.max(0, candles.length - 70)]?.timestamp ?? currentSignal.timestamp;
  const trade2EntryTime = candles[Math.max(0, candles.length - 46)]?.timestamp ?? currentSignal.timestamp;
  const trade2ExitTime = candles[Math.max(0, candles.length - 28)]?.timestamp ?? currentSignal.timestamp;

  const trade1EntryPrice = base * 0.96;
  const trade1ExitPrice = base * 1.0;
  const trade2EntryPrice = base * 0.97;
  const trade2ExitPrice = base * 0.95;

  const trade1Pnl = pctChange(trade1EntryPrice, trade1ExitPrice);
  const trade2Pnl = pctChange(trade2EntryPrice, trade2ExitPrice);

  return {
    symbol,
    metrics,
    candles,
    historicalSignals: [
      {
        timestamp: candles[Math.max(0, candles.length - 54)]?.timestamp ?? currentSignal.timestamp,
        signal: 'LONG',
        close: base * 0.97,
        pastReturnPct: -7.4,
        dipThresholdPct: -7,
        dipSizePct: -7.4,
        rsi14: 32,
        relativeVolume: 1.12,
        reason: '24h drop crossed threshold',
      },
      {
        timestamp: candles[Math.max(0, candles.length - 26)]?.timestamp ?? currentSignal.timestamp,
        signal: 'NO_SIGNAL',
        close: base * 1.02,
        pastReturnPct: -2.1,
        dipThresholdPct: -7,
        rsi14: 47,
        relativeVolume: 0.88,
        reason: 'Dip condition not met',
      },
      {
        timestamp: currentSignal.timestamp,
        signal: currentSignal.signal,
        close: currentSignal.close,
        pastReturnPct: currentSignal.pastReturnPct,
        dipThresholdPct: currentSignal.dipThresholdPct,
        rsi14: currentSignal.rsi14,
        relativeVolume: currentSignal.relativeVolume,
        reason: currentSignal.summary,
      },
    ],
    equityCurve: equityAnchors.map((idx, i) => ({
      timestamp: candles[idx]?.timestamp ?? currentSignal.timestamp,
      equity: equityValues[Math.min(i, equityValues.length - 1)],
    })),
    trades: [
      {
        id: `${symbolSlug}-t1`,
        entryTime: trade1EntryTime,
        exitTime: trade1ExitTime,
        entryPrice: trade1EntryPrice,
        exitPrice: trade1ExitPrice,
        pnlPct: trade1Pnl,
        pnlAfterFeesPct: trade1Pnl - 0.1,
        exitReason: 'take_profit',
        holdingBars: 24,
      },
      {
        id: `${symbolSlug}-t2`,
        entryTime: trade2EntryTime,
        exitTime: trade2ExitTime,
        entryPrice: trade2EntryPrice,
        exitPrice: trade2ExitPrice,
        pnlPct: trade2Pnl,
        pnlAfterFeesPct: trade2Pnl - 0.1,
        exitReason: 'timeout',
        holdingBars: 24,
      },
    ],
    currentSignal,
  };
}

export const mockStrategyRunData: StrategyRun = {
  runId: 'btd-run-2026-03-30-001',
  generatedAt: '2026-03-30T17:20:00Z',
  source: 'mock',
  strategyName: 'buy_the_dip',
  strategyVersion: 'v1.0-mock',
  config: BASE_CONFIG,
  symbolResults: [
    buildSymbolBacktest(
      'BNB/USDT',
      {
        totalReturnPct: 25.5,
        sharpe: 1.84,
        maxDrawdownPct: -11.2,
        winRatePct: 70.0,
        profitFactor: 1.82,
        totalTrades: 118,
        expectancyPct: 0.92,
        finalCapital: 12550,
      },
      {
        signal: 'LONG',
        timestamp: '2026-03-30T17:00:00Z',
        close: 599.2,
        pastReturnPct: -7.9,
        dipThresholdPct: -5,
        rsi14: 34,
        relativeVolume: 1.24,
        summary: 'BUY THE DIP candidate detected on last bar',
        summaryText: 'BUY THE DIP candidate detected on last bar',
        entryPrice: 599.2,
        takeProfit: 623.168,
        stopLoss: 479.36,
        conditions: [
          { name: 'dip_threshold', passed: true, detail: 'past_return=-7.90% < th=-5.00%' },
          { name: 'volume_filter', passed: true, detail: 'relative_volume=1.24 >= min=0.50' },
          { name: 'rsi_filter', passed: true, detail: 'disabled' },
        ],
      },
    ),
    buildSymbolBacktest(
      'DOGE/USDT',
      {
        totalReturnPct: 7.6,
        sharpe: 0.92,
        maxDrawdownPct: -18.4,
        winRatePct: 69.1,
        profitFactor: 1.33,
        totalTrades: 162,
        expectancyPct: 0.31,
        finalCapital: 10760,
      },
      {
        signal: 'NO_SIGNAL',
        timestamp: '2026-03-30T17:00:00Z',
        close: 0.167,
        pastReturnPct: -3.6,
        dipThresholdPct: -5,
        rsi14: 42,
        relativeVolume: 0.97,
        summary: 'No trade: dip threshold not reached',
        summaryText: 'No trade: dip threshold not reached',
        blockedBy: 'dip_threshold (past_return=-3.60% < th=-5.00%)',
        conditions: [
          { name: 'dip_threshold', passed: false, detail: 'past_return=-3.60% < th=-5.00%' },
          { name: 'volume_filter', passed: true, detail: 'relative_volume=0.97 >= min=0.50' },
          { name: 'rsi_filter', passed: false, detail: 'rsi_14=42.00 in [10, 40]' },
        ],
      },
    ),
    buildSymbolBacktest(
      'XRP/USDT',
      {
        totalReturnPct: 12.9,
        sharpe: 1.21,
        maxDrawdownPct: -14.7,
        winRatePct: 63.5,
        profitFactor: 1.45,
        totalTrades: 97,
        expectancyPct: 0.41,
        finalCapital: 11290,
      },
      {
        signal: 'LONG',
        timestamp: '2026-03-30T17:00:00Z',
        close: 0.71,
        pastReturnPct: -6.2,
        dipThresholdPct: -6,
        rsi14: 38,
        relativeVolume: 1.05,
        summary: 'BUY THE DIP candidate detected',
        summaryText: 'BUY THE DIP candidate detected',
        entryPrice: 0.71,
        takeProfit: 0.7384,
        stopLoss: 0.568,
        conditions: [
          { name: 'dip_threshold', passed: true, detail: 'past_return=-6.20% < th=-6.00%' },
          { name: 'volume_filter', passed: true, detail: 'relative_volume=1.05 >= min=0.50' },
          { name: 'rsi_filter', passed: true, detail: 'disabled' },
        ],
      },
    ),
    buildSymbolBacktest(
      'ADA/USDT',
      {
        totalReturnPct: 9.4,
        sharpe: 1.01,
        maxDrawdownPct: -15.8,
        winRatePct: 61.2,
        profitFactor: 1.28,
        totalTrades: 84,
        expectancyPct: 0.26,
        finalCapital: 10940,
      },
      {
        signal: 'NO_SIGNAL',
        timestamp: '2026-03-30T17:00:00Z',
        close: 0.58,
        pastReturnPct: -4.8,
        dipThresholdPct: -6,
        rsi14: 45,
        relativeVolume: 0.92,
        summary: 'No trade: dip threshold not reached',
        summaryText: 'No trade: dip threshold not reached',
        blockedBy: 'dip_threshold (past_return=-4.80% < th=-6.00%)',
        conditions: [
          { name: 'dip_threshold', passed: false, detail: 'past_return=-4.80% < th=-6.00%' },
          { name: 'volume_filter', passed: true, detail: 'relative_volume=0.92 >= min=0.50' },
          { name: 'rsi_filter', passed: true, detail: 'disabled' },
        ],
      },
    ),
  ],
};

const walkForwardSymbols: WalkForwardSymbolResult[] = [
  {
    symbol: 'BNB/USDT',
    status: 'available',
    stabilityScore: 76.4,
    positiveWindowsPct: 81.8,
    summary: 'Consistent out-of-sample performance in rolling windows.',
    segments: [
      {
        segmentId: 'seg-01',
        trainStart: '2025-01-01',
        trainEnd: '2025-06-30',
        testStart: '2025-07-01',
        testEnd: '2025-08-31',
        totalReturnPct: 2.2,
        sharpe: 0.9,
        winRatePct: 72,
        profitFactor: 1.6,
        maxDrawdownPct: -6.8,
        trades: 9,
        tradesDetail: [
          {
            tradeId: 'bnb-wf-01-t1',
            entryTime: '2025-07-08T04:00:00Z',
            exitTime: '2025-07-09T04:00:00Z',
            entryPrice: 561.24,
            exitPrice: 583.68,
            pnlPct: 3.99,
            exitReason: 'take_profit',
          },
          {
            tradeId: 'bnb-wf-01-t2',
            entryTime: '2025-08-12T11:00:00Z',
            exitTime: '2025-08-13T11:00:00Z',
            entryPrice: 588.1,
            exitPrice: 574.22,
            pnlPct: -2.36,
            exitReason: 'timeout',
          },
        ],
      },
      {
        segmentId: 'seg-02',
        trainStart: '2025-03-01',
        trainEnd: '2025-08-31',
        testStart: '2025-09-01',
        testEnd: '2025-10-31',
        totalReturnPct: 1.8,
        sharpe: 0.8,
        winRatePct: 66,
        profitFactor: 1.4,
        maxDrawdownPct: -7.1,
        trades: 7,
      },
    ],
  },
  {
    symbol: 'DOGE/USDT',
    status: 'available',
    stabilityScore: 62.7,
    positiveWindowsPct: 64.0,
    summary: 'Moderate consistency with higher volatility on test windows.',
    segments: [
      {
        segmentId: 'seg-01',
        trainStart: '2025-01-01',
        trainEnd: '2025-06-30',
        testStart: '2025-07-01',
        testEnd: '2025-08-31',
        totalReturnPct: 1.1,
        sharpe: 0.4,
        winRatePct: 63,
        profitFactor: 1.2,
        maxDrawdownPct: -9.2,
        trades: 12,
        tradesDetail: [
          {
            tradeId: 'doge-wf-01-t3',
            entryTime: '2025-07-20T02:00:00Z',
            exitTime: '2025-07-21T02:00:00Z',
            entryPrice: 0.1532,
            exitPrice: 0.1574,
            pnlPct: 2.74,
            exitReason: 'take_profit',
          },
        ],
      },
    ],
  },
  {
    symbol: 'XRP/USDT',
    status: 'not_available',
    summary: 'Walkforward file was not exported for this symbol.',
  },
  {
    symbol: 'ADA/USDT',
    status: 'available',
    stabilityScore: 63.8,
    positiveWindowsPct: 69.5,
    summary: 'Good consistency with lower trade frequency.',
    segments: [
      {
        segmentId: 'seg-01',
        trainStart: '2025-02-01',
        trainEnd: '2025-07-31',
        testStart: '2025-08-01',
        testEnd: '2025-09-30',
        totalReturnPct: 1.6,
        sharpe: 0.7,
        winRatePct: 64,
        profitFactor: 1.3,
        maxDrawdownPct: -8.4,
        trades: 6,
      },
    ],
  },
];

export const mockWalkForwardRunData: WalkForwardRun = {
  runId: 'wf-run-2026-03-30-001',
  generatedAt: '2026-03-30T17:20:00Z',
  source: 'mock',
  status: 'partial',
  symbolResults: walkForwardSymbols,
};

export function findSymbolBacktestResult(symbol: string): SymbolBacktestResult | undefined {
  return mockStrategyRunData.symbolResults.find((item) => item.symbol === symbol);
}

export function findWalkForwardSymbolResult(symbol: string): WalkForwardSymbolResult | undefined {
  return mockWalkForwardRunData.symbolResults.find((item) => item.symbol === symbol);
}
