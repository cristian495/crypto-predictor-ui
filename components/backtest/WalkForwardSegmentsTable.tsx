'use client';

import type { WalkForwardSegment } from '@/lib/backtest/types';

type WalkForwardSegmentsTableProps = {
  segments: WalkForwardSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
};

function formatDate(value: string): string {
  if (!value) return '-';
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return value;
}

export function WalkForwardSegmentsTable({
  segments,
  selectedSegmentId,
  onSelectSegment,
}: WalkForwardSegmentsTableProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Segmentos Walkforward</h3>
        <p className="text-[11px] text-slate-400">Click para seleccionar un segmento</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-xs">
          <thead className="bg-slate-950/70 text-slate-300">
            <tr>
              <th className="px-3 py-2 font-semibold">Segment</th>
              <th className="px-3 py-2 font-semibold">Train Start</th>
              <th className="px-3 py-2 font-semibold">Train End</th>
              <th className="px-3 py-2 font-semibold">Test Start</th>
              <th className="px-3 py-2 font-semibold">Test End</th>
              <th className="px-3 py-2 font-semibold">Return</th>
              <th className="px-3 py-2 font-semibold">Sharpe</th>
              <th className="px-3 py-2 font-semibold">Win Rate</th>
              <th className="px-3 py-2 font-semibold">Trades</th>
            </tr>
          </thead>

          <tbody>
            {!segments.length ? (
              <tr className="border-t border-slate-800 bg-slate-950/20">
                <td className="px-3 py-3 text-slate-400" colSpan={9}>
                  No hay segmentos disponibles para este símbolo.
                </td>
              </tr>
            ) : null}

            {segments.map((segment) => {
              const isSelected = selectedSegmentId === segment.segmentId;

              return (
                <tr
                  key={segment.segmentId}
                  onClick={() => onSelectSegment(segment.segmentId)}
                  className={`cursor-pointer border-t border-slate-800 transition ${
                    isSelected
                      ? 'bg-sky-500/15 ring-1 ring-inset ring-sky-400/60'
                      : 'bg-slate-950/20 hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-slate-100">{segment.segmentId}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDate(segment.trainStart)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDate(segment.trainEnd)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDate(segment.testStart)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDate(segment.testEnd)}</td>
                  <td className={`px-3 py-2 font-medium ${segment.totalReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {segment.totalReturnPct >= 0 ? '+' : ''}
                    {segment.totalReturnPct.toFixed(2)}%
                  </td>
                  <td className={`px-3 py-2 font-medium ${segment.sharpe >= 0 ? 'text-sky-300' : 'text-rose-300'}`}>
                    {segment.sharpe.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{segment.winRatePct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-slate-300">{segment.trades}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
