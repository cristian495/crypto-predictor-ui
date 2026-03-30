'use client';

import { useMemo, useState } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { LongSetup } from '@/lib/types';

type LongSetupsPanelProps = {
  setups: LongSetup[];
  selectedSetupId: string | null;
  currentPrice: number | null;
  onSelectSetup: (setupId: string | null) => void;
};

function formatPrice(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 10) return value.toFixed(4);
  return value.toFixed(6);
}

function setupToClipboardText(setup: LongSetup): string {
  return [
    `Fecha: ${setup.time}`,
    `Estado: ${setup.status}`,
    `Entry: ${formatPrice(setup.entryPrice)}`,
    `Stop: ${formatPrice(setup.stopPrice)}`,
    `Target: ${formatPrice(setup.targetPrice)}`,
    `RR: ${setup.rr ? setup.rr.toFixed(2) : '-'}`,
    `Score total: ${setup.totalScore.toFixed(1)}`,
    `Rejection: ${setup.rejectionScore.toFixed(1)}`,
    `Confirmation: ${setup.confirmationScore.toFixed(1)}`,
    `Context: ${setup.contextScore.toFixed(1)}`,
    `Soporte: ${setup.supportZoneId}`,
    `Resistencia target: ${setup.resistanceZoneId ?? '-'}`,
    `Razones: ${setup.tags.join(', ')}`,
  ].join('\n');
}

function describeReason(reason: string): string {
  if (reason.startsWith('Near support ')) {
    return 'La vela se detectó tocando o muy cerca de una zona de soporte.';
  }

  if (reason.startsWith('Bullish rejection wick ')) {
    return 'La mecha inferior fue relativamente grande, señal de rechazo alcista en esa vela.';
  }

  if (reason === 'Lower wick > body') {
    return 'La mecha inferior es mayor que el cuerpo de la vela, una señal de rebote potencial.';
  }

  if (reason === 'Bullish close > open') {
    return 'La vela cerró por encima de su apertura; confirmación alcista básica.';
  }

  if (reason === 'Bullish close + close > prev close') {
    return 'Confirmación más estricta: cierre alcista y además cierre mayor al de la vela previa.';
  }

  if (reason === 'Aggressive mode') {
    return 'Modo de confirmación agresivo: acepta setup con menos filtros de confirmación.';
  }

  if (reason === 'Awaiting bullish confirmation') {
    return 'Todavía no cumple la confirmación alcista exigida por el modo configurado.';
  }

  if (/^Close below \d+c avg$/.test(reason)) {
    return 'El cierre actual está por debajo del promedio de cierre de las últimas N velas (lookback), indicando pullback.';
  }

  if (reason === 'Recent bearish pullback') {
    return 'Hubo una secuencia bajista reciente, contexto útil para buscar rebote LONG.';
  }

  if (reason === 'Pullback context missing') {
    return 'No se encontró contexto de pullback suficiente según los parámetros actuales.';
  }

  if (reason === 'Pullback filter disabled') {
    return 'El filtro de contexto de pullback está apagado, por eso no se exige esta validación.';
  }

  if (reason.startsWith('RR ')) {
    return 'Relación riesgo/beneficio estimada del setup con entry, stop y target detectados.';
  }

  return 'Razón usada por el detector para puntuar y clasificar este setup.';
}

