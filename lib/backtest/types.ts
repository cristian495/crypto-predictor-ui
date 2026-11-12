export type DataSource = 'mock' | 'python';

export type SignalType = 'LONG' | 'NO_SIGNAL';

export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type HistoricalSignal = {
  timestamp: string;
  signal: SignalType;
  close: number;
  pastReturnPct: number;
  dipThresholdPct: number;
  dipSizePct?: number;
  rsi14?: number | null;
  relativeVolume?: number | null;
  reason?: string;
};

export type StrategyConfigSummary = {
  timeframe: string;
  lookbackHours: number;
  dipThresholdPct: number;
  takeProfitPct: number;
  stopLossPct: number;
  holdTimeoutHours: number;
  oneEntryPerDipEvent: boolean;
  dipEventResetPct: number;
  failFastBars?: number;
  failFastMinReboundPct: number;
  positionPct: number;
  maxPositions: number;
  feePct: number;
  useVolumeFilter: boolean;
  minVolumeMult: number;
  useRsiFilter: boolean;
  rsiMin: number;
  rsiMax: number;
  symbolOverrides: Record<
    string,
    {
      dipThresholdPct: number;
      useVolumeFilter: boolean;
      useRsiFilter: boolean;
      holdTimeoutHours?: number;
      maxPositions?: number;
      takeProfitPct?: number;
      stopLossPct?: number;
      minVolumeMult?: number;
      rsiMin?: number;
      rsiMax?: number;
      oneEntryPerDipEvent?: boolean;
      dipEventResetPct?: number;
      failFastBars?: number;
      failFastMinReboundPct?: number;
    }
  >;
};

export type BacktestMetrics = {
  totalReturnPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  expectancyPct: number;
  finalCapital: number;
};

export type FuturesReality = {
  leverage: number;
  /** Retorno NETO compuesto del backtest (ya incluye todos los costes). */
  netReturnPct: number;
  /** Suma simple de % de PnL de precio por trade (sin costes). Desglose, no compuesto. */
  grossReturnSumPct: number;
  /** Suma simple de % neto por trade tras costes. Desglose. */
  netReturnSumPct: number;
  /** Funding pagado acumulado (% sobre notional). Positivo = pagaste. */
  fundingPaidPct: number;
  /** Slippage + fees acumulados (% sobre notional). */
  slippageFeesPct: number;
  nLiquidations: number;
  liquidationPrice: number;
  stopLossPrice: number;
  /** True si el SL configurado cae por debajo del precio de liquidacion (SL inutil). */
  slBelowLiquidation: boolean;
  lastClose: number;
};

export type SignalConditionCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

export type BacktestTradeEntrySignal = {
  summaryText: string;
  blockedBy?: string;
  pastReturnPct: number;
  dipThresholdPct: number;
  rsi14?: number | null;
  relativeVolume?: number | null;
  dipSizePct?: number | null;
  conditions: SignalConditionCheck[];
};

export type BacktestTradeSample = {
  id: string;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  pnlAfterFeesPct?: number;
  exitReason: 'take_profit' | 'stop_loss' | 'fail_fast' | 'timeout' | 'end_of_data';
  holdingBars: number;
  entrySignal?: BacktestTradeEntrySignal;
};

export type BacktestEquityPoint = {
  timestamp: string;
  equity: number;
};

export type CurrentSignalSnapshot = {
  signal: SignalType;
  timestamp: string;
  close: number;
  pastReturnPct: number;
  dipThresholdPct: number;
  rsi14?: number | null;
  relativeVolume?: number | null;
  summary: string;
  summaryText?: string;
  blockedBy?: string;
  entryPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  conditions?: SignalConditionCheck[];
};

export type SymbolBacktestResult = {
  symbol: string;
  metrics: BacktestMetrics;
  futuresReality?: FuturesReality;
  candles: Candle[];
  historicalSignals: HistoricalSignal[];
  equityCurve: BacktestEquityPoint[];
  trades: BacktestTradeSample[];
  currentSignal: CurrentSignalSnapshot;
};

export type StrategyRun = {
  runId: string;
  generatedAt: string;
  source: DataSource;
  strategyName: string;
  strategyVersion: string;
  symbolResults: SymbolBacktestResult[];
  config: StrategyConfigSummary;
};

export type WalkForwardTradeDetail = {
  tradeId: string;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  exitReason?: string;
};

