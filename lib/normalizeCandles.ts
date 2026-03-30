import { z } from 'zod';
import type { Candle } from './types';

const CandleSchema = z
  .object({
    time: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    open: z.number().finite(),
    high: z.number().finite(),
    low: z.number().finite(),
    close: z.number().finite(),
    volume: z.number().finite().optional(),
  })
  .refine((candle) => candle.high >= candle.low, {
    message: 'high debe ser mayor o igual a low',
  });

function parseNumeric(value: unknown, fieldName: string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Campo ${fieldName} inválido: ${String(value)}`);
    }
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '');
    if (!normalized) {
      throw new Error(`Campo ${fieldName} vacío`);
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Campo ${fieldName} no numérico: ${value}`);
    }
    return parsed;
  }

  throw new Error(`Campo ${fieldName} inválido: ${String(value)}`);
}

function formatDateUTC(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getUTCDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeTime(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'string') {
    const maybeNumber = typeof value === 'number' ? value : Number(value.trim());

    if (Number.isFinite(maybeNumber)) {
      // Heurística: epoch en ms o en segundos.
      const ms = maybeNumber > 1e11 ? maybeNumber : maybeNumber * 1000;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) {
        return formatDateUTC(date);
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }

      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) {
        return formatDateUTC(date);
      }
    }
  }

  throw new Error(`No se pudo normalizar el campo time: ${String(value)}`);
}

function extractRows(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (
    input &&
    typeof input === 'object' &&
    'data' in input &&
    Array.isArray((input as { data: unknown[] }).data)
  ) {
    return (input as { data: unknown[] }).data;
  }

  throw new Error('El dataset debe ser un array o un objeto con propiedad data[]');
}

function normalizeKey(rawKey: string): string {
  return rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickValue(record: Record<string, unknown>, aliases: string[]): unknown {
  const normalizedMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    normalizedMap.set(normalizeKey(key), value);
  }

  for (const alias of aliases) {
    const value = normalizedMap.get(alias);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizeObjectRow(row: Record<string, unknown>): Candle {
  const timeValue = pickValue(row, ['time', 'opentime', 'timestamp', 'date', 'datetime']);
  const openValue = pickValue(row, ['open', 'o']);
  const highValue = pickValue(row, ['high', 'h']);
  const lowValue = pickValue(row, ['low', 'l']);
  const closeValue = pickValue(row, ['close', 'c']);
  const volumeValue = pickValue(row, ['volume', 'vol', 'v']);

  const candle: Candle = {
    time: normalizeTime(timeValue),
    open: parseNumeric(openValue, 'open'),
    high: parseNumeric(highValue, 'high'),
    low: parseNumeric(lowValue, 'low'),
    close: parseNumeric(closeValue, 'close'),
    volume: volumeValue === undefined ? undefined : parseNumeric(volumeValue, 'volume'),
  };

  return CandleSchema.parse(candle);
}

function normalizeArrayRow(row: unknown[]): Candle {
  if (row.length < 5) {
    throw new Error('Fila tipo array inválida: se esperaban al menos 5 columnas');
  }

  const timeValue = row[0];
  const openValue = row[1];
  const highValue = row[2];
  const lowValue = row[3];
  const closeValue = row[4];
  const volumeValue = row[5];

  const candle: Candle = {
    time: normalizeTime(timeValue),
    open: parseNumeric(openValue, 'open'),
    high: parseNumeric(highValue, 'high'),
    low: parseNumeric(lowValue, 'low'),
    close: parseNumeric(closeValue, 'close'),
    volume: volumeValue === undefined ? undefined : parseNumeric(volumeValue, 'volume'),
  };

  return CandleSchema.parse(candle);
}

export function normalizeCandles(input: unknown): Candle[] {
  const rows = extractRows(input);
  const candles: Candle[] = [];
  const parseErrors: string[] = [];

  rows.forEach((row, rowIndex) => {
    try {
      if (Array.isArray(row)) {
        candles.push(normalizeArrayRow(row));
        return;
      }

      if (row && typeof row === 'object') {
        candles.push(normalizeObjectRow(row as Record<string, unknown>));
        return;
      }

      throw new Error('Formato de fila no soportado');
    } catch (error) {
      parseErrors.push(`Fila ${rowIndex + 1}: ${(error as Error).message}`);
    }
  });

  if (!candles.length) {
    const detail = parseErrors.slice(0, 3).join(' | ');
    throw new Error(`No se pudieron normalizar velas. ${detail}`);
  }

  // Se ordena por fecha y se conserva la última vela si hay duplicados de día.
  const byDate = new Map<string, Candle>();
  candles
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((candle) => byDate.set(candle.time, candle));

  return [...byDate.values()].sort((a, b) => a.time.localeCompare(b.time));
}
