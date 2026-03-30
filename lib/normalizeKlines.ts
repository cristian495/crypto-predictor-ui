import type { Candle } from './types';

type KlineRow = [
  number | string,
  number | string,
  number | string,
  number | string,
  number | string,
  number | string,
  ...unknown[],
];

function parseNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    throw new Error(`Campo ${fieldName} no es numérico finito`);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  throw new Error(`Campo ${fieldName} inválido`);
}

function formatDateTimeUTC(ms: number): string {
  const date = new Date(ms);
  const yyyy = date.getUTCFullYear();
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getUTCDate()}`.padStart(2, '0');
  const hh = `${date.getUTCHours()}`.padStart(2, '0');
  const min = `${date.getUTCMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function isKlineRow(value: unknown): value is KlineRow {
  return Array.isArray(value) && value.length >= 6;
}

export function normalizeKlines(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) {
    throw new Error('Respuesta de klines inválida: se esperaba un array');
  }

  const candles: Candle[] = [];

  raw.forEach((row, index) => {
    if (!isKlineRow(row)) {
      throw new Error(`Fila kline inválida en índice ${index}`);
    }

    const openTimeMs = parseNumber(row[0], 'openTime');
    const open = parseNumber(row[1], 'open');
    const high = parseNumber(row[2], 'high');
    const low = parseNumber(row[3], 'low');
    const close = parseNumber(row[4], 'close');
    const volume = parseNumber(row[5], 'volume');

    if (high < low) {
      throw new Error(`Fila kline inválida en índice ${index}: high < low`);
    }

    candles.push({
      time: formatDateTimeUTC(openTimeMs),
      timestamp: Math.floor(openTimeMs / 1000),
      open,
      high,
      low,
      close,
      volume,
    });
  });

  if (!candles.length) {
    throw new Error('No se recibieron velas en la respuesta de klines');
  }

  const dedupByTimestamp = new Map<number, Candle>();
  candles
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    .forEach((candle) => {
      if (candle.timestamp !== undefined) {
        dedupByTimestamp.set(candle.timestamp, candle);
      }
    });

  return [...dedupByTimestamp.values()].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}
