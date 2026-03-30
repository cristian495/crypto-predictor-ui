'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type LogicalRange,
  type Time,
} from 'lightweight-charts';
import type {
  Candle,
  LongSetup,
  PriceZone,
  ResistanceZone,
  ShortSetup,
  SupportZone,
} from '@/lib/types';

type ChartPanelProps = {
  candles: Candle[];
  supports: SupportZone[];
  resistances: ResistanceZone[];
  longSetups: LongSetup[];
  shortSetups: ShortSetup[];
  showSupports: boolean;
  showResistances: boolean;
  showLongSetups: boolean;
  showShortSetups: boolean;
  showVolume: boolean;
  selectedSupportId: string | null;
  selectedResistanceId: string | null;
  selectedLongSetupId: string | null;
  selectedShortSetupId: string | null;
};

type ZoneOverlay = {
  id: string;
  kind: 'support' | 'resistance';
  top: number;
  height: number;
  labelTop: number;
  label: string;
  selected: boolean;
};

type SetupOverlay = {
  id: string;
  kind: 'long' | 'short';
  x: number;
  y: number;
  status: LongSetup['status'] | ShortSetup['status'];
  selected: boolean;
  score: number;
};

type ZonePalette = {
  lineColor: string;
  bandColor: string;
  borderColor: string;
  labelClass: string;
};

function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 10) return value.toFixed(3);
  return value.toFixed(5);
}

function getZonePalette(kind: 'support' | 'resistance', selected: boolean): ZonePalette {
  if (kind === 'resistance') {
    return {
      lineColor: selected ? 'rgba(251, 113, 133, 0.95)' : 'rgba(244, 63, 94, 0.88)',
      bandColor: selected ? 'rgba(251, 113, 133, 0.24)' : 'rgba(244, 63, 94, 0.12)',
      borderColor: selected ? 'rgba(251, 113, 133, 0.85)' : 'rgba(244, 63, 94, 0.45)',
      labelClass: selected ? 'bg-rose-300/90 text-slate-900' : 'bg-slate-900/85 text-slate-100',
    };
  }

  return {
    lineColor: selected ? 'rgba(251, 191, 36, 0.95)' : 'rgba(245, 158, 11, 0.88)',
    bandColor: selected ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.12)',
    borderColor: selected ? 'rgba(251,191,36,0.85)' : 'rgba(245,158,11,0.45)',
    labelClass: selected ? 'bg-amber-300/90 text-slate-900' : 'bg-slate-900/85 text-slate-100',
  };
}

function toCandleSeriesData(candles: Candle[]): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: toChartTime(candle),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

function toChartTime(candle: Candle): Time {
  if (typeof candle.timestamp === 'number' && Number.isFinite(candle.timestamp)) {
    return candle.timestamp as Time;
  }
  return candle.time as Time;
}

