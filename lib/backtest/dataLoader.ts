import type { ZodError, ZodTypeAny, output } from 'zod';
import {
  BUY_THE_DIP_CONFIG_SNAPSHOT,
  type BuyTheDipConfigSnapshot,
} from '@/lib/backtest/configTooltips';
import { mockStrategyRunData, mockWalkForwardRunData } from '@/lib/backtest/mockData';
import {
  backtestArtifactSchema,
  portfolioArtifactSchema,
  signalsArtifactSchema,
  walkforwardArtifactSchema,
  type BacktestArtifactWire,
  type BacktestSymbolResultWire,
  type CurrentSignalWire,
  type PortfolioArtifactWire,
  type SignalsArtifactWire,
  type WalkforwardArtifactWire,
} from '@/lib/backtest/schemas';
import type {
  BacktestMetrics,
  BacktestTradeSample,
  CurrentSignalSnapshot,
  DataSource,
  HistoricalSignal,
  PortfolioRun,
  StrategyConfigSummary,
  StrategyRun,
  SymbolBacktestResult,
  WalkForwardRun,
  WalkForwardSegment,
  WalkForwardSymbolResult,
} from '@/lib/backtest/types';

const DEFAULT_BASE_URL = '/data/buy_the_dip';
type WalkforwardSegmentWire = NonNullable<WalkforwardArtifactWire['symbolResults'][number]['segments']>[number];

export type BuyTheDipDataMode = 'mock' | 'json';

export type BuyTheDipPageData = {
  requestedMode: BuyTheDipDataMode;
  resolvedMode: BuyTheDipDataMode;
  strategyRunData: StrategyRun;
  walkForwardData?: WalkForwardRun;
  portfolioData?: PortfolioRun;
  configSnapshot: BuyTheDipConfigSnapshot;
  message?: string;
  dataBaseUrl?: string;
};

function getConfiguredMode(): BuyTheDipDataMode {
  const raw = String(import.meta.env.VITE_BUY_DIP_DATA_MODE ?? 'mock')
    .trim()
    .toLowerCase();
  return raw === 'json' ? 'json' : 'mock';
}

function getConfiguredBaseUrl(): string {
  const raw = String(import.meta.env.VITE_BUY_DIP_DATA_BASE_URL ?? DEFAULT_BASE_URL).trim();
  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  return withoutTrailingSlash || DEFAULT_BASE_URL;
}

function joinUrl(baseUrl: string, fileName: string): string {
  return `${baseUrl}/${fileName}`;
}

function toSource(raw: string): DataSource {
  return raw === 'python' ? 'python' : 'mock';
}

function decimalToPercent(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return value * 100;
}

function toOptionalNumber(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined;
  return value;
}

function toOptionalPercent(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined;
  return decimalToPercent(value);
}

function adaptConfigSnapshot(snapshot: BuyTheDipConfigSnapshot): StrategyConfigSummary {
  const symbolOverrides = Object.entries(snapshot.SYMBOL_SIGNAL_OVERRIDES).reduce<
    StrategyConfigSummary["symbolOverrides"]
  >((acc, [symbol, override]) => {
    acc[symbol] = {
      dipThresholdPct: decimalToPercent(override.dip_threshold),
      useVolumeFilter: override.use_volume_filter,
      useRsiFilter: override.use_rsi_filter,
      holdTimeoutHours: toOptionalNumber(override.hold_timeout_hours ?? undefined),
      maxPositions: toOptionalNumber(override.max_positions ?? undefined),
      takeProfitPct: toOptionalPercent(override.take_profit_pct ?? undefined),
      stopLossPct: toOptionalPercent(override.stop_loss_pct ?? undefined),
      minVolumeMult: toOptionalNumber(override.min_volume_mult ?? undefined),
      rsiMin: toOptionalNumber(override.rsi_min ?? undefined),
      rsiMax: toOptionalNumber(override.rsi_max ?? undefined),
      oneEntryPerDipEvent: override.one_entry_per_dip_event ?? undefined,
      dipEventResetPct: toOptionalPercent(override.dip_event_reset_pct ?? undefined),
      failFastBars: toOptionalNumber(override.fail_fast_bars ?? undefined),
      failFastMinReboundPct: toOptionalPercent(override.fail_fast_min_rebound_pct ?? undefined),
    };
    return acc;
  }, {});

  return {
    timeframe: snapshot.TIMEFRAME,
    lookbackHours: snapshot.DIP_LOOKBACK_HOURS,
    dipThresholdPct: decimalToPercent(snapshot.DIP_THRESHOLD_PCT),
    takeProfitPct: decimalToPercent(snapshot.TAKE_PROFIT_PCT),
    stopLossPct: decimalToPercent(snapshot.STOP_LOSS_PCT),
    holdTimeoutHours: snapshot.HOLD_TIMEOUT_HOURS,
    oneEntryPerDipEvent: Boolean(snapshot.ONE_ENTRY_PER_DIP_EVENT),
    dipEventResetPct: decimalToPercent(snapshot.DIP_EVENT_RESET_PCT ?? 0),
    failFastBars: toOptionalNumber(snapshot.FAIL_FAST_BARS ?? undefined),
    failFastMinReboundPct: decimalToPercent(snapshot.FAIL_FAST_MIN_REBOUND_PCT ?? 0),
    positionPct: decimalToPercent(snapshot.POSITION_PCT),
    maxPositions: snapshot.MAX_POSITIONS,
    feePct: decimalToPercent(snapshot.FEE_PCT),
    useVolumeFilter: snapshot.USE_VOLUME_FILTER,
    minVolumeMult: snapshot.MIN_VOLUME_MULT,
    useRsiFilter: snapshot.USE_RSI_FILTER,
    rsiMin: snapshot.RSI_MIN,
    rsiMax: snapshot.RSI_MAX,
    symbolOverrides,
  };
}

