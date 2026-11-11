'use client';

import type { FuturesReality, SymbolBacktestResult } from '@/lib/backtest/types';

type FuturesRealityPanelProps = {
  symbol: string;
  futuresReality?: SymbolBacktestResult['futuresReality'];
};

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatPrice(value: number): string {
  // Precios cripto: hasta 6 decimales pero recortando ceros inútiles.
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/**
 * Muestra la "realidad de futuros" de un símbolo: el retorno NETO tras costes
 * reales (slippage, fees, funding), el desglose de a dónde se fue el dinero,
 * el apalancamiento y la alerta crítica de liquidación vs. stop loss.
 *
 * Si el JSON es v1 (sin futuresReality) el panel muestra un aviso para re-exportar.
 */
export function FuturesRealityPanel({ symbol, futuresReality }: FuturesRealityPanelProps) {
  if (!futuresReality) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Realidad de Futuros</h3>
        <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-400">
          Este símbolo no incluye datos de futuros (JSON v1). Re-exporta con la versión
          actual del engine para ver retorno neto, funding, slippage y liquidación.
        </p>
      </section>
    );
  }

  const fr: FuturesReality = futuresReality;
  const netTone = fr.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300';

  // Cuánto se comieron los costes respecto al bruto (en la suma simple por trade).
  const costDrag = fr.grossReturnSumPct - fr.netReturnSumPct;

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Realidad de Futuros — {symbol}</h3>
        <span className="rounded-md border border-sky-700/60 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-300">
          Apalancamiento x{fr.leverage}
        </span>
      </div>

      {/* Alerta crítica: SL por debajo de liquidación */}
      {fr.slBelowLiquidation ? (
        <div className="rounded-lg border border-rose-600/60 bg-rose-500/10 p-3 text-xs text-rose-100">
          <p className="font-semibold">⚠️ Tu stop loss está por debajo del precio de liquidación.</p>
          <p className="mt-1">
            Con x{fr.leverage}, el exchange te liquida ANTES de que tu SL actúe. Baja el
            apalancamiento o acerca el stop loss. SL=${formatPrice(fr.stopLossPrice)} vs.
            Liquidación=${formatPrice(fr.liquidationPrice)}.
          </p>
        </div>
      ) : fr.liquidationPrice > 0 ? (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-500/5 p-2.5 text-xs text-emerald-200">
          ✓ Tu stop loss (${formatPrice(fr.stopLossPrice)}) actúa antes que la liquidación
          (${formatPrice(fr.liquidationPrice)}). Con x{fr.leverage} estás protegido.
        </div>
      ) : null}

      {/* Retorno neto — el número que de verdad importa */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Retorno NETO (real)</p>
          <p className={`mt-1 text-lg font-bold ${netTone}`}>{formatPct(fr.netReturnPct)}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">compuesto, tras TODOS los costes</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Funding pagado</p>
          <p className={`mt-1 text-sm font-semibold ${fr.fundingPaidPct > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {formatPct(fr.fundingPaidPct)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {fr.fundingPaidPct > 0 ? 'lo pagaste tú' : 'a tu favor o neutro'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Slippage + fees</p>
          <p className="mt-1 text-sm font-semibold text-amber-300">{formatPct(fr.slippageFeesPct)}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">coste dominante del edge</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Liquidaciones</p>
          <p className={`mt-1 text-sm font-semibold ${fr.nLiquidations > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
            {fr.nLiquidations}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">en todo el backtest</p>
        </div>
      </div>

      {/* Desglose bruto -> neto (suma simple por trade) */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          A dónde se fue el dinero (suma de % por trade)
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">PnL bruto de precio</span>
          <span className="font-semibold text-slate-100">{formatPct(fr.grossReturnSumPct)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-rose-300">− Costes (slippage, fees, funding)</span>
          <span className="font-semibold text-rose-300">−{costDrag.toFixed(2)}%</span>
        </div>
        <div className="mt-1 border-t border-slate-800 pt-1 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">= PnL neto por trade</span>
          <span className={`font-semibold ${fr.netReturnSumPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatPct(fr.netReturnSumPct)}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Nota: esta es la suma simple por trade (desglose de costes), no el retorno
          compuesto. El retorno real es el NETO de arriba.
        </p>
      </div>
    </section>
  );
}
