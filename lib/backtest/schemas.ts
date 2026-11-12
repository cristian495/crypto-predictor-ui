import { z } from 'zod';

const symbolSchema = z.string().min(1);
const isoTimestampSchema = z.string().min(1);

const signalConditionSchema = z
  .object({
    name: z.string(),
    passed: z.boolean(),
    detail: z.string(),
  })
  .passthrough();

const currentSignalSchema = z
  .object({
    symbol: symbolSchema.optional(),
    signal: z.enum(['LONG', 'NO_SIGNAL']),
    timestamp: isoTimestampSchema,
    close: z.number(),
    past_return: z.number(),
    dip_threshold: z.number(),
    rsi_14: z.number().nullable().optional(),
    relative_volume: z.number().nullable().optional(),
    summary_text: z.string().optional(),
    summary: z.string().optional(),
    blocked_by: z.string().nullable().optional(),
    blockedBy: z.string().nullable().optional(),
    entry_price: z.number().nullable().optional(),
    take_profit: z.number().nullable().optional(),
    stop_loss: z.number().nullable().optional(),
    conditions: z.array(signalConditionSchema).optional(),
  })
  .passthrough();

const historicalSignalSchema = z
  .object({
    timestamp: isoTimestampSchema,
    signal: z.enum(['LONG', 'NO_SIGNAL']),
    close: z.number(),
    past_return: z.number(),
    dip_threshold: z.number(),
    dip_size: z.number().nullable().optional(),
    rsi_14: z.number().nullable().optional(),
    relative_volume: z.number().nullable().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

const candleSchema = z
  .object({
    timestamp: isoTimestampSchema,
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nullable().optional(),
  })
  .passthrough();

const backtestTradeSchema = z
  .object({
    entry_time: isoTimestampSchema,
    exit_time: isoTimestampSchema,
    entry_price: z.number(),
    exit_price: z.number(),
    pnl_pct: z.number(),
    pnl_after_fees: z.number().nullable().optional(),
    exit_reason: z.string(),
    duration_bars: z.number(),
    dip_size: z.number().nullable().optional(),
    max_rebound_pct: z.number().nullable().optional(),
    entry_signal: z
      .object({
        summary_text: z.string(),
        blocked_by: z.string().nullable().optional(),
        past_return: z.number(),
        dip_threshold: z.number(),
        rsi_14: z.number().nullable().optional(),
        relative_volume: z.number().nullable().optional(),
        dip_size: z.number().nullable().optional(),
        conditions: z.array(signalConditionSchema),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const equityPointSchema = z
  .object({
    timestamp: isoTimestampSchema,
    equity: z.number(),
  })
  .passthrough();

const backtestMetricsSchema = z
  .object({
    total_return: z.number(),
    sharpe: z.number(),
    max_drawdown: z.number(),
    win_rate: z.number(),
    profit_factor: z.number(),
    total_trades: z.number(),
    expectancy: z.number(),
    final_capital: z.number(),
    avg_win: z.number().optional(),
    avg_loss: z.number().optional(),
    // Futures realism (schema v2+)
    gross_return: z.number().optional(),
    net_return_sum: z.number().optional(),
    funding_paid_pct: z.number().optional(),
    slippage_paid_pct: z.number().optional(),
    n_liquidations: z.number().optional(),
    leverage: z.number().optional(),
    sl_below_liquidation: z.boolean().optional(),
  })
  .passthrough();

const futuresRealitySchema = z
  .object({
    leverage: z.number(),
    netReturnPct: z.number(),
    grossReturnSumPct: z.number(),
    netReturnSumPct: z.number(),
    fundingPaidPct: z.number(),
    slippageFeesPct: z.number(),
    nLiquidations: z.number(),
    liquidationPrice: z.number(),
    stopLossPrice: z.number(),
    slBelowLiquidation: z.boolean(),
    lastClose: z.number(),
  })
  .passthrough();

const symbolSignalParamsSchema = z
  .object({
    dip_threshold: z.number(),
    use_volume_filter: z.boolean(),
    use_rsi_filter: z.boolean(),
    hold_timeout_hours: z.number().optional(),
    max_positions: z.number().optional(),
    take_profit_pct: z.number().optional(),
    stop_loss_pct: z.number().optional(),
    min_volume_mult: z.number().optional(),
    rsi_min: z.number().optional(),
    rsi_max: z.number().optional(),
    one_entry_per_dip_event: z.boolean().optional(),
    dip_event_reset_pct: z.number().optional(),
    fail_fast_bars: z.number().nullable().optional(),
    fail_fast_min_rebound_pct: z.number().optional(),
    leverage: z.number().optional(),
  })
  .passthrough();

const symbolBacktestResultSchema = z
  .object({
    symbol: symbolSchema,
    signalParams: symbolSignalParamsSchema.optional(),
    metrics: backtestMetricsSchema,
    futuresReality: futuresRealitySchema.optional(),
    candles: z.array(candleSchema),
    historicalSignals: z.array(historicalSignalSchema),
    equityCurve: z.array(equityPointSchema),
    trades: z.array(backtestTradeSchema),
    currentSignal: currentSignalSchema,
  })
  .passthrough();

const configOverrideSchema = z
  .object({
    dip_threshold: z.number(),
    use_rsi_filter: z.boolean(),
    use_volume_filter: z.boolean(),
    hold_timeout_hours: z.number().optional(),
    max_positions: z.number().optional(),
    take_profit_pct: z.number().optional(),
    stop_loss_pct: z.number().optional(),
    min_volume_mult: z.number().optional(),
    rsi_min: z.number().optional(),
    rsi_max: z.number().optional(),
    one_entry_per_dip_event: z.boolean().optional(),
    dip_event_reset_pct: z.number().optional(),
    fail_fast_bars: z.number().nullable().optional(),
    fail_fast_min_rebound_pct: z.number().optional(),
  })
  .passthrough();

const configSnapshotSchema = z
  .object({
    TIMEFRAME: z.string(),
    DAYS: z.number(),
    DIP_THRESHOLD_PCT: z.number(),
    DIP_THRESHOLD_STRONG: z.number(),
    USE_STRONG_THRESHOLD: z.boolean(),
    DIP_LOOKBACK_HOURS: z.number(),
    TAKE_PROFIT_PCT: z.number(),
    STOP_LOSS_PCT: z.number(),
    HOLD_TIMEOUT_HOURS: z.number(),
    ONE_ENTRY_PER_DIP_EVENT: z.boolean().optional(),
    DIP_EVENT_RESET_PCT: z.number().optional(),
    FAIL_FAST_BARS: z.number().nullable().optional(),
    FAIL_FAST_MIN_REBOUND_PCT: z.number().optional(),
    POSITION_PCT: z.number(),
    MAX_POSITIONS: z.number(),
    INITIAL_CAPITAL: z.number(),
    FEE_PCT: z.number(),
    MIN_VOLUME_MULT: z.number(),
    RSI_MIN: z.number(),
    RSI_MAX: z.number(),
    USE_VOLUME_FILTER: z.boolean(),
    USE_RSI_FILTER: z.boolean(),
    LONG_ONLY: z.boolean(),
    WF_TRAIN_MONTHS: z.number(),
    WF_TEST_MONTHS: z.number(),
    WF_STEP_MONTHS: z.number(),
    DEFAULT_SYMBOLS: z.array(symbolSchema),
    SYMBOL_SIGNAL_OVERRIDES: z.record(symbolSchema, configOverrideSchema),
  })
  .passthrough();

export const signalsArtifactSchema = z
  .object({
    schemaVersion: z.string(),
    strategy: z.string(),
    source: z.string(),
    runId: z.string(),
    generatedAt: isoTimestampSchema,
    symbols: z.array(currentSignalSchema.extend({ symbol: symbolSchema })),
  })
  .passthrough();

export const backtestArtifactSchema = z
  .object({
    schemaVersion: z.string(),
    strategy: z.string(),
    source: z.string(),
    runId: z.string(),
    generatedAt: isoTimestampSchema,
    candleCap: z.number().optional(),
    configSnapshot: configSnapshotSchema,
    symbolResults: z.array(symbolBacktestResultSchema),
  })
  .passthrough();

const walkforwardSegmentSchema = z
  .object({
    segmentId: z.string(),
    window: z.number().optional(),
    trainStart: z.string().optional().default(''),
    trainEnd: z.string().optional().default(''),
    testStart: z.string().optional().default(''),
    testEnd: z.string().optional().default(''),
    totalReturnPct: z.number(),
    sharpe: z.number(),
    maxDrawdownPct: z.number(),
    winRatePct: z.number(),
    profitFactor: z.number(),
    trades: z.number(),
    expectancyPct: z.number().optional(),
  })
  .passthrough();

const walkforwardSymbolSchema = z
  .object({
    symbol: symbolSchema,
    status: z.enum(['available', 'not_available']),
    stabilityScore: z.number().optional(),
    positiveWindowsPct: z.number().optional(),
    summary: z.string().optional(),
    segments: z.array(walkforwardSegmentSchema).optional(),
  })
  .passthrough();

export const walkforwardArtifactSchema = z
  .object({
    schemaVersion: z.string(),
    strategy: z.string(),
    source: z.string(),
    runId: z.string(),
    generatedAt: isoTimestampSchema,
    status: z.enum(['available', 'partial', 'not_available']),
    config: z
      .object({
        trainMonths: z.number(),
        testMonths: z.number(),
        stepMonths: z.number(),
        days: z.number(),
      })
      .passthrough()
      .optional(),
    symbolResults: z.array(walkforwardSymbolSchema),
  })
  .passthrough();

const portfolioPerSymbolSchema = z
  .object({
    symbol: symbolSchema,
    trades_taken: z.number(),
    signals_missed: z.number(),
    pnl_sum_pct: z.number(),
    win_rate: z.number(),
  })
  .passthrough();

export const portfolioArtifactSchema = z
  .object({
    schemaVersion: z.string(),
    strategy: z.string(),
    source: z.string(),
    runId: z.string(),
    generatedAt: isoTimestampSchema,
    status: z.enum(['available', 'not_available']),
    summary: z.string().optional(),
    config: z
      .object({
        initialCapital: z.number(),
        positionPct: z.number(),
        maxPositions: z.number(),
        symbols: z.array(symbolSchema),
      })
      .passthrough()
      .optional(),
    metrics: z
      .object({
        totalReturnPct: z.number(),
        sharpe: z.number(),
        maxDrawdownPct: z.number(),
        winRatePct: z.number(),
        profitFactor: z.number(),
        totalTrades: z.number(),
        finalCapital: z.number(),
        nLiquidations: z.number(),
        missedSignals: z.number(),
      })
      .passthrough()
      .optional(),
    comparison: z
      .object({
        sumIsolatedReturnPct: z.number(),
        portfolioReturnPct: z.number(),
      })
      .passthrough()
      .optional(),
    perSymbol: z.array(portfolioPerSymbolSchema).optional(),
    equityCurve: z.array(equityPointSchema).optional(),
  })
  .passthrough();

// ── Live paper-trading (generado por resolve_signals.py) ──────────────────────
const liveBySymbolSchema = z
  .object({
    trades: z.number(),
    wins: z.number(),
    pnl_pct: z.number(),
    win_rate: z.number(),
  })
  .passthrough();

export const liveSummarySchema = z
  .object({
    resolved: z.number(),
    open: z.number(),
    winRatePct: z.number(),
    profitFactor: z.number(),
    avgPnlPct: z.number(),
    totalPnlPct: z.number(),
    byExitReason: z.record(z.string(), z.number()).optional(),
    bySymbol: z.record(z.string(), liveBySymbolSchema).optional(),
    liveVsBacktest: z
      .object({
        backtestWinRatePct: z.number(),
        liveWinRatePct: z.number(),
        backtestProfitFactor: z.number(),
        liveProfitFactor: z.number(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

// Una línea de live_results.jsonl (señal resuelta).
export const liveResultSchema = z
  .object({
    status: z.string().optional(),
    symbol: z.string(),
    bar_timestamp: z.string(),
    entry_price: z.number(),
    exit_price: z.number(),
    exit_reason: z.string(),
    pnl_pct: z.number(),
    duration_bars: z.number().optional(),
    leverage: z.number().optional(),
    win: z.boolean(),
  })
  .passthrough();

export type SignalsArtifactWire = z.infer<typeof signalsArtifactSchema>;
export type BacktestArtifactWire = z.infer<typeof backtestArtifactSchema>;
export type PortfolioArtifactWire = z.infer<typeof portfolioArtifactSchema>;
export type LiveSummaryWire = z.infer<typeof liveSummarySchema>;
export type LiveResultWire = z.infer<typeof liveResultSchema>;
export type WalkforwardArtifactWire = z.infer<typeof walkforwardArtifactSchema>;
export type BacktestSymbolResultWire = z.infer<typeof symbolBacktestResultSchema>;
export type CurrentSignalWire = z.infer<typeof currentSignalSchema>;
