'use client';

import { useMemo } from 'react';
import type { StrategyRun, WalkForwardRun } from '@/lib/backtest/types';

type BacktestStatsCardsProps = {
  strategyRunData: StrategyRun;
  walkForwardData?: WalkForwardRun;
};

type HighlightItem = {
  label: string;
  symbol: string;
  value: string;
  tone: 'good' | 'mid' | 'bad' | 'neutral';
};

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function valueTone(value: number, goodMin: number, midMin: number): 'good' | 'mid' | 'bad' {
  if (value >= goodMin) return 'good';
  if (value >= midMin) return 'mid';
  return 'bad';
}

function toneTextClass(tone: HighlightItem['tone']): string {
  if (tone === 'good') return 'text-emerald-300';
  if (tone === 'mid') return 'text-amber-300';
  if (tone === 'bad') return 'text-rose-300';
  return 'text-slate-200';
}

function qualityFromStability(score?: number): string {
  if (score === undefined) return '-';
  if (score >= 70) return 'EXCELLENT';
  if (score >= 55) return 'GOOD';
  if (score >= 40) return 'MODERATE';
  return 'POOR';
}

export function BacktestStatsCards({ strategyRunData, walkForwardData }: BacktestStatsCardsProps) {
  const computed = useMemo(() => {
    const results = strategyRunData.symbolResults;

    const avgReturn = avg(results.map((item) => item.metrics.totalReturnPct));
    const avgSharpe = avg(results.map((item) => item.metrics.sharpe));
    const avgWinRate = avg(results.map((item) => item.metrics.winRatePct));

    const activeSignals = results.filter((item) => item.currentSignal.signal === 'LONG').length;
    const noSignals = results.length - activeSignals;

    const wfAvailable =
      walkForwardData?.symbolResults.filter((item) => item.status === 'available').length ?? 0;

    const topReturn = [...results].sort(
      (a, b) => b.metrics.totalReturnPct - a.metrics.totalReturnPct,
    )[0];
    const topSharpe = [...results].sort((a, b) => b.metrics.sharpe - a.metrics.sharpe)[0];
    const topProfitFactor = [...results].sort(
      (a, b) => b.metrics.profitFactor - a.metrics.profitFactor,
    )[0];
    const worstReturn = [...results].sort(
      (a, b) => a.metrics.totalReturnPct - b.metrics.totalReturnPct,
    )[0];

    const bestStability =
      walkForwardData?.symbolResults
        .filter((item) => item.status === 'available' && item.stabilityScore !== undefined)
        .sort((a, b) => (b.stabilityScore ?? -1) - (a.stabilityScore ?? -1))[0] ?? null;

    const highlights: HighlightItem[] = [
      {
        label: 'Top Return',
        symbol: topReturn?.symbol ?? '-',
        value: topReturn ? formatPct(topReturn.metrics.totalReturnPct) : '-',
        tone: topReturn
          ? valueTone(topReturn.metrics.totalReturnPct, 10, 0)
          : 'neutral',
      },
      {
        label: 'Top Sharpe',
        symbol: topSharpe?.symbol ?? '-',
        value: topSharpe ? topSharpe.metrics.sharpe.toFixed(2) : '-',
        tone: topSharpe ? valueTone(topSharpe.metrics.sharpe, 1, 0.5) : 'neutral',
      },
      {
        label: 'Top Profit Factor',
        symbol: topProfitFactor?.symbol ?? '-',
        value: topProfitFactor ? topProfitFactor.metrics.profitFactor.toFixed(2) : '-',
        tone: topProfitFactor
          ? valueTone(topProfitFactor.metrics.profitFactor, 1.5, 1.1)
          : 'neutral',
      },
      {
        label: 'Worst Return',
        symbol: worstReturn?.symbol ?? '-',
        value: worstReturn ? formatPct(worstReturn.metrics.totalReturnPct) : '-',
        tone: worstReturn
          ? valueTone(worstReturn.metrics.totalReturnPct, 10, 0)
          : 'neutral',
      },
      {
        label: 'Top Stability',
        symbol: bestStability?.symbol ?? '-',
        value: bestStability?.stabilityScore !== undefined
          ? `${bestStability.stabilityScore.toFixed(1)} (${qualityFromStability(bestStability.stabilityScore)})`
          : '-',
        tone:
          bestStability?.stabilityScore !== undefined
            ? valueTone(bestStability.stabilityScore, 70, 55)
            : 'neutral',
      },
    ];

    return {
      avgReturn,
      avgSharpe,
      avgWinRate,
      activeSignals,
      noSignals,
      wfAvailable,
      highlights,
      symbolsCount: results.length,
    };
  }, [strategyRunData, walkForwardData]);

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Promedio Return</p>
          <p className={`mt-1 text-sm font-semibold ${toneTextClass(valueTone(computed.avgReturn, 10, 0))}`}>
            {formatPct(computed.avgReturn)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Promedio Sharpe</p>
          <p className={`mt-1 text-sm font-semibold ${toneTextClass(valueTone(computed.avgSharpe, 1, 0.5))}`}>
            {computed.avgSharpe.toFixed(2)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Promedio WR</p>
          <p className={`mt-1 text-sm font-semibold ${toneTextClass(valueTone(computed.avgWinRate, 65, 50))}`}>
            {computed.avgWinRate.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Símbolos con señal</p>
          <p className="mt-1 text-sm font-semibold text-emerald-300">
            {computed.activeSignals}
            <span className="ml-1 text-xs text-slate-400">/ {computed.symbolsCount}</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Sin señal</p>
          <p className="mt-1 text-sm font-semibold text-amber-300">
            {computed.noSignals}
            <span className="ml-1 text-xs text-slate-400">/ {computed.symbolsCount}</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Con walkforward</p>
          <p className="mt-1 text-sm font-semibold text-sky-300">
            {computed.wfAvailable}
            <span className="ml-1 text-xs text-slate-400">/ {computed.symbolsCount}</span>
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Destacados</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {computed.highlights.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <p className="text-[11px] text-slate-400">{item.label}</p>
              <p className={`mt-1 text-sm font-semibold ${toneTextClass(item.tone)}`}>{item.value}</p>
              <p className="mt-1 text-[11px] text-slate-500">{item.symbol}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
