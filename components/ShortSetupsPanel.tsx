'use client';

import { useMemo, useState } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { ShortSetup } from '@/lib/types';

type ShortSetupsPanelProps = {
  setups: ShortSetup[];
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

function setupToClipboardText(setup: ShortSetup): string {
  return [
    `Fecha: ${setup.time}`,
    `Estado: ${setup.status}`,
    `Quality: ${setup.quality}`,
    `Entry: ${formatPrice(setup.entryPrice)}`,
    `Stop: ${formatPrice(setup.stopPrice)}`,
    `Target: ${formatPrice(setup.targetPrice)}`,
    `RR: ${setup.rr ? setup.rr.toFixed(2) : '-'}`,
    `Score total: ${setup.totalScore.toFixed(1)}`,
    `Rejection: ${setup.rejectionScore.toFixed(1)}`,
    `Confirmation: ${setup.confirmationScore.toFixed(1)}`,
    `Context: ${setup.contextScore.toFixed(1)}`,
    `Resistencia: ${setup.resistanceZoneId}`,
    `Soporte target: ${setup.supportZoneId ?? '-'}`,
    `Razones: ${setup.tags.join(', ')}`,
  ].join('\n');
}

function describeReason(reason: string): string {
  if (reason.startsWith('Near resistance ')) {
    return 'La vela se detectó tocando o muy cerca de una zona de resistencia.';
  }

  if (reason.startsWith('Bearish rejection wick ')) {
    return 'La mecha superior fue relativamente grande, señal de rechazo bajista en esa vela.';
  }

  if (reason === 'Upper wick > body') {
    return 'La mecha superior es mayor que el cuerpo de la vela, señal de agotamiento alcista.';
  }

  if (reason === 'Bearish close < open') {
    return 'La vela cerró por debajo de su apertura; confirmación bajista básica.';
  }

  if (reason === 'Bearish close + close < prev close') {
    return 'Confirmación más estricta: cierre bajista y además cierre menor al de la vela previa.';
  }

  if (reason === 'Aggressive mode') {
    return 'Modo agresivo: permite setup con menos filtros de confirmación.';
  }

  if (reason === 'Awaiting bearish confirmation') {
    return 'Aún no cumple la confirmación bajista exigida por el modo configurado.';
  }

  if (/^Close above \d+c avg$/.test(reason)) {
    return 'El cierre actual está por encima del promedio de las últimas N velas (lookback), señal de rally previo.';
  }

  if (reason === 'Recent bullish rally') {
    return 'Hubo una secuencia alcista reciente, contexto útil para buscar SHORT en resistencia.';
  }

  if (reason === 'Rally context missing') {
    return 'No se encontró contexto de rally suficiente según los parámetros actuales.';
  }

  if (reason === 'Rally filter disabled') {
    return 'El filtro de contexto de rally está apagado.';
  }

  if (reason === 'Broke previous low') {
    return 'El cierre rompió el mínimo de la vela anterior, confirmación bajista más fuerte.';
  }

  if (reason.startsWith('RR ')) {
    return 'Relación riesgo/beneficio estimada usando stop sobre resistencia y target en soporte.';
  }

  return 'Razón usada por el detector para puntuar y clasificar este setup.';
}

export function ShortSetupsPanel({
  setups,
  selectedSetupId,
  currentPrice,
  onSelectSetup,
}: ShortSetupsPanelProps) {
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
        <h2 className="text-sm font-semibold text-slate-100">Short Setups Detectados</h2>
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
          No se detectaron setups SHORT con la configuración actual.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-[11px] font-semibold text-slate-300">Short setup más reciente</p>
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
              <p className="text-[11px] font-semibold text-slate-300">Short setup más cercano al precio actual</p>
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
                setup.status === 'strong_confirmed'
                  ? 'border-rose-700/80 bg-rose-700/15'
                  : setup.status === 'confirmed'
                    ? 'border-rose-500/70 bg-rose-500/15'
                    : 'border-orange-400/60 bg-orange-400/10';

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
                      <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
                        {setup.quality}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          setup.status === 'strong_confirmed'
                            ? 'bg-rose-700/30 text-rose-200'
                            : setup.status === 'confirmed'
                              ? 'bg-rose-500/25 text-rose-200'
                              : 'bg-orange-400/20 text-orange-200'
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
                    Resistencia: {setup.resistanceZoneId} | Soporte target: {setup.supportZoneId ?? '-'}
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
