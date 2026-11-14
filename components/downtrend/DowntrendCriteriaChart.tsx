'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import type { DowntrendCandle, DowntrendHistoricalSignal } from '@/lib/downtrend/dataLoader';

type Props = {
  candles: DowntrendCandle[];
  signals: DowntrendHistoricalSignal[];
  selectedTs: string | null;
  onSelectSignal: (ts: string) => void;
};

function toSec(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export function DowntrendCriteriaChart({ candles, signals, selectedTs, onSelectSignal }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // ts(seg) -> timestamp ISO de la señal, para resolver clics en marcadores.
  const markerTsRef = useRef<Map<number, string>>(new Map());

  const candleData = useMemo<CandlestickData<Time>[]>(() => {
    return candles
      .map((c) => {
        const t = toSec(c.timestamp);
        return t === null ? null : { time: t as Time, open: c.open, high: c.high, low: c.low, close: c.close };
      })
      .filter((x): x is CandlestickData<Time> => x !== null);
  }, [candles]);

  // Init chart una vez.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#020617' }, textColor: '#cbd5e1' },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)' },
      },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444', borderVisible: false,
    });
    const markers = createSeriesMarkers(series, []);

    // Clic en el chart → si cae cerca de una señal, seleccionarla.
    chart.subscribeClick((param) => {
      if (param.time === undefined) return;
      const t = Number(param.time);
      const iso = markerTsRef.current.get(t);
      if (iso) onSelectSignal(iso);
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = markers;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
    // onSelectSignal es estable (setState); init solo una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Datos de velas.
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(candleData);
    if (candleData.length) chartRef.current.timeScale().fitContent();
  }, [candleData]);

  // Marcadores de señales SHORT (▼ arriba de la vela), resaltando la seleccionada.
  useEffect(() => {
    if (!markersRef.current) return;
    const map = new Map<number, string>();
    const markers: SeriesMarker<Time>[] = [];
    for (const s of signals) {
      const t = toSec(s.timestamp);
      if (t === null) continue;
      map.set(t, s.timestamp);
      const isSel = s.timestamp === selectedTs;
      markers.push({
        time: t as Time,
        position: 'aboveBar',
        color: isSel ? '#fbbf24' : '#f43f5e',
        shape: 'arrowDown',
        text: isSel ? 'SHORT ◄' : 'S',
      });
    }
    markers.sort((a, b) => Number(a.time) - Number(b.time));
    markerTsRef.current = map;
    markersRef.current.setMarkers(markers);
  }, [signals, selectedTs]);

  return (
    <div className="relative h-[52vh] min-h-[340px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />
      {!candleData.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          No hay velas para mostrar.
        </div>
      ) : null}
    </div>
  );
}
