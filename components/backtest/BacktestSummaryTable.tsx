'use client';

import { useMemo } from 'react';
import type { StrategyRun, WalkForwardRun, WalkForwardSymbolResult } from '@/lib/backtest/types';

type BacktestSummaryTableProps = {
  strategyRunData: StrategyRun;
  walkForwardData?: WalkForwardRun;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
};

type RowData = {
  symbol: string;
  returnPct: number;
  sharpe: number;
  winRatePct: number;
  profitFactor: number;
  trades: number;
  configSummary: string;
  signalStatus: 'SIGNAL' | 'NO SIGNAL';
  blockedBy: string | null;
  stabilityScore: number | null;
  qualityLabel: string | null;
};

function qualityFromStability(score?: number): string | null {
  if (score === undefined) return null;
  if (score >= 70) return 'EXCELLENT';
  if (score >= 55) return 'GOOD';
  if (score >= 40) return 'MODERATE';
  return 'POOR';
}

function metricTone(value: number, goodMin: number, midMin: number): 'good' | 'mid' | 'bad' {
  if (value >= goodMin) return 'good';
  if (value >= midMin) return 'mid';
  return 'bad';
}

function toneClass(tone: ReturnType<typeof metricTone>): string {
  if (tone === 'good') return 'text-emerald-300';
  if (tone === 'mid') return 'text-amber-300';
  return 'text-rose-300';
}

function getWalkForwardMap(walkForwardData?: WalkForwardRun): Map<string, WalkForwardSymbolResult> {
  if (!walkForwardData) return new Map();
  return new Map(walkForwardData.symbolResults.map((item) => [item.symbol, item]));
}

export function BacktestSummaryTable({
  strategyRunData,
  walkForwardData,
  selectedSymbol,
  onSelectSymbol,
}: BacktestSummaryTableProps) {
  const rows = useMemo<RowData[]>(() => {
    const wfBySymbol = getWalkForwardMap(walkForwardData);

    return strategyRunData.symbolResults.map((result) => {
      const override = strategyRunData.config.symbolOverrides[result.symbol];
      const effectiveThreshold = override?.dipThresholdPct ?? strategyRunData.config.dipThresholdPct;
      const effectiveRsi = override?.useRsiFilter ?? strategyRunData.config.useRsiFilter;
      const effectiveVolume = override?.useVolumeFilter ?? strategyRunData.config.useVolumeFilter;
      const effectiveHold = override?.holdTimeoutHours ?? strategyRunData.config.holdTimeoutHours;
      const effectiveMaxPos = override?.maxPositions ?? strategyRunData.config.maxPositions;
      const effectiveTp = override?.takeProfitPct ?? strategyRunData.config.takeProfitPct;
      const effectiveSl = override?.stopLossPct ?? strategyRunData.config.stopLossPct;
      const effectiveMinVol = override?.minVolumeMult ?? strategyRunData.config.minVolumeMult;
      const effectiveRsiMin = override?.rsiMin ?? strategyRunData.config.rsiMin;
      const effectiveRsiMax = override?.rsiMax ?? strategyRunData.config.rsiMax;

      const configSummary = `TH ${effectiveThreshold.toFixed(2)}% · RSI ${effectiveRsi ? 'on' : 'off'} [${effectiveRsiMin.toFixed(0)}, ${effectiveRsiMax.toFixed(0)}] · VOL ${
        effectiveVolume ? `on (>=${effectiveMinVol.toFixed(2)})` : 'off'
      } · TP ${effectiveTp.toFixed(2)}% · SL ${effectiveSl.toFixed(2)}% · HLD ${effectiveHold}h · MAXP ${effectiveMaxPos}`;

      const walk = wfBySymbol.get(result.symbol);
      const stabilityScore =
        walk?.status === 'available' && walk.stabilityScore !== undefined ? walk.stabilityScore : null;

      const blockedBy =
        result.currentSignal.signal === 'NO_SIGNAL' ? (result.currentSignal.blockedBy ?? result.currentSignal.summary) : null;

      return {
        symbol: result.symbol,
        returnPct: result.metrics.totalReturnPct,
        sharpe: result.metrics.sharpe,
        winRatePct: result.metrics.winRatePct,
        profitFactor: result.metrics.profitFactor,
        trades: result.metrics.totalTrades,
        configSummary,
        signalStatus: result.currentSignal.signal === 'LONG' ? 'SIGNAL' : 'NO SIGNAL',
        blockedBy,
        stabilityScore,
        qualityLabel: stabilityScore === null ? null : qualityFromStability(stabilityScore),
      };
    });
  }, [strategyRunData, walkForwardData]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Resumen por Símbolo</h3>
        <p className="text-[11px] text-slate-400">Click en una fila para seleccionar símbolo</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1280px] w-full text-left text-xs">
          <thead className="bg-slate-950/70 text-slate-300">
            <tr>
              <th className="px-3 py-2 font-semibold">Símbolo</th>
              <th className="px-3 py-2 font-semibold">Return</th>
              <th className="px-3 py-2 font-semibold">Sharpe</th>
              <th className="px-3 py-2 font-semibold">WR</th>
              <th className="px-3 py-2 font-semibold">PF</th>
              <th className="px-3 py-2 font-semibold">Trades</th>
              <th className="px-3 py-2 font-semibold">Config usada</th>
              <th className="px-3 py-2 font-semibold">Señal</th>
              <th className="px-3 py-2 font-semibold">Blocked By</th>
              <th className="px-3 py-2 font-semibold">Stability</th>
              <th className="px-3 py-2 font-semibold">Quality</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isSelected = row.symbol === selectedSymbol;
              const returnTone = metricTone(row.returnPct, 10, 0);
              const sharpeTone = metricTone(row.sharpe, 1, 0.5);
              const wrTone = metricTone(row.winRatePct, 65, 50);
              const pfTone = metricTone(row.profitFactor, 1.5, 1.1);
              const stabilityTone =
                row.stabilityScore === null ? null : metricTone(row.stabilityScore, 70, 55);

              return (
                <tr
                  key={row.symbol}
                  onClick={() => onSelectSymbol(row.symbol)}
                  className={`cursor-pointer border-t border-slate-800 transition ${
                    isSelected
                      ? 'bg-sky-500/15 ring-1 ring-inset ring-sky-400/60'
                      : 'bg-slate-950/20 hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-slate-100">{row.symbol}</td>
                  <td className={`px-3 py-2 font-medium ${toneClass(returnTone)}`}>{row.returnPct.toFixed(2)}%</td>
                  <td className={`px-3 py-2 font-medium ${toneClass(sharpeTone)}`}>{row.sharpe.toFixed(2)}</td>
                  <td className={`px-3 py-2 font-medium ${toneClass(wrTone)}`}>{row.winRatePct.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-medium ${toneClass(pfTone)}`}>{row.profitFactor.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-200">{row.trades}</td>
                  <td className="px-3 py-2 text-slate-300">{row.configSummary}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        row.signalStatus === 'SIGNAL'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {row.signalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.blockedBy ?? '-'}</td>
                  <td className={`px-3 py-2 font-medium ${stabilityTone ? toneClass(stabilityTone) : 'text-slate-500'}`}>
                    {row.stabilityScore !== null ? row.stabilityScore.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {row.qualityLabel ? (
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                          row.qualityLabel === 'EXCELLENT'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : row.qualityLabel === 'GOOD'
                              ? 'bg-amber-500/20 text-amber-300'
                              : row.qualityLabel === 'MODERATE'
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {row.qualityLabel}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
