'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LogicalRange,
  type MouseEventHandler,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { BacktestTradeSample, Candle, HistoricalSignal } from '@/lib/backtest/types';

type BacktestCandlesChartProps = {
  symbol: string;
  candles: Candle[];
  historicalSignals: HistoricalSignal[];
  trades: BacktestTradeSample[];
  selectedTradeId: string | null;
  onSelectTradeId: (tradeId: string | null) => void;
  minVolumeMult?: number;
  useVolumeFilter?: boolean;
  useRsiFilter?: boolean;
  rsiMin?: number;
  rsiMax?: number;
};

type RangeSelectionPoint = {
  time: number;
  price: number | null;
};

function toUtcTimestamp(value: string): UTCTimestamp | null {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function timeToUnixSeconds(value: Time | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'year' in value) {
    const ms = Date.UTC(value.year, value.month - 1, value.day);
    if (Number.isFinite(ms)) {
      return Math.floor(ms / 1000);
    }
  }

  return null;
}

function markerIdToTradeId(markerId: unknown): string | null {
  if (typeof markerId !== 'string') return null;
  if (!markerId.startsWith('trade:')) return null;

  const parts = markerId.split(':');
  if (parts.length < 3) return null;
  return parts[1] || null;
}

function formatVolume(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';

  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatTimestampFromSeconds(unixSeconds: number | null): string {
  if (unixSeconds === null || !Number.isFinite(unixSeconds)) return '-';

  const iso = new Date(unixSeconds * 1000).toISOString();
  return iso.replace('T', ' ').replace('.000Z', ' UTC');
}

export function BacktestCandlesChart({
  symbol,
  candles,
  historicalSignals,
  trades,
  selectedTradeId,
  onSelectTradeId,
  minVolumeMult = 0.5,
  useVolumeFilter = true,
  useRsiFilter = true,
  rsiMin = 0,
  rsiMax = 100,
}: BacktestCandlesChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);

  const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const selectedTradeLinesRef = useRef<IPriceLine[]>([]);

  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);
  const preservedLogicalRangeRef = useRef<LogicalRange | null>(null);

  const [hoveredTimeSec, setHoveredTimeSec] = useState<number | null>(null);
  const [selectedTimeSec, setSelectedTimeSec] = useState<number | null>(null);
  const [rangeSelection, setRangeSelection] = useState<{
    start: RangeSelectionPoint | null;
    end: RangeSelectionPoint | null;
  }>({
    start: null,
    end: null,
  });

  const selectCandlePoint = useCallback((timeSec: number, price: number | null) => {
    setSelectedTimeSec((prev) => (prev === timeSec ? null : timeSec));

    const nextPoint: RangeSelectionPoint = {
      time: timeSec,
      price,
    };

    setRangeSelection((prev) => {
      if (prev.start === null || prev.end !== null) {
        return { start: nextPoint, end: null };
      }

      if (prev.start.time === timeSec) {
        return { start: null, end: null };
      }

      return { start: prev.start, end: nextPoint };
    });
  }, []);

  const clearRangeSelection = useCallback(() => {
    setRangeSelection({ start: null, end: null });
  }, []);

  const getPriceFromPointer = useCallback((param: MouseEventParams<Time>): number | null => {
    const y = param.point?.y;
    if (typeof y !== 'number' || !Number.isFinite(y)) return null;

    const price = candleSeriesRef.current?.coordinateToPrice(y);
    return typeof price === 'number' && Number.isFinite(price) ? price : null;
  }, []);

  const derivedData = useMemo(() => {
    const candleByTime = new Map<number, Candle>();
    const signalByTime = new Map<number, HistoricalSignal>();
    const rsiByTime = new Map<number, number>();
    const volumeByTime = new Map<number, number>();
    const volumeMa20ByTime = new Map<number, number>();
    const relativeVolumeByTime = new Map<number, number>();
    const indexByTime = new Map<number, number>();
    const candlesData: CandlestickData<Time>[] = [];
    const rows: Array<{ time: number; close: number; volume: number | null }> = [];

    candles.forEach((candle) => {
      const time = toUtcTimestamp(candle.timestamp);
      if (time === null) return;

      candleByTime.set(time, candle);
      candlesData.push({
        time: time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });

      const volume =
        typeof candle.volume === 'number' && Number.isFinite(candle.volume) ? candle.volume : null;
      if (volume !== null) {
        volumeByTime.set(time, volume);
      }

      rows.push({
        time,
        close: candle.close,
        volume,
      });

      indexByTime.set(time, rows.length - 1);
    });

    historicalSignals.forEach((item) => {
      const time = toUtcTimestamp(item.timestamp);
      if (time === null) return;

      signalByTime.set(time, item);
      if (typeof item.rsi14 === 'number' && Number.isFinite(item.rsi14)) {
        rsiByTime.set(time, item.rsi14);
      }

      if (typeof item.relativeVolume === 'number' && Number.isFinite(item.relativeVolume)) {
        relativeVolumeByTime.set(time, item.relativeVolume);
      }
    });

    const gains = new Array<number>(rows.length).fill(0);
    const losses = new Array<number>(rows.length).fill(0);

    for (let i = 1; i < rows.length; i += 1) {
      const previousRow = rows[i - 1];
      const currentRow = rows[i];
      if (!previousRow || !currentRow) continue;

      const delta = currentRow.close - previousRow.close;
      gains[i] = Math.max(delta, 0);
      losses[i] = Math.max(-delta, 0);
    }

    for (let i = 14; i < rows.length; i += 1) {
      let gainSum = 0;
      let lossSum = 0;
      for (let j = i - 13; j <= i; j += 1) {
        gainSum += gains[j] ?? 0;
        lossSum += losses[j] ?? 0;
      }

      const avgGain = gainSum / 14;
      const avgLoss = lossSum / 14;
      const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      const row = rows[i];
      if (row && !rsiByTime.has(row.time) && Number.isFinite(value)) {
        rsiByTime.set(row.time, value);
      }
    }

    for (let i = 19; i < rows.length; i += 1) {
      let sum = 0;
      let valid = true;
      for (let j = i - 19; j <= i; j += 1) {
        const row = rows[j];
        const volume = row?.volume ?? null;
        if (volume === null) {
          valid = false;
          break;
        }
        sum += volume;
      }
      if (!valid) continue;
      const row = rows[i];
      if (!row) continue;

      const ma20 = sum / 20;
      volumeMa20ByTime.set(row.time, ma20);

      if (!relativeVolumeByTime.has(row.time) && row.volume !== null && ma20 > 0) {
        relativeVolumeByTime.set(row.time, row.volume / ma20);
      }
    }

    return {
      candleByTime,
      signalByTime,
      rsiByTime,
      volumeByTime,
      volumeMa20ByTime,
      relativeVolumeByTime,
      indexByTime,
      candlesData,
      lastTimeSec: rows[rows.length - 1]?.time ?? null,
    };
  }, [candles, historicalSignals]);

  const markers = useMemo<SeriesMarker<Time>[]>(() => {
    const result: SeriesMarker<Time>[] = [];

    trades.forEach((trade) => {
      const entryTime = toUtcTimestamp(trade.entryTime);
      const exitTime = toUtcTimestamp(trade.exitTime);
      const isWinner = trade.pnlPct > 0;

      if (entryTime !== null) {
        result.push({
          id: `trade:${trade.id}:entry`,
          time: entryTime,
          position: 'belowBar',
          shape: 'arrowUp',
          color: 'rgba(56, 189, 248, 0.95)',
          text: 'E',
          size: selectedTradeId === trade.id ? 1.2 : 1,
        });
      }

      if (exitTime !== null) {
        result.push({
          id: `trade:${trade.id}:exit`,
          time: exitTime,
          position: 'aboveBar',
          shape: 'arrowDown',
          color: isWinner ? 'rgba(34, 197, 94, 0.95)' : 'rgba(244, 63, 94, 0.95)',
          text: isWinner ? 'X+' : 'X-',
          size: selectedTradeId === trade.id ? 1.2 : 1,
        });
      }
    });

    if (rangeSelection.start !== null) {
      result.push({
        id: 'manual:range-start',
        time: rangeSelection.start.time as Time,
        position: 'belowBar',
        shape: 'circle',
        color: 'rgba(59, 130, 246, 0.95)',
        text: 'A',
      });
    }

    if (rangeSelection.end !== null) {
      result.push({
        id: 'manual:range-end',
        time: rangeSelection.end.time as Time,
        position: 'aboveBar',
        shape: 'circle',
        color: 'rgba(245, 158, 11, 0.95)',
        text: 'B',
      });
    }

    return result;
  }, [rangeSelection.end, rangeSelection.start, selectedTradeId, trades]);

  const selectedTrade = useMemo(
    () => trades.find((trade) => trade.id === selectedTradeId) ?? null,
    [selectedTradeId, trades],
  );

  const activeTimeSec = selectedTimeSec ?? hoveredTimeSec ?? derivedData.lastTimeSec;
  const activeCandle = activeTimeSec !== null ? derivedData.candleByTime.get(activeTimeSec) ?? null : null;
  const activeSignal = activeTimeSec !== null ? derivedData.signalByTime.get(activeTimeSec) ?? null : null;

  const currentRsi = useMemo(() => {
    if (activeTimeSec === null) return null;
    const fromMap = derivedData.rsiByTime.get(activeTimeSec);
    if (typeof fromMap === 'number' && Number.isFinite(fromMap)) return fromMap;
    return activeSignal?.rsi14 ?? null;
  }, [activeSignal?.rsi14, activeTimeSec, derivedData.rsiByTime]);

  const currentVolume = useMemo(() => {
    if (activeTimeSec === null) return null;
    const value = derivedData.volumeByTime.get(activeTimeSec);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }, [activeTimeSec, derivedData.volumeByTime]);

  const currentVolumeMa = useMemo(() => {
    if (activeTimeSec === null) return null;
    const value = derivedData.volumeMa20ByTime.get(activeTimeSec);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }, [activeTimeSec, derivedData.volumeMa20ByTime]);

  const currentRelVol = useMemo(() => {
    if (activeTimeSec === null) return null;
    const fromMap = derivedData.relativeVolumeByTime.get(activeTimeSec);
    if (typeof fromMap === 'number' && Number.isFinite(fromMap)) return fromMap;
    return activeSignal?.relativeVolume ?? null;
  }, [activeSignal?.relativeVolume, activeTimeSec, derivedData.relativeVolumeByTime]);

  const rangeComparison = useMemo(() => {
    const startPoint = rangeSelection.start;
    const endPoint = rangeSelection.end;
    if (startPoint === null || endPoint === null) return null;

    const startIndex = derivedData.indexByTime.get(startPoint.time);
    const endIndex = derivedData.indexByTime.get(endPoint.time);
    if (startIndex === undefined || endIndex === undefined) return null;

    const fromPoint = startIndex <= endIndex ? startPoint : endPoint;
    const toPoint = startIndex <= endIndex ? endPoint : startPoint;

    const fromCandle = derivedData.candleByTime.get(fromPoint.time);
    const toCandle = derivedData.candleByTime.get(toPoint.time);
    if (!fromCandle || !toCandle) return null;

    const fromPrice =
      typeof fromPoint.price === 'number' && Number.isFinite(fromPoint.price)
        ? fromPoint.price
        : fromCandle.close;
    const toPrice =
      typeof toPoint.price === 'number' && Number.isFinite(toPoint.price) ? toPoint.price : toCandle.close;
    if (!Number.isFinite(fromPrice) || !Number.isFinite(toPrice) || fromPrice === 0) return null;

    const priceDelta = toPrice - fromPrice;
    const returnPct = (priceDelta / fromPrice) * 100;

    return {
      fromTime: fromPoint.time,
      toTime: toPoint.time,
      fromPrice,
      toPrice,
      priceDelta,
      returnPct,
      bars: Math.abs(endIndex - startIndex),
    };
  }, [derivedData.candleByTime, derivedData.indexByTime, rangeSelection.end, rangeSelection.start]);

  const rsiFilterPass = useMemo(() => {
    if (!useRsiFilter) return null;
    if (currentRsi === null) return null;
    return currentRsi >= rsiMin && currentRsi <= rsiMax;
  }, [currentRsi, rsiMax, rsiMin, useRsiFilter]);

  const volumeFilterPass = useMemo(() => {
    if (!useVolumeFilter) return null;
    if (currentRelVol === null) return null;
    return currentRelVol >= minVolumeMult;
  }, [currentRelVol, minVolumeMult, useVolumeFilter]);

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

    const markersApi = createSeriesMarkers(candleSeries, []);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    markersApiRef.current = markersApi;

    const handleClick: MouseEventHandler<Time> = (param) => {
      const clickedTime = timeToUnixSeconds(param.time);
      const clickedPrice = getPriceFromPointer(param);
      const tradeId = markerIdToTradeId(param.hoveredObjectId);

      if (tradeId) {
        onSelectTradeId(tradeId);
        if (clickedTime !== null) {
          selectCandlePoint(clickedTime, clickedPrice);
        }
        return;
      }

      onSelectTradeId(null);
      if (clickedTime !== null) {
        selectCandlePoint(clickedTime, clickedPrice);
      }
    };

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      setHoveredTimeSec(timeToUnixSeconds(param.time));
    };

    const handleVisibleRangeChange = () => {
      preservedLogicalRangeRef.current = chart.timeScale().getVisibleLogicalRange();
    };

    chart.subscribeClick(handleClick);
    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    resizeObserverRef.current = new ResizeObserver(() => {
      preservedLogicalRangeRef.current = chart.timeScale().getVisibleLogicalRange();
    });
    resizeObserverRef.current.observe(container);

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

      selectedTradeLinesRef.current.forEach((line) => {
        candleSeries.removePriceLine(line);
      });
      selectedTradeLinesRef.current = [];

      markersApi.detach();

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      markersApiRef.current = null;
      setHoveredTimeSec(null);
    };
  }, [getPriceFromPointer, onSelectTradeId, selectCandlePoint]);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    candleSeriesRef.current.setData(derivedData.candlesData);

    if (!hasInitialFitRef.current && derivedData.candlesData.length > 0) {
      chartRef.current.timeScale().fitContent();
      hasInitialFitRef.current = true;
    } else if (preservedLogicalRangeRef.current) {
      chartRef.current.timeScale().setVisibleLogicalRange(preservedLogicalRangeRef.current);
    }
  }, [derivedData.candlesData]);

  useEffect(() => {
    if (!markersApiRef.current) return;
    markersApiRef.current.setMarkers(markers);
  }, [markers]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    selectedTradeLinesRef.current.forEach((line) => {
      candleSeriesRef.current?.removePriceLine(line);
    });
    selectedTradeLinesRef.current = [];

    if (!selectedTrade) return;

    const entryLine = candleSeriesRef.current.createPriceLine({
      price: selectedTrade.entryPrice,
      color: 'rgba(56, 189, 248, 0.95)',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Entry',
    });

    const exitLine = candleSeriesRef.current.createPriceLine({
      price: selectedTrade.exitPrice,
      color: selectedTrade.pnlPct > 0 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(244, 63, 94, 0.95)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Exit',
    });

    selectedTradeLinesRef.current = [entryLine, exitLine];
  }, [selectedTrade]);

  useEffect(() => {
    setHoveredTimeSec(null);
    setSelectedTimeSec(null);
    setRangeSelection({ start: null, end: null });
  }, [symbol, derivedData.candlesData.length]);

  const selectionLabel =
    rangeSelection.end !== null
      ? 'rango A->B activo'
      : selectedTimeSec !== null
        ? 'vela fijada por click'
        : hoveredTimeSec !== null
          ? 'hover activo'
          : 'ultima vela';

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Backtest Historico · {symbol}</h3>
        <div className="text-[11px] text-slate-400">
          {trades.length ? `${trades.length} trades con markers` : 'Sin trades para este simbolo'}
        </div>
      </div>

      <div className="relative h-[52vh] min-h-[360px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <div ref={containerRef} className="h-full w-full" />

        {!candles.length ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            No hay velas historicas para graficar.
          </div>
        ) : null}

        {candles.length > 0 && trades.length === 0 ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded border border-slate-700 bg-slate-900/85 px-2 py-1 text-[11px] text-slate-300">
            No hay trades historicos para mostrar markers.
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-100">Lectura por vela (hover/click)</h4>
          <p className="text-[11px] text-slate-400">
            {selectionLabel} · {formatTimestampFromSeconds(activeTimeSec)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">Close</p>
            <p className="mt-1 font-semibold text-slate-100">
              {activeCandle ? activeCandle.close.toFixed(6) : '-'}
            </p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">Volume</p>
            <p className="mt-1 font-semibold text-slate-100">{formatVolume(currentVolume)}</p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">Vol SMA20</p>
            <p className="mt-1 font-semibold text-slate-100">{formatVolume(currentVolumeMa)}</p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">RelVol</p>
            <p className="mt-1 font-semibold text-slate-100">
              {currentRelVol !== null ? currentRelVol.toFixed(2) : '-'}
            </p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">RSI(14)</p>
            <p className="mt-1 font-semibold text-slate-100">
              {currentRsi !== null ? currentRsi.toFixed(2) : '-'}
            </p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">24h Return</p>
            <p className="mt-1 font-semibold text-slate-100">{formatPct(activeSignal?.pastReturnPct ?? null)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">volume_filter</p>
            {!useVolumeFilter ? (
              <p className="mt-1 font-medium text-slate-300">DISABLED</p>
            ) : volumeFilterPass === null ? (
              <p className="mt-1 font-medium text-slate-400">SIN DATO (RelVol)</p>
            ) : (
              <p className={`mt-1 font-medium ${volumeFilterPass ? 'text-emerald-300' : 'text-rose-300'}`}>
                {volumeFilterPass ? 'PASS' : 'FAIL'} · relVol{' '}
                {currentRelVol !== null ? currentRelVol.toFixed(2) : '-'} {volumeFilterPass ? '>=' : '<'} min{' '}
                {minVolumeMult.toFixed(2)}
              </p>
            )}
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-slate-400">rsi_filter</p>
            {!useRsiFilter ? (
              <p className="mt-1 font-medium text-slate-300">DISABLED</p>
            ) : rsiFilterPass === null ? (
              <p className="mt-1 font-medium text-slate-400">SIN DATO (RSI)</p>
            ) : (
              <p className={`mt-1 font-medium ${rsiFilterPass ? 'text-emerald-300' : 'text-rose-300'}`}>
                {rsiFilterPass ? 'PASS' : 'FAIL'} · rsi {currentRsi !== null ? currentRsi.toFixed(2) : '-'} en [{rsiMin.toFixed(0)}, {rsiMax.toFixed(0)}]
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 rounded border border-slate-800 bg-slate-950/70 p-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-slate-200">Comparador entre velas (A to B)</p>
            <button
              type="button"
              onClick={clearRangeSelection}
              className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              Limpiar A/B
            </button>
          </div>

          {rangeComparison ? (
            <div className="mt-2 space-y-1 text-slate-300">
              <p>
                A: {formatTimestampFromSeconds(rangeComparison.fromTime)} @ {rangeComparison.fromPrice.toFixed(6)}
              </p>
              <p>
                B: {formatTimestampFromSeconds(rangeComparison.toTime)} @ {rangeComparison.toPrice.toFixed(6)}
              </p>
              <p className={rangeComparison.returnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                Delta: {rangeComparison.priceDelta >= 0 ? '+' : ''}
                {rangeComparison.priceDelta.toFixed(6)} · Return: {formatPct(rangeComparison.returnPct)} · Bars:{' '}
                {rangeComparison.bars}
              </p>
              <p className="text-slate-400">
                Precios A/B tomados desde la posicion del cursor al hacer click (wick/cuerpo).
              </p>
              <p className="text-slate-400">
                Referencia TP +4%: {rangeComparison.returnPct >= 4 ? 'cumple' : 'no cumple'}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-slate-400">
              Haz click en una vela para fijar A, luego click en otra para fijar B y ver el profit entre ambas.
            </p>
          )}
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          Click en una vela fija la lectura. Con dos clicks defines A/B. Tercer click inicia un nuevo rango. Markers:
          E = Entry, X+ = Exit ganador, X- = Exit perdedor.
        </p>
      </div>
    </section>
  );
}