export function LongSetupsPanel({
  setups,
  selectedSetupId,
  currentPrice,
  onSelectSetup,
}: LongSetupsPanelProps) {
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const mostRecent = useMemo(
    () => [...setups].sort((a, b) => b.candleIndex - a.candleIndex)[0] ?? null,
    [setups],
  );

  const closestToCurrent = useMemo(() => {
    if (currentPrice === null || !Number.isFinite(currentPrice) || !setups.length) {
      return null;
    }
    return (
      [...setups].sort(
        (a, b) => Math.abs(a.entryPrice - currentPrice) - Math.abs(b.entryPrice - currentPrice),
      )[0] ?? null
    );
  }, [currentPrice, setups]);

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(token);
      setTimeout(() => setCopiedState((prev) => (prev === token ? null : prev)), 1500);
    } catch {
      setCopiedState('error');
      setTimeout(() => setCopiedState((prev) => (prev === 'error' ? null : prev)), 1500);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Long Setups Detectados</h2>
        <span className="text-xs text-slate-400">{setups.length} setups</span>
      </div>

      {setups.length ? (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              void copyToClipboard(setups.map((setup) => setupToClipboardText(setup)).join('\n\n-----\n\n'), 'all')
            }
            className="rounded-lg border border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:border-slate-400"
          >
            Copiar todos
          </button>
          <span className="text-[11px] text-slate-500">
            {copiedState === 'all'
              ? 'Copiado'
              : copiedState === 'error'
                ? 'No se pudo copiar'
                : 'Puedes seleccionar texto manualmente también'}
          </span>
        </div>
      ) : null}

      {!setups.length ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-400">
          No se detectaron setups LONG con la configuración actual.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-[11px] font-semibold text-slate-300">Long setup más reciente</p>
              {mostRecent ? (
                <>
                  <p className="mt-1 text-xs text-slate-100">{mostRecent.time}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Entry: {formatPrice(mostRecent.entryPrice)} | Score: {mostRecent.totalScore.toFixed(1)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">Sin datos</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-[11px] font-semibold text-slate-300">Long setup más cercano al precio actual</p>
              {closestToCurrent ? (
                <>
                  <p className="mt-1 text-xs text-slate-100">{closestToCurrent.time}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Entry: {formatPrice(closestToCurrent.entryPrice)} | RR:{' '}
                    {closestToCurrent.rr ? closestToCurrent.rr.toFixed(2) : '-'}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">Sin datos</p>
              )}
            </div>
          </div>

          <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1 xl:max-h-[360px]">
            {setups.map((setup) => {
              const selected = setup.id === selectedSetupId;
              const statusClass =
                setup.status === 'confirmed'
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-amber-400/60 bg-amber-400/10';

              return (
                <div
                  key={setup.id}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selected
                      ? 'border-sky-400 bg-sky-400/10 ring-1 ring-sky-300/40'
                      : statusClass
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-100 select-text">{setup.time}</p>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          setup.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-400/20 text-amber-300'
                        }`}
                      >
                        {setup.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectSetup(selected ? null : setup.id)}
                        className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-200 hover:border-slate-400"
                      >
                        {selected ? 'Quitar foco' : 'Seleccionar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(setupToClipboardText(setup), setup.id)}
                        className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-200 hover:border-slate-400"
                      >
                        {copiedState === setup.id ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-200 select-text">
                    Entry: {formatPrice(setup.entryPrice)} | Stop: {formatPrice(setup.stopPrice)} | Target:{' '}
                    {formatPrice(setup.targetPrice)}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-300 select-text">
                    RR: {setup.rr ? setup.rr.toFixed(2) : '-'} | Score: {setup.totalScore.toFixed(1)} | Rej:{' '}
                    {setup.rejectionScore.toFixed(1)} | Conf: {setup.confirmationScore.toFixed(1)} | Ctx:{' '}
                    {setup.contextScore.toFixed(1)}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400 select-text">
                    Soporte: {setup.supportZoneId} | Resistencia target: {setup.resistanceZoneId ?? '-'}
                  </p>

                  <div className="mt-1">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Razones</span>
                      <InfoTooltip text="Pasa el cursor sobre cada razón para ver qué significa." />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {setup.tags.map((reason, index) => (
                        <span
                          key={`${setup.id}-${index}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-[11px] leading-relaxed text-slate-300"
                        >
                          <span className="select-text">{reason}</span>
                          <InfoTooltip text={describeReason(reason)} size="sm" />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
