'use client';

import type { DataSource } from '@/lib/backtest/types';

type StrategyHeaderProps = {
  title: string;
  description: string;
  selectedSymbol: string;
  symbolOptions: string[];
  runId: string;
  generatedAt: string;
  source: DataSource;
  onSelectSymbol: (symbol: string) => void;
};

export function StrategyHeader({
  title,
  description,
  selectedSymbol,
  symbolOptions,
  runId,
  generatedAt,
  source,
  onSelectSymbol,
}: StrategyHeaderProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-sky-300">Strategy Workspace</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
        </div>

        <div className="grid min-w-[260px] grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">Símbolo</span>
            <select
              value={selectedSymbol}
              onChange={(event) => onSelectSymbol(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-sky-500 focus:ring"
            >
              {symbolOptions.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
            <p className="text-[11px] text-slate-400">Run ID</p>
            <p className="mt-0.5 font-medium text-slate-200">{runId}</p>
            <p className="mt-1 text-[11px] text-slate-400">Generated: {new Date(generatedAt).toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Source: {source}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
