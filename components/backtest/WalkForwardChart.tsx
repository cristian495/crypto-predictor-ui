'use client';

import { useMemo } from 'react';
import type { WalkForwardSegment } from '@/lib/backtest/types';

type WalkForwardChartProps = {
  segments: WalkForwardSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
};

type SegmentTimeline = {
  segment: WalkForwardSegment;
  trainStartMs: number | null;
  trainEndMs: number | null;
  testStartMs: number | null;
  testEndMs: number | null;
};

function toMs(value: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toLeftWidth(
  startMs: number | null,
  endMs: number | null,
  minMs: number,
  maxMs: number,
): { left: number; width: number } {
  if (startMs === null || endMs === null || maxMs <= minMs || endMs <= startMs) {
    return { left: 0, width: 0 };
  }

  const span = maxMs - minMs;
  const left = ((startMs - minMs) / span) * 100;
  const width = ((endMs - startMs) / span) * 100;

  return { left: clampPercent(left), width: clampPercent(width) };
}

export function WalkForwardChart({ segments, selectedSegmentId, onSelectSegment }: WalkForwardChartProps) {
  const computed = useMemo(() => {
    const timeline: SegmentTimeline[] = segments.map((segment) => ({
      segment,
      trainStartMs: toMs(segment.trainStart),
      trainEndMs: toMs(segment.trainEnd),
      testStartMs: toMs(segment.testStart),
      testEndMs: toMs(segment.testEnd),
    }));

    const points = timeline.flatMap((row) => [row.trainStartMs, row.trainEndMs, row.testStartMs, row.testEndMs]);
    const validPoints = points.filter((value): value is number => value !== null);

    const minMs = validPoints.length ? Math.min(...validPoints) : 0;
    const maxMs = validPoints.length ? Math.max(...validPoints) : 1;

    return {
      timeline,
      minMs,
      maxMs,
      minLabel: validPoints.length ? new Date(minMs).toISOString().slice(0, 10) : '-',
      maxLabel: validPoints.length ? new Date(maxMs).toISOString().slice(0, 10) : '-',
    };
  }, [segments]);

  if (!segments.length) {
    return (
      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
        Walkforward disponible, pero no se encontraron segmentos para graficar.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Walkforward Timeline (TRAIN vs TEST)</h3>
        <p className="text-[11px] text-slate-400">
          {computed.minLabel} → {computed.maxLabel}
        </p>
      </div>

      <div className="space-y-2">
        {computed.timeline.map((row) => {
          const isSelected = row.segment.segmentId === selectedSegmentId;
          const train = toLeftWidth(row.trainStartMs, row.trainEndMs, computed.minMs, computed.maxMs);
          const test = toLeftWidth(row.testStartMs, row.testEndMs, computed.minMs, computed.maxMs);
          const returnPositive = row.segment.totalReturnPct >= 0;

          return (
            <button
              key={row.segment.segmentId}
              type="button"
              onClick={() => onSelectSegment(row.segment.segmentId)}
              className={`w-full rounded-lg border p-2 text-left transition ${
                isSelected
                  ? 'border-sky-400/70 bg-sky-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <p className="font-semibold text-slate-100">{row.segment.segmentId}</p>
                <p className={returnPositive ? 'text-emerald-300' : 'text-rose-300'}>
                  {returnPositive ? '+' : ''}
                  {row.segment.totalReturnPct.toFixed(2)}%
                </p>
              </div>

              <div className="mt-2 h-8 rounded border border-slate-800 bg-slate-950/70 p-1">
                <div className="relative h-full w-full">
                  {train.width > 0 ? (
                    <div
                      className="absolute bottom-0 top-0 rounded bg-indigo-400/30"
                      style={{ left: `${train.left}%`, width: `${train.width}%` }}
                    />
                  ) : null}

                  {test.width > 0 ? (
                    <div
                      className="absolute bottom-0 top-0 rounded bg-sky-400/40"
                      style={{ left: `${test.left}%`, width: `${test.width}%` }}
                    />
                  ) : null}

                  {test.width > 0 ? (
                    <div
                      className="absolute bottom-0 top-0 w-px bg-sky-200/85"
                      style={{ left: `${test.left}%` }}
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>Train: {row.segment.trainStart || '-'} → {row.segment.trainEnd || '-'}</span>
                <span>·</span>
                <span>Test: {row.segment.testStart || '-'} → {row.segment.testEnd || '-'}</span>
                <span>·</span>
                <span>Sharpe {row.segment.sharpe.toFixed(2)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-indigo-400/60" /> TRAIN
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-sky-400/70" /> TEST
        </span>
      </div>
    </section>
  );
}