export type WalkForwardSegment = {
  segmentId: string;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  totalReturnPct: number;
  sharpe: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  trades: number;
  tradesDetail?: WalkForwardTradeDetail[];
};

export type WalkForwardSymbolResult = {
  symbol: string;
  status: 'available' | 'not_available';
  stabilityScore?: number;
  positiveWindowsPct?: number;
  segments?: WalkForwardSegment[];
  summary?: string;
};

export type WalkForwardRun = {
  runId: string;
  generatedAt: string;
  source: DataSource;
  status: 'available' | 'partial' | 'not_available';
  symbolResults: WalkForwardSymbolResult[];
};

export type PortfolioSymbolContribution = {
  symbol: string;
  tradesTaken: number;
  signalsMissed: number;
  pnlSumPct: number;
  winRatePct: number;
};

export type LiveResolvedSignal = {
  symbol: string;
  barTimestamp: string;
  entryPrice: number;
  exitPrice: number;
  exitReason: string;
  pnlPct: number;
  durationBars?: number;
  leverage?: number;
  win: boolean;
};

export type LiveRun = {
  /** Nº de señales resueltas (con resultado real). */
  resolved: number;
  /** Nº de señales aún abiertas (no maduraron). */
  open: number;
  winRatePct: number;
  profitFactor: number;
  avgPnlPct: number;
  totalPnlPct: number;
  byExitReason?: Record<string, number>;
  bySymbol?: Record<string, { trades: number; wins: number; pnlPct: number; winRatePct: number }>;
  /** Comparativa vivo-vs-backtest (null si falta el backtest de referencia). */
  liveVsBacktest?: {
    backtestWinRatePct: number;
    liveWinRatePct: number;
    backtestProfitFactor: number;
    liveProfitFactor: number;
  } | null;
  /** Señales resueltas individuales (de live_results.jsonl), más recientes primero. */
  results: LiveResolvedSignal[];
};

export type PortfolioRun = {
  runId: string;
  generatedAt: string;
  source: DataSource;
  status: 'available' | 'not_available';
  summary?: string;
  config?: {
    initialCapital: number;
    positionPct: number;
    maxPositions: number;
    symbols: string[];
  };
  metrics?: {
    totalReturnPct: number;
    sharpe: number;
    maxDrawdownPct: number;
    winRatePct: number;
    profitFactor: number;
    totalTrades: number;
    finalCapital: number;
    nLiquidations: number;
    missedSignals: number;
  };
  comparison?: {
    sumIsolatedReturnPct: number;
    portfolioReturnPct: number;
  };
  perSymbol: PortfolioSymbolContribution[];
  equityCurve: BacktestEquityPoint[];
};

// Confirmed raw fields from Predictor/buy_the_dip/backtest.py run_backtest() output.
export type PythonBacktestTradeRaw = {
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  pnl_pct: number;
  pnl_after_fees: number;
  exit_reason: 'take_profit' | 'stop_loss' | 'fail_fast' | 'timeout' | 'end_of_data';
  duration_bars: number;
  dip_size: number;
};

// Confirmed raw fields from Predictor/buy_the_dip/backtest.py compute_metrics() output.
export type PythonBacktestMetricsRaw = {
  total_return: number;
  sharpe: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  expectancy: number;
  final_capital: number;
  avg_win?: number;
  avg_loss?: number;
};

// Confirmed raw shape from run_backtest() return dict.
export type PythonBacktestResultRaw = {
  trades: PythonBacktestTradeRaw[];
  equity_curve: number[];
  equity_timestamps: Array<string | number>;
  metrics: PythonBacktestMetricsRaw;
};

// Confirmed per-window fields from walk_forward.walk_forward_validation().
export type PythonWalkForwardSegmentRaw = {
  window: number;
  test_start: string;
  test_end: string;
  total_return: number;
  sharpe: number;
  max_dd: number;
  win_rate: number;
  profit_factor: number;
  num_trades: number;
  expectancy: number;
};

// Confirmed from main.py _evaluate_buy_filters() tuple shape.
export type PythonSignalConditionRaw = [name: string, passed: boolean, detail: string];

// Confirmed from main.py _build_signal_payload() LONG-only JSON payload.
export type PythonSignalPayloadRaw = {
  symbol: string;
  signal: 'LONG';
  prob: number;
  extra: string;
};
