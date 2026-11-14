import { z } from 'zod';

// ── Schemas (downtrend.latest.json, export minimo) ────────────────────────────
const conditionSchema = z
  .object({ name: z.string(), passed: z.boolean(), detail: z.string() })
  .passthrough();

const candleSchema = z
  .object({
    timestamp: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nullable().optional(),
  })
  .passthrough();

const historicalSignalSchema = z
  .object({
    timestamp: z.string(),
    signal: z.enum(['SHORT', 'NO_SIGNAL']),
    close: z.number(),
    ret_24h_pct: z.number(),
    ret_6h_pct: z.number().optional(),
    adx14: z.number().nullable().optional(),
    atr_pct_rank_90d: z.number().nullable().optional(),
    relative_volume_20: z.number().nullable().optional(),
    donchian_low: z.number().nullable().optional(),
    regime_bearish: z.boolean().optional(),
    probability: z.number().nullable().optional(),
    entry_reason: z.string().nullable().optional(),
    conditions: z.array(conditionSchema).optional(),
  })
  .passthrough();

const currentSignalSchema = z
  .object({
    signal: z.enum(['SHORT', 'NO_SIGNAL']),
    timestamp: z.string(),
    close: z.number(),
    ret_24h_pct: z.number(),
    adx14: z.number().nullable().optional(),
    regime_bearish: z.boolean().optional(),
    blocked_by: z.string().nullable().optional(),
    conditions: z.array(conditionSchema).optional(),
    entry_reason: z.string().nullable().optional(),
  })
  .passthrough();

const symbolResultSchema = z
  .object({
    symbol: z.string(),
    candles: z.array(candleSchema),
    historicalSignals: z.array(historicalSignalSchema),
    currentSignal: currentSignalSchema,
    signalParams: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();

export const downtrendArtifactSchema = z
  .object({
    schemaVersion: z.string(),
    strategy: z.string(),
    source: z.string(),
    runId: z.string(),
    generatedAt: z.string(),
    symbolResults: z.array(symbolResultSchema),
  })
  .passthrough();

// ── Tipos de dominio ──────────────────────────────────────────────────────────
export type DowntrendCondition = { name: string; passed: boolean; detail: string };
export type DowntrendCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};
export type DowntrendHistoricalSignal = z.infer<typeof historicalSignalSchema>;
export type DowntrendCurrentSignal = z.infer<typeof currentSignalSchema>;
export type DowntrendSymbolResult = {
  symbol: string;
  candles: DowntrendCandle[];
  historicalSignals: DowntrendHistoricalSignal[];
  currentSignal: DowntrendCurrentSignal;
  signalParams?: Record<string, number>;
};
export type DowntrendRun = {
  runId: string;
  generatedAt: string;
  symbolResults: DowntrendSymbolResult[];
};

const DEFAULT_BASE_URL = '/data/downtrend_breakout';

function getBaseUrl(): string {
  const raw = String(
    import.meta.env.VITE_DOWNTREND_DATA_BASE_URL ?? DEFAULT_BASE_URL,
  ).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_BASE_URL;
}

export type DowntrendPageData = {
  data?: DowntrendRun;
  message?: string;
  baseUrl: string;
};

/** Carga downtrend.latest.json. Devuelve undefined con mensaje si no existe aun (404). */
export async function loadDowntrendData(): Promise<DowntrendPageData> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/downtrend.latest.json`;
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) {
      if (resp.status === 404) {
        return { baseUrl, message: 'Aún no hay datos de downtrend. Ejecuta el export en el worker.' };
      }
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }
    const json = await resp.json();
    const parsed = downtrendArtifactSchema.safeParse(json);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join(' | ');
      throw new Error(`downtrend.latest.json inválido: ${detail}`);
    }
    return {
      baseUrl,
      data: {
        runId: parsed.data.runId,
        generatedAt: parsed.data.generatedAt,
        symbolResults: parsed.data.symbolResults as DowntrendSymbolResult[],
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'error desconocido';
    return { baseUrl, message: `No se pudo cargar downtrend: ${reason}` };
  }
}
