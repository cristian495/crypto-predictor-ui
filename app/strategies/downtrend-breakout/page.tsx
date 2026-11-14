'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadDowntrendData,
  type DowntrendRun,
  type DowntrendHistoricalSignal,
} from '@/lib/downtrend/dataLoader';
import { DowntrendCriteriaChart } from '@/components/downtrend/DowntrendCriteriaChart';

export default function DowntrendBreakoutPage() {
  const [run, setRun] = useState<DowntrendRun | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedSignalTs, setSelectedSignalTs] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const payload = await loadDowntrendData();
      if (cancelled) return;
      setRun(payload.data);
      setMessage(payload.message ?? null);
      if (payload.data?.symbolResults.length) {
        setSelectedSymbol(payload.data.symbolResults[0].symbol);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const symbols = useMemo(() => run?.symbolResults.map((r) => r.symbol) ?? [], [run]);
  const selected = useMemo(
    () => run?.symbolResults.find((r) => r.symbol === selectedSymbol),
    [run, selectedSymbol],
  );

  const shortSignals = useMemo(
    () => (selected?.historicalSignals ?? []).filter((s) => s.signal === 'SHORT'),
    [selected],
  );

  const selectedSignal: DowntrendHistoricalSignal | undefined = useMemo(() => {
    if (!shortSignals.length) return undefined;
    if (selectedSignalTs) {
      return shortSignals.find((s) => s.timestamp === selectedSignalTs) ?? shortSignals[shortSignals.length - 1];
    }
    return shortSignals[shortSignals.length - 1]; // más reciente por defecto
  }, [shortSignals, selectedSignalTs]);

  return (
    <main className="mx-auto w-full max-w-[1300px] space-y-4 p-4 md:p-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Downtrend Breakout (SHORT)</h1>
          <p className="text-xs text-slate-400">
            Estrategia complementaria que opera en tendencia bajista. Visualiza cada señal SHORT
            y por qué entró (criterios: régimen, ruptura Donchian, ADX, volumen…).
          </p>
        </div>
        <Link
          to="/strategies/buy-the-dip"
          className="rounded-lg border border-sky-400/70 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-200 hover:border-sky-300"
        >
          Ir a Buy-the-Dip
        </Link>
      </section>

      {/* Estado de carga / datos */}
      <section
        className={`rounded-lg border px-3 py-2 text-xs ${
          message ? 'border-amber-500/50 bg-amber-500/10 text-amber-100' : 'border-slate-800 bg-slate-900/70 text-slate-300'
        }`}
      >
        {loading ? (
          <p>Cargando datos de downtrend…</p>
        ) : message ? (
          <p>{message}</p>
        ) : run ? (
          <p>
            Datos cargados · run {run.runId} · {new Date(run.generatedAt).toLocaleString()}
          </p>
        ) : null}
      </section>

      {selected ? (
        <>
          {/* Selector de símbolo */}
          <section className="flex flex-wrap items-center gap-2">
            {symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setSelectedSymbol(sym);
                  setSelectedSignalTs(null);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  sym === selectedSymbol
                    ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                    : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500'
                }`}
              >
                {sym}
              </button>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Chart de velas + marcadores SHORT */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-100">
                {selected.symbol} — {shortSignals.length} señales SHORT en el histórico
              </h2>
              <DowntrendCriteriaChart
                candles={selected.candles}
                signals={shortSignals}
                selectedTs={selectedSignal?.timestamp ?? null}
                onSelectSignal={setSelectedSignalTs}
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Los marcadores ▼ marcan dónde entró un SHORT. Haz clic en uno (o en la lista) para ver sus criterios.
              </p>
            </section>

            {/* Panel de criterios de la señal seleccionada */}
            <aside className="space-y-3">
              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <h3 className="text-sm font-semibold text-slate-100">Criterios de la señal</h3>
                {selectedSignal ? (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                      <p className="font-medium text-rose-200">
                        {new Date(selectedSignal.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-1">
                        close ${selectedSignal.close.toLocaleString('en-US', { maximumFractionDigits: 6 })} ·
                        ret24 {selectedSignal.ret_24h_pct.toFixed(1)}% ·
                        ADX {selectedSignal.adx14?.toFixed(1) ?? '—'}
                      </p>
                      {selectedSignal.entry_reason ? (
                        <p className="mt-1 text-slate-400">motivo: {selectedSignal.entry_reason}</p>
                      ) : null}
                    </div>
                    <ul className="space-y-1">
                      {(selectedSignal.conditions ?? []).map((c) => (
                        <li
                          key={c.name}
                          className={`rounded border px-2 py-1 ${
                            c.passed
                              ? 'border-emerald-800/50 bg-emerald-500/5 text-emerald-200'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400'
                          }`}
                        >
                          <span className="font-medium">{c.passed ? '✓' : '✗'} {c.name}</span>
                          <br />
                          <span className="text-[10px] opacity-80">{c.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-slate-400">No hay señales SHORT en el histórico de este símbolo.</p>
                )}
              </section>

              {/* Lista de señales SHORT */}
              {shortSignals.length ? (
                <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs">
                  <h3 className="text-sm font-semibold text-slate-100">Señales SHORT</h3>
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    {[...shortSignals].reverse().map((s) => (
                      <button
                        key={s.timestamp}
                        type="button"
                        onClick={() => setSelectedSignalTs(s.timestamp)}
                        className={`block w-full rounded border px-2 py-1 text-left ${
                          s.timestamp === selectedSignal?.timestamp
                            ? 'border-rose-400 bg-rose-500/15 text-rose-100'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {new Date(s.timestamp).toLocaleDateString()} · ret24 {s.ret_24h_pct.toFixed(1)}% · ADX {s.adx14?.toFixed(0) ?? '—'}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </>
      ) : null}
    </main>
  );
}
