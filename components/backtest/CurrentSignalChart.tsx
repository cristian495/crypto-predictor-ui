'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import { detectResistances } from '@/lib/detectResistances';
import { detectSupports } from '@/lib/detectSupports';
import type { Candle as EngineCandle } from '@/lib/backtest/types';
import type { Candle as DetectorCandle } from '@/lib/types';

type CurrentSignalChartProps = {
  symbol: string;
  candles: EngineCandle[];
  maxBars?: number;
};

const DEFAULT_MAX_BARS = 100;

function toTimestampSeconds(iso: string): number | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function toDetectorCandle(candle: EngineCandle): DetectorCandle | null {
  const ts = toTimestampSeconds(candle.timestamp);
  if (ts === null) return null;

  return {
    time: candle.timestamp,
    timestamp: ts,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

export function CurrentSignalChart({
  symbol,
  candles,
  maxBars = DEFAULT_MAX_BARS,
}: CurrentSignalChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const zoneLinesRef = useRef<IPriceLine[]>([]);

  const operationalCandles = useMemo(() => {
    const converted = candles
      .map(toDetectorCandle)
      .filter((item): item is DetectorCandle => item !== null);

    return converted.slice(-Math.max(20, maxBars));
  }, [candles, maxBars]);

  const candleData = useMemo<CandlestickData<Time>[]>(() => {
    return operationalCandles.map((candle) => ({
      time: candle.timestamp as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
  }, [operationalCandles]);

  const supports = useMemo(
    () => detectSupports(operationalCandles, { tolerancePct: 0.6, minTouches: 2, pivotWindow: 1 }),
    [operationalCandles],
  );

  const resistances = useMemo(
    () => detectResistances(operationalCandles, { tolerancePct: 0.6, minTouches: 2, pivotWindow: 1 }),
    [operationalCandles],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#cbd5e1',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)' },
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

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = series;

    return () => {
      zoneLinesRef.current.forEach((line) => {
        series.removePriceLine(line);
      });
      zoneLinesRef.current = [];

      chart.remove();

      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    candleSeriesRef.current.setData(candleData);

    if (candleData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candleData]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    zoneLinesRef.current.forEach((line) => {
      candleSeriesRef.current?.removePriceLine(line);
    });
    zoneLinesRef.current = [];

    const lines: IPriceLine[] = [];

    supports.slice(0, 3).forEach((zone, index) => {
      lines.push(
        candleSeriesRef.current!.createPriceLine({
          price: zone.midPrice,
          color: 'rgba(245, 158, 11, 0.75)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `S${index + 1}`,
        }),
      );
    });

    resistances.slice(0, 3).forEach((zone, index) => {
      lines.push(
        candleSeriesRef.current!.createPriceLine({
          price: zone.midPrice,
          color: 'rgba(244, 63, 94, 0.78)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `R${index + 1}`,
        }),
      );
    });

    zoneLinesRef.current = lines;
  }, [resistances, supports]);

  const lastClose = operationalCandles[operationalCandles.length - 1]?.close ?? null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Signal Chart Operativo · {symbol}</h3>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>{operationalCandles.length} velas</span>
          <span>·</span>
          <span>{supports.length} soportes</span>
          <span>·</span>
          <span>{resistances.length} resistencias</span>
          {lastClose !== null ? (
            <>
              <span>·</span>
              <span>Last: {formatPrice(lastClose)}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="relative h-[48vh] min-h-[320px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <div ref={containerRef} className="h-full w-full" />

        {!operationalCandles.length ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            No hay velas suficientes para construir el chart de señal actual.
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Líneas punteadas: zonas de soporte y resistencia detectadas. No se muestran setups L/S en esta vista.
      </p>
    </section>
  );
}
