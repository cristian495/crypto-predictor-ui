'use client';

import type { CurrentSignalSnapshot } from '@/lib/backtest/types';

type CurrentSignalPanelProps = {
  symbol: string;
  signal: CurrentSignalSnapshot;
  timeframe: string;
  lookbackHours: number;
};

function formatPrice(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return '-';
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function CurrentSignalPanel({
  symbol,
  signal,
  timeframe,
  lookbackHours,
}: CurrentSignalPanelProps) {
  const isLong = signal.signal === 'LONG';
  const signalLabel = isLong ? 'LONG' : 'NONE';
  const statusLabel = isLong ? 'SIGNAL' : 'BLOCKED';
  const summaryText = signal.summaryText ?? signal.summary;

  return (
    <aside className="space-y-3">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <h3 className="text-sm font-semibold text-slate-100">Signal Status · {symbol}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-1 text-[11px] font-semibold ${
              isLong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {statusLabel}
          </span>

          <span className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200">
            {signalLabel}
          </span>

          <span className="text-[11px] text-slate-400">{new Date(signal.timestamp).toLocaleString()}</span>
        </div>

        <p className="mt-2 text-xs text-slate-300">{summaryText}</p>

        {!isLong ? (
          <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/8 p-2 text-xs text-rose-200">
            <p className="font-medium">Bloqueada por:</p>
            <p className="mt-1">{signal.blockedBy ?? 'No se reportó razón de bloqueo.'}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
        <h3 className="text-sm font-semibold text-slate-100">Niveles Operativos</h3>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Entry</p>
            <p className="mt-1 font-semibold text-slate-100">{formatPrice(signal.entryPrice)}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Take Profit</p>
            <p className="mt-1 font-semibold text-emerald-300">{formatPrice(signal.takeProfit)}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p className="text-slate-400">Stop Loss</p>
            <p className="mt-1 font-semibold text-rose-300">{formatPrice(signal.stopLoss)}</p>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
          <p>Close: {formatPrice(signal.close)}</p>
          <p className="mt-1">{lookbackHours}h return: {formatPct(signal.pastReturnPct)}</p>
          <p className="mt-1">Dip threshold: {formatPct(signal.dipThresholdPct)}</p>
          <p className="mt-1">RSI14: {signal.rsi14?.toFixed(2) ?? '-'}</p>
          <p className="mt-1">Relative volume: {signal.relativeVolume?.toFixed(2) ?? '-'}</p>
          <p className="mt-1">Timeframe: {timeframe}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <h3 className="text-sm font-semibold text-slate-100">Condiciones Evaluadas</h3>

        {signal.conditions?.length ? (
          <div className="mt-2 space-y-2">
            {signal.conditions.map((condition) => (
              <div
                key={`${condition.name}-${condition.detail}`}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-200">{condition.name}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      condition.passed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {condition.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="mt-1 text-slate-400">{condition.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No hay condiciones estructuradas para este símbolo.</p>
        )}
      </section>
    </aside>
  );
}