function adaptCurrentSignal(raw: CurrentSignalWire): CurrentSignalSnapshot {
  const summaryText = raw.summary_text ?? raw.summary ?? 'No summary available';

  return {
    signal: raw.signal,
    timestamp: raw.timestamp,
    close: raw.close,
    pastReturnPct: raw.past_return,
    dipThresholdPct: raw.dip_threshold,
    rsi14: raw.rsi_14 ?? null,
    relativeVolume: raw.relative_volume ?? null,
    summary: summaryText,
    summaryText,
    blockedBy: raw.blocked_by ?? raw.blockedBy ?? undefined,
    entryPrice: toOptionalNumber(raw.entry_price ?? undefined),
    takeProfit: toOptionalNumber(raw.take_profit ?? undefined),
    stopLoss: toOptionalNumber(raw.stop_loss ?? undefined),
    conditions: raw.conditions?.map((condition) => ({
      name: condition.name,
      passed: condition.passed,
      detail: condition.detail,
    })),
  };
}

function adaptHistoricalSignals(raw: BacktestSymbolResultWire['historicalSignals']): HistoricalSignal[] {
  return raw.map((item) => ({
    timestamp: item.timestamp,
    signal: item.signal,
    close: item.close,
    pastReturnPct: decimalToPercent(item.past_return),
    dipThresholdPct: decimalToPercent(item.dip_threshold),
    dipSizePct: toOptionalPercent(item.dip_size ?? undefined),
    rsi14: item.rsi_14 ?? null,
    relativeVolume: item.relative_volume ?? null,
    reason: item.reason ?? undefined,
  }));
}

function adaptMetrics(raw: BacktestSymbolResultWire['metrics']): BacktestMetrics {
  return {
    totalReturnPct: decimalToPercent(raw.total_return),
    sharpe: raw.sharpe,
    maxDrawdownPct: decimalToPercent(raw.max_drawdown),
    winRatePct: decimalToPercent(raw.win_rate),
    profitFactor: raw.profit_factor,
    totalTrades: raw.total_trades,
    expectancyPct: decimalToPercent(raw.expectancy),
    finalCapital: raw.final_capital,
  };
}

function adaptExitReason(
  value: string,
): BacktestTradeSample['exitReason'] {
  if (value === 'take_profit') return 'take_profit';
  if (value === 'stop_loss') return 'stop_loss';
  if (value === 'fail_fast') return 'fail_fast';
  if (value === 'end_of_data') return 'end_of_data';
  return 'timeout';
}

function adaptTrades(symbol: string, raw: BacktestSymbolResultWire['trades']): BacktestTradeSample[] {
  const symbolKey = symbol.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  return raw.map((item, index) => {
    const entrySignal = item.entry_signal;

    return {
      id: `${symbolKey}-trade-${index + 1}`,
      entryTime: item.entry_time,
      exitTime: item.exit_time,
      entryPrice: item.entry_price,
      exitPrice: item.exit_price,
      pnlPct: decimalToPercent(item.pnl_pct),
      pnlAfterFeesPct: toOptionalPercent(item.pnl_after_fees),
      exitReason: adaptExitReason(item.exit_reason),
      holdingBars: Math.max(0, Math.floor(item.duration_bars)),
      entrySignal: entrySignal
        ? {
            summaryText: entrySignal.summary_text,
            blockedBy: entrySignal.blocked_by ?? undefined,
            pastReturnPct: entrySignal.past_return,
            dipThresholdPct: entrySignal.dip_threshold,
            rsi14: entrySignal.rsi_14 ?? null,
            relativeVolume: entrySignal.relative_volume ?? null,
            dipSizePct: entrySignal.dip_size ?? null,
            conditions: entrySignal.conditions.map((condition) => ({
              name: condition.name,
              passed: condition.passed,
              detail: condition.detail,
            })),
          }
        : undefined,
    };
  });
}

