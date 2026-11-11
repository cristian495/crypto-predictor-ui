import type {
  BacktestTradeSample,
  PythonBacktestMetricsRaw,
  PythonBacktestResultRaw,
  PythonSignalConditionRaw,
  PythonBacktestTradeRaw,
  PythonWalkForwardSegmentRaw,
  SignalConditionCheck,
  WalkForwardSegment,
} from './types';

function toIsoTimestamp(value: string | number): string {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 9_999_999_999 ? value : value * 1000;
    return new Date(ms).toISOString();
  }

  return new Date().toISOString();
}

export function adaptPythonTrade(raw: PythonBacktestTradeRaw, id: string): BacktestTradeSample {
  return {
    id,
    entryTime: toIsoTimestamp(raw.entry_time),
    exitTime: toIsoTimestamp(raw.exit_time),
    entryPrice: raw.entry_price,
    exitPrice: raw.exit_price,
    pnlPct: raw.pnl_pct * 100,
    pnlAfterFeesPct: raw.pnl_after_fees * 100,
    exitReason: raw.exit_reason,
    holdingBars: raw.duration_bars,
  };
}

export function adaptPythonMetrics(raw: PythonBacktestMetricsRaw) {
  return {
    totalReturnPct: raw.total_return * 100,
    sharpe: raw.sharpe,
    maxDrawdownPct: raw.max_drawdown * 100,
    winRatePct: raw.win_rate * 100,
    profitFactor: raw.profit_factor,
    totalTrades: raw.total_trades,
    expectancyPct: raw.expectancy * 100,
    finalCapital: raw.final_capital,
  };
}

export function adaptPythonEquity(raw: PythonBacktestResultRaw) {
  return raw.equity_curve.map((equity, index) => ({
    timestamp: toIsoTimestamp(raw.equity_timestamps[index] ?? raw.equity_timestamps[raw.equity_timestamps.length - 1]),
    equity,
  }));
}

export function adaptPythonWalkForwardSegment(raw: PythonWalkForwardSegmentRaw): WalkForwardSegment {
  return {
    segmentId: `window-${raw.window}`,
    trainStart: '', // not present in walk_forward_validation() result rows
    trainEnd: '', // not present in walk_forward_validation() result rows
    testStart: toIsoTimestamp(raw.test_start),
    testEnd: toIsoTimestamp(raw.test_end),
    totalReturnPct: raw.total_return,
    sharpe: raw.sharpe,
    winRatePct: raw.win_rate,
    profitFactor: raw.profit_factor,
    maxDrawdownPct: raw.max_dd,
    trades: raw.num_trades,
  };
}

export function adaptPythonSignalCondition(raw: PythonSignalConditionRaw): SignalConditionCheck {
  return {
    name: raw[0],
    passed: raw[1],
    detail: raw[2],
  };
}