export function ChartPanel({
  candles,
  supports,
  resistances,
  longSetups,
  shortSetups,
  showSupports,
  showResistances,
  showLongSetups,
  showShortSetups,
  showVolume,
  selectedSupportId,
  selectedResistanceId,
  selectedLongSetupId,
  selectedShortSetupId,
}: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const zoneLinesRef = useRef<Array<{ top: IPriceLine; bottom: IPriceLine }>>([]);
  const selectedSetupLinesRef = useRef<IPriceLine[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const overlayRafRef = useRef<number | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);
  const preservedLogicalRangeRef = useRef<LogicalRange | null>(null);
  const refreshZoneOverlaysRef = useRef<() => void>(() => {});

  const [zoneOverlays, setZoneOverlays] = useState<ZoneOverlay[]>([]);
  const [setupOverlays, setSetupOverlays] = useState<SetupOverlay[]>([]);

  const candleData = useMemo(() => toCandleSeriesData(candles), [candles]);

  const volumeData = useMemo(
    () =>
      candles.map((candle) => ({
        time: toChartTime(candle),
        value: candle.volume ?? 0,
        color: candle.close >= candle.open ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
      })),
    [candles],
  );

  const selectedZoneIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedSupportId) ids.add(selectedSupportId);
    if (selectedResistanceId) ids.add(selectedResistanceId);
    return ids;
  }, [selectedResistanceId, selectedSupportId]);

  const visibleZones = useMemo(() => {
    const zones: PriceZone[] = [];
    if (showSupports) zones.push(...supports);
    if (showResistances) zones.push(...resistances);
    return zones;
  }, [resistances, showResistances, showSupports, supports]);

  const clearZoneLines = useCallback(() => {
    if (!candleSeriesRef.current) return;

    zoneLinesRef.current.forEach((lines) => {
      candleSeriesRef.current.removePriceLine(lines.top);
      candleSeriesRef.current.removePriceLine(lines.bottom);
    });

    zoneLinesRef.current = [];
  }, []);

  const clearSelectedSetupLines = useCallback(() => {
    if (!candleSeriesRef.current) return;

    selectedSetupLinesRef.current.forEach((line) => {
      candleSeriesRef.current.removePriceLine(line);
    });

    selectedSetupLinesRef.current = [];
  }, []);

  const refreshZoneOverlays = useCallback(() => {
    const candleSeries = candleSeriesRef.current;
    const container = containerRef.current;
    const chart = chartRef.current;

    if (!container || !candleSeries || !chart) {
      setZoneOverlays([]);
      setSetupOverlays([]);
      return;
    }

    const containerHeight = container.clientHeight;
    if (!visibleZones.length) {
      setZoneOverlays([]);
    } else {
      const overlays: ZoneOverlay[] = visibleZones
        .map((zone) => {
          const topY = candleSeries.priceToCoordinate(zone.maxPrice);
          const bottomY = candleSeries.priceToCoordinate(zone.minPrice);

          if (topY === null || bottomY === null) {
            return null;
          }

          const top = Math.min(topY, bottomY);
          const height = Math.max(2, Math.abs(bottomY - topY));
          const selected = selectedZoneIds.has(zone.id);
          const labelTop = Math.max(4, Math.min(top + height / 2 - 10, containerHeight - 24));

          return {
            id: zone.id,
            kind: zone.kind,
            top,
            height,
            labelTop,
            selected,
            label: `${zone.kind === 'support' ? 'S' : 'R'} ${formatPrice(zone.minPrice)} - ${formatPrice(
              zone.maxPrice,
            )} | ${zone.touches} toques`,
          };
        })
        .filter((item): item is ZoneOverlay => item !== null);

      setZoneOverlays(overlays);
    }

    const markerOverlays: SetupOverlay[] = [];

    if (showLongSetups && longSetups.length) {
      longSetups.forEach((setup) => {
        const candle = candles[setup.candleIndex];
        if (!candle) return;

        const x = chart.timeScale().timeToCoordinate(toChartTime(candle));
        const yBase = candleSeries.priceToCoordinate(candle.low);
        if (x === null || yBase === null) return;

        markerOverlays.push({
          id: setup.id,
          kind: 'long',
          x,
          y: Math.max(8, Math.min(containerHeight - 8, yBase + 12)),
          status: setup.status,
          selected: setup.id === selectedLongSetupId,
          score: setup.totalScore,
        });
      });
    }

    if (showShortSetups && shortSetups.length) {
      shortSetups.forEach((setup) => {
        const candle = candles[setup.candleIndex];
        if (!candle) return;

        const x = chart.timeScale().timeToCoordinate(toChartTime(candle));
        const yBase = candleSeries.priceToCoordinate(candle.high);
        if (x === null || yBase === null) return;

        markerOverlays.push({
          id: setup.id,
          kind: 'short',
          x,
          y: Math.max(8, Math.min(containerHeight - 8, yBase - 12)),
          status: setup.status,
          selected: setup.id === selectedShortSetupId,
          score: setup.totalScore,
        });
      });
    }

    if (!markerOverlays.length) {
      setSetupOverlays([]);
      return;
    }

    setSetupOverlays(markerOverlays);
  }, [
    candles,
    longSetups,
    selectedLongSetupId,
    selectedShortSetupId,
    selectedZoneIds,
    shortSetups,
    showLongSetups,
    showShortSetups,
    visibleZones,
  ]);

  useEffect(() => {
    refreshZoneOverlaysRef.current = refreshZoneOverlays;
  }, [refreshZoneOverlays]);

  const scheduleOverlayRefresh = useCallback(() => {
    if (overlayRafRef.current !== null) {
      cancelAnimationFrame(overlayRafRef.current);
    }

    overlayRafRef.current = requestAnimationFrame(() => {
      overlayRafRef.current = null;
      refreshZoneOverlaysRef.current();
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#cbd5e1',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.78,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    resizeObserverRef.current = new ResizeObserver(() => {
      scheduleOverlayRefresh();
    });
    resizeObserverRef.current.observe(container);

    const handleVisibleRangeChange = () => {
      preservedLogicalRangeRef.current = chart.timeScale().getVisibleLogicalRange();
      scheduleOverlayRefresh();
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      clearZoneLines();
      clearSelectedSetupLines();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (overlayRafRef.current !== null) {
        cancelAnimationFrame(overlayRafRef.current);
        overlayRafRef.current = null;
      }

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [clearSelectedSetupLines, clearZoneLines, scheduleOverlayRefresh]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) {
      return;
    }

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(showVolume ? volumeData : []);

    candleSeriesRef.current.priceScale().applyOptions({
      scaleMargins: showVolume
        ? {
            top: 0.06,
            bottom: 0.22,
          }
        : {
            top: 0.06,
            bottom: 0.02,
          },
    });

    if (!hasInitialFitRef.current && candles.length > 0) {
      chartRef.current.timeScale().fitContent();
      hasInitialFitRef.current = true;
    } else if (preservedLogicalRangeRef.current) {
      chartRef.current.timeScale().setVisibleLogicalRange(preservedLogicalRangeRef.current);
    }

    scheduleOverlayRefresh();
  }, [candleData, candles.length, scheduleOverlayRefresh, showVolume, volumeData]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    clearZoneLines();

    visibleZones.forEach((zone) => {
      const selected = selectedZoneIds.has(zone.id);
      const palette = getZonePalette(zone.kind, selected);

      const topLine = candleSeriesRef.current.createPriceLine({
        price: zone.maxPrice,
        color: palette.lineColor,
        lineWidth: selected ? 2 : 1,
        lineStyle: selected ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: false,
        title: '',
      });

      const bottomLine = candleSeriesRef.current.createPriceLine({
        price: zone.minPrice,
        color: palette.lineColor,
        lineWidth: selected ? 2 : 1,
        lineStyle: selected ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: false,
        title: '',
      });

      zoneLinesRef.current.push({ top: topLine, bottom: bottomLine });
    });

    scheduleOverlayRefresh();
  }, [clearZoneLines, scheduleOverlayRefresh, selectedZoneIds, visibleZones]);

  useEffect(() => {
    scheduleOverlayRefresh();
  }, [
    longSetups,
    scheduleOverlayRefresh,
    selectedLongSetupId,
    selectedShortSetupId,
    shortSetups,
    showLongSetups,
    showShortSetups,
  ]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    clearSelectedSetupLines();

    const selectedLongSetup =
      showLongSetups && selectedLongSetupId
        ? longSetups.find((setup) => setup.id === selectedLongSetupId)
        : null;
    const selectedShortSetup =
      showShortSetups && selectedShortSetupId
        ? shortSetups.find((setup) => setup.id === selectedShortSetupId)
        : null;
    const setupKind = selectedLongSetup ? 'long' : selectedShortSetup ? 'short' : null;
    const selectedSetup = selectedLongSetup ?? selectedShortSetup;

    if (!setupKind || !selectedSetup) {
      return;
    }

    const entryLine = candleSeriesRef.current.createPriceLine({
      price: selectedSetup.entryPrice,
      color: 'rgba(56, 189, 248, 0.95)',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Entry',
    });

    const stopLine = candleSeriesRef.current.createPriceLine({
      price: selectedSetup.stopPrice,
      color: setupKind === 'long' ? 'rgba(248, 113, 113, 0.9)' : 'rgba(251, 113, 133, 0.9)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Stop',
    });

    const lines: IPriceLine[] = [entryLine, stopLine];

    if (selectedSetup.targetPrice !== undefined) {
      const targetLine = candleSeriesRef.current.createPriceLine({
        price: selectedSetup.targetPrice,
        color: setupKind === 'long' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(251, 191, 36, 0.9)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target',
      });
      lines.push(targetLine);
    }

    selectedSetupLinesRef.current = lines;
  }, [
    clearSelectedSetupLines,
    longSetups,
    selectedLongSetupId,
    selectedShortSetupId,
    shortSetups,
    showLongSetups,
    showShortSetups,
  ]);

  return (
    <section className="h-[68vh] min-h-[420px] w-full rounded-xl border border-slate-800 bg-slate-950">
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        <div ref={containerRef} className="h-full w-full" />

        {visibleZones.length ? (
          <div className="pointer-events-none absolute inset-0">
            {zoneOverlays.map((overlay) => {
              const palette = getZonePalette(overlay.kind, overlay.selected);
              return (
                <div key={overlay.id}>
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      top: `${overlay.top}px`,
                      height: `${overlay.height}px`,
                      backgroundColor: palette.bandColor,
                      borderTop: `1px solid ${palette.borderColor}`,
                      borderBottom: `1px solid ${palette.borderColor}`,
                    }}
                  />
                  <span
                    className={`absolute right-2 rounded px-2 py-0.5 text-[10px] ${palette.labelClass}`}
                    style={{ top: `${overlay.labelTop}px` }}
                  >
                    {overlay.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {setupOverlays.length ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            {setupOverlays.map((marker) => {
              const bgClass =
                marker.kind === 'long'
                  ? marker.selected
                    ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-200/70'
                    : marker.status === 'confirmed'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-amber-300 text-slate-950'
                  : marker.selected
                    ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-200/70'
                    : marker.status === 'strong_confirmed'
                      ? 'bg-rose-700 text-slate-100'
                      : marker.status === 'confirmed'
                        ? 'bg-rose-500 text-slate-950'
                        : 'bg-orange-400 text-slate-950';

              const markerText =
                marker.kind === 'long'
                  ? marker.status === 'confirmed'
                    ? 'L\u2191'
                    : 'L'
                  : marker.status === 'strong_confirmed'
                    ? 'S\u21d3'
                    : marker.status === 'confirmed'
                      ? 'S\u2193'
                      : 'S';

              return (
                <span
                  key={marker.id}
                  className={`absolute inline-flex h-5 min-w-[20px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-[10px] font-semibold shadow ${bgClass}`}
                  style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
                  title={`${marker.kind.toUpperCase()} ${marker.score.toFixed(1)} (${marker.status})`}
                >
                  {markerText}
                </span>
              );
            })}
          </div>
        ) : null}

        {!candles.length ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Carga un dataset para renderizar el gráfico.
          </div>
        ) : null}
      </div>
    </section>
  );
}
