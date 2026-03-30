import { normalizeKlines } from './normalizeKlines';
import type { Candle } from './types';

export const MIN_CANDLE_LIMIT = 20;
export const MAX_CANDLE_LIMIT = 1000;

const BINANCE_KLINES_URLS = [
  'https://data-api.binance.vision/api/v3/klines',
  'https://api.binance.com/api/v3/klines',
];

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 100;
  return Math.max(MIN_CANDLE_LIMIT, Math.min(MAX_CANDLE_LIMIT, Math.floor(limit)));
}

async function requestKlines(baseUrl: string, symbol: string, interval: string, limit: number): Promise<unknown> {
  const url = new URL(baseUrl);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { msg?: string };
      detail = body?.msg ? `: ${body.msg}` : '';
    } catch {
      // no-op
    }
    throw new Error(`HTTP ${response.status}${detail}`);
  }

  return response.json();
}

export async function fetchCandles(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) {
    throw new Error('Símbolo inválido');
  }

  const normalizedInterval = interval.trim();
  if (!normalizedInterval) {
    throw new Error('Timeframe inválido');
  }

  const safeLimit = clampLimit(limit);
  let lastError: Error | null = null;

  for (const baseUrl of BINANCE_KLINES_URLS) {
    try {
      const raw = await requestKlines(baseUrl, normalizedSymbol, normalizedInterval, safeLimit);
      return normalizeKlines(raw);
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new Error(lastError?.message ?? 'No se pudieron cargar velas desde Binance');
}
