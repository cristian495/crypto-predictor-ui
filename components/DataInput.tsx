'use client';

import { useState } from 'react';
import { normalizeCandles } from '@/lib/normalizeCandles';
import { parseInput } from '@/lib/parseInput';
import type { Candle } from '@/lib/types';

type DataInputProps = {
  rawInput: string;
  demoText: string;
  onRawInputChange: (value: string) => void;
  onCandlesLoaded: (candles: Candle[]) => void;
};

export function DataInput({
  rawInput,
  demoText,
  onRawInputChange,
  onCandlesLoaded,
}: DataInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processRaw = (input: string, sourceLabel: string) => {
    try {
      const parsed = parseInput(input);
      const normalized = normalizeCandles(parsed);
      onCandlesLoaded(normalized);
      setError(null);
      setSuccess(`${normalized.length} velas cargadas desde ${sourceLabel}.`);
    } catch (processingError) {
      setSuccess(null);
      setError((processingError as Error).message);
    }
  };

  const handleFileLoad = async (file: File) => {
    try {
      const text = await file.text();
      onRawInputChange(text);
      processRaw(text, `archivo ${file.name}`);
    } catch (fileError) {
      setSuccess(null);
      setError(`No se pudo leer el archivo: ${(fileError as Error).message}`);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Input de Dataset</h2>
        <span className="text-xs text-slate-400">JSON / TXT / CSV</span>
      </div>

      <textarea
        value={rawInput}
        onChange={(event) => onRawInputChange(event.target.value)}
        className="h-40 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none ring-sky-500 focus:ring"
        placeholder="Pega aquí tu dataset..."
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => processRaw(rawInput, 'textarea')}
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-sky-400"
        >
          Procesar texto
        </button>

        <button
          type="button"
          onClick={() => {
            onRawInputChange(demoText);
            processRaw(demoText, 'dataset demo');
          }}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400"
        >
          Cargar demo
        </button>

        <label className="cursor-pointer rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400">
          Subir archivo
          <input
            type="file"
            accept=".json,.txt,.csv,text/csv,application/json,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileLoad(file);
              }
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Formatos soportados: array de arrays tipo Binance{' '}
        <code className="rounded bg-slate-800/70 px-1">[openTime, open, high, low, close, volume, ...]</code> y
        array de objetos{' '}
        <code className="rounded bg-slate-800/70 px-1">{'{ time, open, high, low, close, volume }'}</code>.
      </p>

      {success ? <p className="mt-2 text-xs text-emerald-400">{success}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
    </section>
  );
}
