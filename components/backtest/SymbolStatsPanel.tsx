'use client';

import { useMemo } from 'react';
import type {
  BacktestTradeSample,
  StrategyConfigSummary,
  SymbolBacktestResult,
} from '@/lib/backtest/types';

type SymbolStatsPanelProps = {
  symbolResult: SymbolBacktestResult;
  config: StrategyConfigSummary;
  selectedTrade: BacktestTradeSample | null;
};

function pctClass(value: number, goodMin: number, midMin: number): string {
  if (value >= goodMin) return 'text-emerald-300';
  if (value >= midMin) return 'text-amber-300';
  return 'text-rose-300';
}

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `M 0 ${height / 2} L ${width} ${height / 2}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function SymbolStatsPanel({ symbolResult, config, selectedTrade }: SymbolStatsPanelProps) {
  const override = config.symbolOverrides[symbolResult.symbol];

  const activeConfig = {
    dipThresholdPct: override?.dipThresholdPct ?? config.dipThresholdPct,
    useRsiFilter: override?.useRsiFilter ?? config.useRsiFilter,
    useVolumeFilter: override?.useVolumeFilter ?? config.useVolumeFilter,
    holdTimeoutHours: override?.holdTimeoutHours ?? config.holdTimeoutHours,
    maxPositions: override?.maxPositions ?? config.maxPositions,
    takeProfitPct: override?.takeProfitPct ?? config.takeProfitPct,
    stopLossPct: override?.stopLossPct ?? config.stopLossPct,
    minVolumeMult: override?.minVolumeMult ?? config.minVolumeMult,
    rsiMin: override?.rsiMin ?? config.rsiMin,
    rsiMax: override?.rsiMax ?? config.rsiMax,
  };

  const sparkline = useMemo(() => {
    const values = symbolResult.equityCurve.map((point) => point.equity);
    return {
      path: buildSparklinePath(values, 260, 64),
      first: values[0] ?? null,
      last: values[values.length - 1] ?? null,
    };
  }, [symbolResult.equityCurve]);

  return (
    <aside className="space-y-3">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <h3 className="text-sm font-semibold text-slate-100">Stats · {symbolResult.symbol}</h3>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Return</p>
            <p className={`mt-1 font-semibold ${pctClass(symbolResult.metrics.totalReturnPct, 10, 0)}`}>
              {formatPct(symbolResult.metrics.totalReturnPct)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Sharpe</p>
            <p className={`mt-1 font-semibold ${pctClass(symbolResult.metrics.sharpe, 1, 0.5)}`}>
              {symbolResult.metrics.sharpe.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Win Rate</p>
            <p className={`mt-1 font-semibold ${pctClass(symbolResult.metrics.winRatePct, 65, 50)}`}>
              {symbolResult.metrics.winRatePct.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Profit Factor</p>
            <p className={`mt-1 font-semibold ${pctClass(symbolResult.metrics.profitFactor, 1.5, 1.1)}`}>
              {symbolResult.metrics.profitFactor.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-300">
          <p>Trades: {symbolResult.metrics.totalTrades}</p>
          <p className="mt-1">Final capital: ${symbolResult.metrics.finalCapital.toFixed(2)}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        <h3 className="text-sm font-semibold text-slate-100">Config activa</h3>
        <p className="mt-2">Timeframe: {config.timeframe}</p>
        <p className="mt-1">TH dip: {activeConfig.dipThresholdPct}%</p>
        <p className="mt-1">TP/SL: {activeConfig.takeProfitPct}% / {activeConfig.stopLossPct}%</p>
        <p className="mt-1">Hold timeout: {activeConfig.holdTimeoutHours}h</p>
        <p className="mt-1">Max positions: {activeConfig.maxPositions}</p>
        <p className="mt-1">RSI filter: {activeConfig.useRsiFilter ? 'on' : 'off'}</p>
        <p className="mt-1">RSI range: [{activeConfig.rsiMin.toFixed(0)}, {activeConfig.rsiMax.toFixed(0)}]</p>
        <p className="mt-1">Volume filter: {activeConfig.useVolumeFilter ? 'on' : 'off'}</p>
        <p className="mt-1">Min rel volume: {activeConfig.minVolumeMult.toFixed(2)}</p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        <h3 className="text-sm font-semibold text-slate-100">Detalle de trade</h3>
        {selectedTrade ? (
          <div className="mt-2 space-y-1">
            <p>Entry time: {selectedTrade.entryTime}</p>
            <p>Exit time: {selectedTrade.exitTime}</p>
            <p>Entry price: {selectedTrade.entryPrice.toFixed(6)}</p>
            <p>Exit price: {selectedTrade.exitPrice.toFixed(6)}</p>
            <p className={selectedTrade.pnlPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              PnL: {formatPct(selectedTrade.pnlPct)}
            </p>
            <p>Exit reason: {selectedTrade.exitReason}</p>
            <p>Holding bars: {selectedTrade.holdingBars}</p>

            {selectedTrade.entrySignal ? (
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                <p className="font-semibold text-slate-100">Motivo de Entrada</p>
                <p className="mt-1 text-slate-300">{selectedTrade.entrySignal.summaryText}</p>
                <p className="mt-1 text-slate-400">
                  24h return: {selectedTrade.entrySignal.pastReturnPct.toFixed(2)}% ·
                  threshold: {selectedTrade.entrySignal.dipThresholdPct.toFixed(2)}%
                </p>
                <p className="mt-1 text-slate-400">
                  RSI14: {selectedTrade.entrySignal.rsi14?.toFixed(2) ?? '-'} ·
                  RelVol: {selectedTrade.entrySignal.relativeVolume?.toFixed(2) ?? '-'}
                </p>

                {selectedTrade.entrySignal.blockedBy ? (
                  <p className="mt-1 text-rose-300">Blocked by: {selectedTrade.entrySignal.blockedBy}</p>
                ) : null}

                <div className="mt-2 space-y-1">
                  {selectedTrade.entrySignal.conditions.map((condition) => (
                    <div key={`${condition.name}-${condition.detail}`} className="text-[11px] text-slate-300">
                      <span className={condition.passed ? 'text-emerald-300' : 'text-rose-300'}>
                        {condition.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="ml-2 font-medium text-slate-200">{condition.name}:</span>
                      <span className="ml-1 text-slate-400">{condition.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-slate-400">
            Selecciona un marker de entrada/salida para ver el detalle del trade.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        <h3 className="text-sm font-semibold text-slate-100">Mini Equity Curve</h3>
        {symbolResult.equityCurve.length ? (
          <>
            <div className="mt-2 rounded border border-slate-800 bg-slate-950/70 p-2">
              <svg viewBox="0 0 260 64" className="h-16 w-full">
                <path d={sparkline.path} fill="none" stroke="#38bdf8" strokeWidth={2} />
              </svg>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Start: {sparkline.first?.toFixed(2) ?? '-'}</span>
              <span>End: {sparkline.last?.toFixed(2) ?? '-'}</span>
            </div>
          </>
        ) : (
          <p className="mt-2 text-slate-400">No hay curva de equity disponible.</p>
        )}
      </section>
    </aside>
  );
}
