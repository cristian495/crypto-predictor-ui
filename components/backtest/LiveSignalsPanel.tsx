'use client';

import type { LiveRun } from '@/lib/backtest/types';

type LiveSignalsPanelProps = {
  live?: LiveRun;
};

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function pnlTone(value: number): string {
  return value >= 0 ? 'text-emerald-300' : 'text-rose-300';
}

const EXIT_LABELS: Record<string, string> = {
  take_profit: 'Take Profit',
  stop_loss: 'Stop Loss',
  timeout: 'Timeout',
  liquidation: 'Liquidación',
  end_of_data: 'Fin de datos',
  fail_fast: 'Fail-fast',
};

/**
 * Panel de VALIDACIÓN EN VIVO (paper trading). Compara el win rate / profit factor
 * de las señales reales emitidas por el worker contra lo que predijo el backtest.
 * Es la herramienta para decidir si el edge se sostiene antes de arriesgar más capital.
 *
 * Maneja el estado vacío: al principio no hay señales resueltas (el worker lleva poco).
 */
export function LiveSignalsPanel({ live }: LiveSignalsPanelProps) {
  // Estado inicial: aún sin datos (el worker no ha generado el summary o no hay señales).
  if (!live || (live.resolved === 0 && live.open === 0)) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-sky-800/50 bg-sky-500/5 p-4 text-sm text-slate-300">
          <p className="font-semibold text-sky-200">Acumulando señales en vivo…</p>
          <p className="mt-1">
            El worker escanea cada hora y registra las señales (paper trading, sin órdenes
            reales). Todavía no hay señales resueltas que mostrar.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Deja correr el sistema <strong>varias semanas</strong> hasta juntar 30-50 señales
            resueltas. Solo entonces la comparación vivo-vs-backtest significa algo
            estadísticamente. Con pocas señales, los resultados son ruido.
          </p>
        </div>
      </div>
    );
  }

  const lvb = live.liveVsBacktest;
  // ¿El edge en vivo se parece al backtest? Semáforo simple sobre el win rate.
  const divergence =
    lvb ? lvb.liveWinRatePct - lvb.backtestWinRatePct : null;

  return (
    <div className="space-y-4">
      {/* Comparativa vivo vs backtest — la pregunta clave */}
      {lvb ? (
        <div className="rounded-xl border border-sky-800/50 bg-sky-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            ¿El edge se sostiene en vivo?
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] text-slate-400">Win Rate</p>
              <p className="mt-1 text-sm">
                <span className={`text-lg font-bold ${pnlTone(lvb.liveWinRatePct - 50)}`}>
                  {lvb.liveWinRatePct.toFixed(1)}%
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  en vivo · backtest {lvb.backtestWinRatePct.toFixed(1)}%
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] text-slate-400">Profit Factor</p>
              <p className="mt-1 text-sm">
                <span className={`text-lg font-bold ${pnlTone(lvb.liveProfitFactor - 1)}`}>
                  {lvb.liveProfitFactor.toFixed(2)}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  en vivo · backtest {lvb.backtestProfitFactor.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
          {divergence !== null ? (
            <p className="mt-3 text-xs text-slate-300">
              {live.resolved < 30 ? (
                <span className="text-amber-200">
                  ⚠️ Solo {live.resolved} señales resueltas: aún es pronto para concluir. Junta
                  30-50 antes de tomar decisiones de capital.
                </span>
              ) : Math.abs(divergence) <= 10 ? (
                <span className="text-emerald-200">
                  ✓ El win rate en vivo se parece al backtest (±{Math.abs(divergence).toFixed(0)}
                  pts). El edge se está sosteniendo.
                </span>
              ) : (
                <span className="text-rose-200">
                  ⚠️ El win rate en vivo diverge {divergence.toFixed(0)} pts del backtest. Vigila
                  de cerca antes de arriesgar más — el edge podría no sostenerse.
                </span>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Métricas en vivo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Resueltas</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{live.resolved}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Abiertas</p>
          <p className="mt-1 text-sm font-semibold text-amber-300">{live.open}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Win Rate</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{live.winRatePct.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Profit Factor</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{live.profitFactor.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">PnL medio/trade</p>
          <p className={`mt-1 text-sm font-semibold ${pnlTone(live.avgPnlPct)}`}>
            {formatPct(live.avgPnlPct)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">PnL total (suma)</p>
          <p className={`mt-1 text-sm font-semibold ${pnlTone(live.totalPnlPct)}`}>
            {formatPct(live.totalPnlPct)}
          </p>
        </div>
      </div>

      {/* Desglose por motivo de salida */}
      {live.byExitReason && Object.keys(live.byExitReason).length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Salidas
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(live.byExitReason).map(([reason, count]) => (
              <span
                key={reason}
                className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-300"
              >
                {EXIT_LABELS[reason] ?? reason}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Señales resueltas recientes */}
      {live.results.length ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <h3 className="text-sm font-semibold text-slate-100">Señales resueltas (recientes)</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 text-left font-medium">Símbolo</th>
                  <th className="py-1.5 text-left font-medium">Vela de entrada</th>
                  <th className="py-1.5 text-right font-medium">Entrada</th>
                  <th className="py-1.5 text-right font-medium">Salida</th>
                  <th className="py-1.5 text-left font-medium">Motivo</th>
                  <th className="py-1.5 text-right font-medium">PnL</th>
                </tr>
              </thead>
              <tbody>
                {live.results.slice(0, 50).map((r, i) => (
                  <tr key={`${r.symbol}-${r.barTimestamp}-${i}`} className="border-b border-slate-800/60">
                    <td className="py-1.5 font-medium text-slate-100">{r.symbol}</td>
                    <td className="py-1.5 text-slate-400">{r.barTimestamp.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-1.5 text-right text-slate-300">{r.entryPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}</td>
                    <td className="py-1.5 text-right text-slate-300">{r.exitPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}</td>
                    <td className="py-1.5 text-slate-400">{EXIT_LABELS[r.exitReason] ?? r.exitReason}</td>
                    <td className={`py-1.5 text-right font-semibold ${pnlTone(r.pnlPct)}`}>
                      {formatPct(r.pnlPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-slate-500">
        Paper trading: estas señales NO ejecutaron órdenes reales. El PnL es el que habrías
        obtenido con los costes de futuros modelados (slippage, funding, leverage).
      </p>
    </div>
  );
}
