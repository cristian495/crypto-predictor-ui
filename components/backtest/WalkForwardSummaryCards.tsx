'use client';

import { useMemo } from 'react';
import type { WalkForwardSymbolResult } from '@/lib/backtest/types';

type WalkForwardSummaryCardsProps = {
  symbolResult: WalkForwardSymbolResult;
};

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function qualityLabel(stabilityScore?: number): 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | '-' {
  if (stabilityScore === undefined) return '-';
  if (stabilityScore >= 70) return 'EXCELLENT';
  if (stabilityScore >= 55) return 'GOOD';
  if (stabilityScore >= 40) return 'MODERATE';
  return 'POOR';
}

function qualityClass(label: ReturnType<typeof qualityLabel>): string {
  if (label === 'EXCELLENT') return 'text-emerald-300';
  if (label === 'GOOD') return 'text-sky-300';
  if (label === 'MODERATE') return 'text-amber-300';
  if (label === 'POOR') return 'text-rose-300';
  return 'text-slate-400';
}

export function WalkForwardSummaryCards({ symbolResult }: WalkForwardSummaryCardsProps) {
  const computed = useMemo(() => {
    const segments = symbolResult.segments ?? [];
    return {
      windowsTested: segments.length,
      avgReturnPct: avg(segments.map((segment) => segment.totalReturnPct)),
      avgSharpe: avg(segments.map((segment) => segment.sharpe)),
      stabilityScore: symbolResult.stabilityScore,
      quality: qualityLabel(symbolResult.stabilityScore),
      positiveWindowsPct: symbolResult.positiveWindowsPct,
    };
  }, [symbolResult]);

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p className="text-slate-400">Stability Score</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">
          {computed.stabilityScore !== undefined ? `${computed.stabilityScore.toFixed(1)} / 100` : '-'}
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p className="text-slate-400">Quality Label</p>
        <p className={`mt-1 text-sm font-semibold ${qualityClass(computed.quality)}`}>{computed.quality}</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p className="text-slate-400">Positive Windows</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">
          {computed.positiveWindowsPct !== undefined ? `${computed.positiveWindowsPct.toFixed(1)}%` : '-'}
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p className="text-slate-400">Windows Tested</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{computed.windowsTested}</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p className="text-slate-400">Avg Return</p>
        <p className={`mt-1 text-sm font-semibold ${computed.avgReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {computed.avgReturnPct >= 0 ? '+' : ''}
          {computed.avgReturnPct.toFixed(2)}%
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p className="text-slate-400">Avg Sharpe</p>
        <p className={`mt-1 text-sm font-semibold ${computed.avgSharpe >= 0 ? 'text-sky-300' : 'text-rose-300'}`}>
          {computed.avgSharpe.toFixed(2)}
        </p>
      </div>
    </section>
  );
}