function adaptFuturesReality(
  raw: BacktestSymbolResultWire['futuresReality'],
): SymbolBacktestResult['futuresReality'] {
  if (!raw) return undefined;
  return {
    leverage: raw.leverage,
    netReturnPct: raw.netReturnPct,
    grossReturnSumPct: raw.grossReturnSumPct,
    netReturnSumPct: raw.netReturnSumPct,
    fundingPaidPct: raw.fundingPaidPct,
    slippageFeesPct: raw.slippageFeesPct,
    nLiquidations: raw.nLiquidations,
    liquidationPrice: raw.liquidationPrice,
    stopLossPrice: raw.stopLossPrice,
    slBelowLiquidation: raw.slBelowLiquidation,
    lastClose: raw.lastClose,
  };
}

function adaptBacktestSymbolResult(
  raw: BacktestSymbolResultWire,
  signalOverride: CurrentSignalWire | undefined,
): SymbolBacktestResult {
  const currentSignal = signalOverride ? adaptCurrentSignal(signalOverride) : adaptCurrentSignal(raw.currentSignal);

  return {
    symbol: raw.symbol,
    metrics: adaptMetrics(raw.metrics),
    futuresReality: adaptFuturesReality(raw.futuresReality),
    candles: raw.candles.map((candle) => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume ?? undefined,
    })),
    historicalSignals: adaptHistoricalSignals(raw.historicalSignals),
    equityCurve: raw.equityCurve.map((point) => ({
      timestamp: point.timestamp,
      equity: point.equity,
    })),
    trades: adaptTrades(raw.symbol, raw.trades),
    currentSignal,
  };
}

function adaptWalkForwardSegment(raw: WalkforwardSegmentWire): WalkForwardSegment {
  return {
    segmentId: raw.segmentId,
    trainStart: raw.trainStart ?? '',
    trainEnd: raw.trainEnd ?? '',
    testStart: raw.testStart ?? '',
    testEnd: raw.testEnd ?? '',
    totalReturnPct: raw.totalReturnPct,
    sharpe: raw.sharpe,
    winRatePct: raw.winRatePct,
    profitFactor: raw.profitFactor,
    maxDrawdownPct: raw.maxDrawdownPct,
    trades: Math.max(0, Math.floor(raw.trades)),
  };
}

function adaptWalkForwardSymbolResult(
  raw: WalkforwardArtifactWire['symbolResults'][number],
): WalkForwardSymbolResult {
  return {
    symbol: raw.symbol,
    status: raw.status,
    stabilityScore: raw.stabilityScore,
    positiveWindowsPct: raw.positiveWindowsPct,
    segments: raw.segments?.map(adaptWalkForwardSegment),
    summary: raw.summary,
  };
}

function adaptBacktestRun(backtest: BacktestArtifactWire, signals: SignalsArtifactWire): {
  strategyRunData: StrategyRun;
  configSnapshot: BuyTheDipConfigSnapshot;
} {
  const signalBySymbol = new Map(signals.symbols.map((item) => [item.symbol, item]));
  const configSnapshot = backtest.configSnapshot as BuyTheDipConfigSnapshot;

  const symbolResults = backtest.symbolResults.map((symbolResult) =>
    adaptBacktestSymbolResult(symbolResult, signalBySymbol.get(symbolResult.symbol)),
  );

  return {
    strategyRunData: {
      runId: backtest.runId,
      generatedAt: backtest.generatedAt,
      source: toSource(backtest.source),
      strategyName: backtest.strategy,
      strategyVersion: backtest.schemaVersion,
      symbolResults,
      config: adaptConfigSnapshot(configSnapshot),
    },
    configSnapshot,
  };
}

