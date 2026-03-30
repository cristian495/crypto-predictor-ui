'use client';

import type { PriceZone, PriceZoneKind } from '@/lib/types';

type SupportsPanelProps = {
  title: string;
  kind: PriceZoneKind;
  zones: PriceZone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
  emptyMessage?: string;
};

function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 10) return value.toFixed(3);
  return value.toFixed(5);
}

export function SupportsPanel({
  title,
  kind,
  zones,
  selectedZoneId,
  onSelectZone,
  emptyMessage = 'No hay zonas con el mínimo de toques configurado.',
}: SupportsPanelProps) {
  const selectedStyles =
    kind === 'resistance'
      ? 'border-rose-400 bg-rose-400/15 ring-1 ring-rose-300/50'
      : 'border-amber-400 bg-amber-400/15 ring-1 ring-amber-300/50';

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <span className="text-xs text-slate-400">{zones.length} zonas</span>
      </div>

      {!zones.length ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1 md:max-h-[300px] xl:max-h-[320px]">
          {zones.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            const touchDates = zone.touchDates.join(', ');

            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => onSelectZone(isSelected ? null : zone.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  isSelected
                    ? selectedStyles
                    : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
                }`}
              >
                <p className="text-xs font-semibold text-slate-100">
                  Zona: {formatPrice(zone.minPrice)} - {formatPrice(zone.maxPrice)}
                </p>
                <p className="mt-1 text-[11px] text-slate-300">
                  Mid: {formatPrice(zone.midPrice)} | Toques: {zone.touches} | Score: {zone.score.toFixed(2)}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">Fechas: {touchDates}</p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
