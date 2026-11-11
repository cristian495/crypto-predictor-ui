'use client';

import type { PortfolioRun } from '@/lib/backtest/types';

type PortfolioPanelProps = {
  portfolio?: PortfolioRun;
};

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function pnlTone(value: number): string {
  return value >= 0 ? 'text-emerald-300' : 'text-rose-300';
}

/**
 * Backtest de CARTERA (capital compartido). La diferencia clave vs la vista por
 * símbolo: aquí hay un solo pozo de capital, las señales compiten y algunas se
 * pierden. El retorno es el real de la cuenta y el drawdown es el real (peor).
 */
export function PortfolioPanel({ portfolio }: PortfolioPanelProps) {
  if (!portfolio || portfolio.status !== 'available' || !portfolio.metrics) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
        Cartera no disponible. Re-exporta con el engine actual para generar
        <code className="mx-1 rounded bg-slate-800 px-1 text-xs">portfolio.latest.json</code>
        (necesita al menos 2 símbolos).
      </div>
    );
  }

  const m = portfolio.metrics;
  const cmp = portfolio.comparison;
  const cfg = portfolio.config;

  // Cuánto inflaba el modelo viejo (suma aislada) respecto a la cartera real.
  const inflation =
    cmp && cmp.portfolioReturnPct !== 0
      ? cmp.sumIsolatedReturnPct / cmp.portfolioReturnPct
      : null;

  return (
    <div className="space-y-4">
      {/* Comparación clave: aislado (viejo, inflado) vs cartera (real) */}
      {cmp ? (
        <div className="rounded-xl border border-sky-800/50 bg-sky-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            La diferencia que importa
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] text-slate-400">Suma por-símbolo (modelo viejo)</p>
              <p className="mt-1 text-lg font-bold text-slate-300">
                {formatPct(cmp.sumIsolatedReturnPct)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">capital dedicado = irreal</p>
            </div>
            <div className="rounded-lg border border-emerald-800/50 bg-emerald-500/5 p-3">
              <p className="text-[11px] text-slate-400">Cartera real (capital compartido)</p>
              <p className={`mt-1 text-lg font-bold ${pnlTone(cmp.portfolioReturnPct)}`}>
                {formatPct(cmp.portfolioReturnPct)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">lo que verías en tu cuenta</p>
            </div>
            <div className="rounded-lg border border-amber-800/50 bg-amber-500/5 p-3">
              <p className="text-[11px] text-slate-400">Max Drawdown real</p>
              <p className="mt-1 text-lg font-bold text-rose-300">
                {m.maxDrawdownPct.toFixed(1)}%
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">la peor caída de la cuenta</p>
            </div>
          </div>
          {inflation && inflation > 1.1 ? (
            <p className="mt-3 text-xs text-amber-200">
              ⚠️ El modelo por-símbolo inflaba el retorno <strong>{inflation.toFixed(1)}×</strong>.
              Con una sola cuenta, las señales compiten por capital y el drawdown real es mucho mayor.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Métricas de cartera */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Retorno</p>
          <p className={`mt-1 text-sm font-semibold ${pnlTone(m.totalReturnPct)}`}>
            {formatPct(m.totalReturnPct)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Sharpe</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{m.sharpe.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Win Rate</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{m.winRatePct.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Profit Factor</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{m.profitFactor.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Trades</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{m.totalTrades}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Señales perdidas</p>
          <p className="mt-1 text-sm font-semibold text-amber-300">{m.missedSignals}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">por falta de capital</p>
        </div>
      </div>

      {cfg ? (
        <p className="text-[11px] text-slate-500">
          Capital inicial ${cfg.initialCapital.toLocaleString('en-US')} · {cfg.positionPct}% por
          posición · máx {cfg.maxPositions} posiciones simultáneas · {cfg.symbols.length} símbolos.
          {m.missedSignals > m.totalTrades ? (
            <span className="ml-1 text-amber-300">
              Hay más señales perdidas que tomadas: considera subir máx posiciones.
            </span>
          ) : null}
        </p>
      ) : null}

      {/* Contribución por símbolo — revela qué símbolo aporta/resta en cartera */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <h3 className="text-sm font-semibold text-slate-100">Contribución por símbolo (en cartera)</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Ojo: el rendimiento aislado NO predice el de cartera. Un símbolo puede ser el mejor
          aislado pero apenas operar en cartera si pierde la competencia por capital.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-1.5 text-left font-medium">Símbolo</th>
                <th className="py-1.5 text-right font-medium">Trades tomados</th>
                <th className="py-1.5 text-right font-medium">Señales perdidas</th>
                <th className="py-1.5 text-right font-medium">PnL (suma %)</th>
                <th className="py-1.5 text-right font-medium">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.perSymbol.map((row) => (
                <tr key={row.symbol} className="border-b border-slate-800/60">
                  <td className="py-1.5 font-medium text-slate-100">{row.symbol}</td>
                  <td className="py-1.5 text-right text-slate-300">{row.tradesTaken}</td>
                  <td className="py-1.5 text-right text-amber-300/80">{row.signalsMissed}</td>
                  <td className={`py-1.5 text-right font-semibold ${pnlTone(row.pnlSumPct)}`}>
                    {formatPct(row.pnlSumPct)}
                  </td>
                  <td className="py-1.5 text-right text-slate-300">{row.winRatePct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