function adaptPortfolioRun(raw: PortfolioArtifactWire): PortfolioRun {
  return {
    runId: raw.runId,
    generatedAt: raw.generatedAt,
    source: toSource(raw.source),
    status: raw.status,
    summary: raw.summary,
    config: raw.config,
    metrics: raw.metrics,
    comparison: raw.comparison,
    perSymbol: (raw.perSymbol ?? []).map((item) => ({
      symbol: item.symbol,
      tradesTaken: item.trades_taken,
      signalsMissed: item.signals_missed,
      pnlSumPct: item.pnl_sum_pct,
      winRatePct: item.win_rate,
    })),
    equityCurve: (raw.equityCurve ?? []).map((point) => ({
      timestamp: point.timestamp,
      equity: point.equity,
    })),
  };
}

function adaptWalkForwardRun(raw: WalkforwardArtifactWire): WalkForwardRun {
  return {
    runId: raw.runId,
    generatedAt: raw.generatedAt,
    source: toSource(raw.source),
    status: raw.status,
    symbolResults: raw.symbolResults.map(adaptWalkForwardSymbolResult),
  };
}

function buildMockResponse(
  requestedMode: BuyTheDipDataMode,
  message?: string,
  dataBaseUrl?: string,
): BuyTheDipPageData {
  return {
    requestedMode,
    resolvedMode: 'mock',
    strategyRunData: mockStrategyRunData,
    walkForwardData: mockWalkForwardRunData,
    configSnapshot: BUY_THE_DIP_CONFIG_SNAPSHOT,
    message,
    dataBaseUrl,
  };
}

function buildParseError(error: ZodError, artifactName: string): Error {
  const details = error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join(' | ');
  return new Error(`${artifactName} invalid schema. ${details}`);
}

function parseArtifact<TSchema extends ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  artifactName: string,
): output<TSchema> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw buildParseError(result.error, artifactName);
  }
  return result.data;
}

async function fetchArtifact(url: string, required: boolean): Promise<unknown | undefined> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    if (!required && response.status === 404) {
      return undefined;
    }
    throw new Error(`Failed to fetch ${url} (${response.status} ${response.statusText})`);
  }

  return response.json();
}

async function loadFromJson(baseUrl: string): Promise<Omit<BuyTheDipPageData, 'requestedMode' | 'resolvedMode'>> {
  const backtestUrl = joinUrl(baseUrl, 'backtest.latest.json');
  const signalsUrl = joinUrl(baseUrl, 'signals.latest.json');
  const walkforwardUrl = joinUrl(baseUrl, 'walkforward.latest.json');
  const portfolioUrl = joinUrl(baseUrl, 'portfolio.latest.json');

  const [backtestPayload, signalsPayload, walkforwardPayload, portfolioPayload] = await Promise.all([
    fetchArtifact(backtestUrl, true),
    fetchArtifact(signalsUrl, true),
    fetchArtifact(walkforwardUrl, false),
    fetchArtifact(portfolioUrl, false),
  ]);

  const backtest = parseArtifact(backtestArtifactSchema, backtestPayload, 'backtest.latest.json');
  const signals = parseArtifact(signalsArtifactSchema, signalsPayload, 'signals.latest.json');
  const walkforward = walkforwardPayload
    ? parseArtifact(walkforwardArtifactSchema, walkforwardPayload, 'walkforward.latest.json')
    : undefined;
  const portfolio = portfolioPayload
    ? parseArtifact(portfolioArtifactSchema, portfolioPayload, 'portfolio.latest.json')
    : undefined;

  const warnings: string[] = [];
  if (signals.runId !== backtest.runId) {
    warnings.push('runId entre backtest y signals no coincide');
  }
  if (walkforward && walkforward.runId !== backtest.runId) {
    warnings.push('runId entre backtest y walkforward no coincide');
  }

  const { strategyRunData, configSnapshot } = adaptBacktestRun(backtest, signals);

  return {
    strategyRunData,
    walkForwardData: walkforward ? adaptWalkForwardRun(walkforward) : undefined,
    portfolioData: portfolio ? adaptPortfolioRun(portfolio) : undefined,
    configSnapshot,
    message: warnings.length
      ? `JSON cargado con advertencias: ${warnings.join(' | ')}.`
      : undefined,
    dataBaseUrl: baseUrl,
  };
}

export async function loadBuyTheDipPageData(): Promise<BuyTheDipPageData> {
  const requestedMode = getConfiguredMode();
  const baseUrl = getConfiguredBaseUrl();

  if (requestedMode === 'mock') {
    return buildMockResponse('mock', undefined, baseUrl);
  }

  try {
    const loaded = await loadFromJson(baseUrl);
    return {
      requestedMode,
      resolvedMode: 'json',
      ...loaded,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return buildMockResponse(
      requestedMode,
      `No se pudo cargar JSON real desde ${baseUrl}. Se usa mock como fallback. Motivo: ${reason}`,
      baseUrl,
    );
  }
}
