import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartPanel } from '@/components/ChartPanel';
import { InfoTooltip } from '@/components/InfoTooltip';
import { LongSetupsPanel } from '@/components/LongSetupsPanel';
import { MarketToolbar } from '@/components/MarketToolbar';
import { ShortSetupsPanel } from '@/components/ShortSetupsPanel';
import { SupportsPanel } from '@/components/SupportsPanel';
import { detectLongSetups } from '@/lib/detectLongSetups';
import { detectResistances } from '@/lib/detectResistances';
import { detectShortSetups } from '@/lib/detectShortSetups';
import { detectSupports } from '@/lib/detectSupports';
import { MAX_CANDLE_LIMIT, MIN_CANDLE_LIMIT, fetchCandles } from '@/lib/fetchCandles';
import { findImmediateResistance } from '@/lib/findImmediateResistance';
import { DEFAULT_MARKET_SYMBOL, DEFAULT_SYMBOL_OPTIONS } from '@/lib/marketSymbols';
import { DEFAULT_TIMEFRAME, DEFAULT_TIMEFRAME_OPTIONS, type MarketTimeframe } from '@/lib/timeframes';
import type { Candle, ConfirmationMode } from '@/lib/types';

type MarketStatus = 'idle' | 'loading' | 'loaded' | 'error';

type LastMarketLoad = {
  symbol: string;
  timeframe: string;
  count: number;
  updatedAt: string;
};

const DEFAULT_CANDLE_LIMIT = 100;

export default function App() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(DEFAULT_MARKET_SYMBOL);
  const [selectedTimeframe, setSelectedTimeframe] = useState<MarketTimeframe>(DEFAULT_TIMEFRAME);
  const [selectedLimit, setSelectedLimit] = useState<number>(DEFAULT_CANDLE_LIMIT);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('idle');
  const [marketError, setMarketError] = useState<string | null>(null);
  const [lastMarketLoad, setLastMarketLoad] = useState<LastMarketLoad | null>(null);
  const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
  const [selectedResistanceId, setSelectedResistanceId] = useState<string | null>(null);
  const [selectedLongSetupId, setSelectedLongSetupId] = useState<string | null>(null);
  const [selectedShortSetupId, setSelectedShortSetupId] = useState<string | null>(null);

  const [tolerancePct, setTolerancePct] = useState<number>(0.6);
  const [minTouches, setMinTouches] = useState<number>(2);
  const [pivotWindow, setPivotWindow] = useState<number>(1);
  const [showSupports, setShowSupports] = useState<boolean>(true);
  const [showResistances, setShowResistances] = useState<boolean>(true);
  const [showLongSetups, setShowLongSetups] = useState<boolean>(true);
  const [showShortSetups, setShowShortSetups] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode>('balanced');
  const [rejectionThreshold, setRejectionThreshold] = useState<number>(0.35);
  const [supportProximityPct, setSupportProximityPct] = useState<number>(0.25);
  const [minRR, setMinRR] = useState<number>(1.4);
  const [stopBufferPct, setStopBufferPct] = useState<number>(0.15);
  const [requirePullback, setRequirePullback] = useState<boolean>(true);
  const [pullbackLookback, setPullbackLookback] = useState<number>(6);
  const [shortConfirmationMode, setShortConfirmationMode] = useState<ConfirmationMode>('balanced');
  const [shortRejectionThreshold, setShortRejectionThreshold] = useState<number>(0.35);
  const [resistanceProximityPct, setResistanceProximityPct] = useState<number>(0.25);
  const [shortMinRR, setShortMinRR] = useState<number>(1.4);
  const [shortStopBufferPct, setShortStopBufferPct] = useState<number>(0.15);
  const [requireRally, setRequireRally] = useState<boolean>(true);
  const [rallyLookback, setRallyLookback] = useState<number>(6);
  const [requireBreakPreviousLow, setRequireBreakPreviousLow] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<'detector' | 'long' | 'short' | 'error' | null>(
    null,
  );

  const supports = useMemo(
    () =>
      detectSupports(candles, {
        tolerancePct,
        minTouches,
        pivotWindow,
      }),
    [candles, minTouches, pivotWindow, tolerancePct],
  );

  const resistances = useMemo(
    () =>
      detectResistances(candles, {
        tolerancePct,
        minTouches,
        pivotWindow,
      }),
    [candles, minTouches, pivotWindow, tolerancePct],
  );

  const longSetups = useMemo(
    () =>
      detectLongSetups(candles, supports, resistances, {
        supportProximityPct,
        rejectionThreshold,
        minRR,
        stopBufferPct,
        confirmationMode,
        requirePullback,
        pullbackLookback,
      }),
    [
      candles,
      confirmationMode,
      minRR,
      pullbackLookback,
      rejectionThreshold,
      requirePullback,
      resistances,
      stopBufferPct,
      supportProximityPct,
      supports,
    ],
  );

  const shortSetups = useMemo(
    () =>
      detectShortSetups(candles, supports, resistances, {
        resistanceProximityPct,
        rejectionThreshold: shortRejectionThreshold,
        minRR: shortMinRR,
        stopBufferPct: shortStopBufferPct,
        confirmationMode: shortConfirmationMode,
        requireRally,
        rallyLookback,
        requireBreakPreviousLow,
      }),
    [
      candles,
      rallyLookback,
      requireBreakPreviousLow,
      requireRally,
      resistanceProximityPct,
      resistances,
      shortConfirmationMode,
      shortMinRR,
      shortRejectionThreshold,
      shortStopBufferPct,
      supports,
    ],
  );

  const currentPrice = candles[candles.length - 1]?.close ?? null;
  const immediateResistance = useMemo(
    () => findImmediateResistance(currentPrice, resistances),
    [currentPrice, resistances],
  );

  useEffect(() => {
    if (selectedSupportId && !supports.some((support) => support.id === selectedSupportId)) {
      setSelectedSupportId(null);
    }
  }, [selectedSupportId, supports]);

  useEffect(() => {
    if (selectedResistanceId && !resistances.some((zone) => zone.id === selectedResistanceId)) {
      setSelectedResistanceId(null);
    }
  }, [resistances, selectedResistanceId]);

  useEffect(() => {
    if (selectedLongSetupId && !longSetups.some((setup) => setup.id === selectedLongSetupId)) {
      setSelectedLongSetupId(null);
    }
  }, [longSetups, selectedLongSetupId]);

  useEffect(() => {
    if (selectedShortSetupId && !shortSetups.some((setup) => setup.id === selectedShortSetupId)) {
      setSelectedShortSetupId(null);
    }
  }, [selectedShortSetupId, shortSetups]);

  const clampLimit = (value: number): number => {
    if (!Number.isFinite(value)) return DEFAULT_CANDLE_LIMIT;
    return Math.max(MIN_CANDLE_LIMIT, Math.min(MAX_CANDLE_LIMIT, Math.floor(value)));
  };

  const clearSelections = () => {
    setSelectedSupportId(null);
    setSelectedResistanceId(null);
    setSelectedLongSetupId(null);
    setSelectedShortSetupId(null);
  };

  const refreshMarketCandles = async (params?: {
    symbol?: string;
    timeframe?: string;
    limit?: number;
  }) => {
    const symbol = (params?.symbol ?? selectedSymbol).trim().toUpperCase();
    const timeframe = (params?.timeframe ?? selectedTimeframe) as MarketTimeframe;
    const limit = clampLimit(params?.limit ?? selectedLimit);

    setMarketStatus('loading');
    setMarketError(null);

    try {
      const marketCandles = await fetchCandles(symbol, timeframe, limit);
      setCandles(marketCandles);
      clearSelections();
      setMarketStatus('loaded');
      setLastMarketLoad({
        symbol,
        timeframe,
        count: marketCandles.length,
        updatedAt: new Date().toLocaleString(),
      });
    } catch (error) {
      setMarketStatus('error');
      setMarketError((error as Error).message || 'No se pudo cargar el mercado');
    }
  };

  useEffect(() => {
    void refreshMarketCandles({
      symbol: DEFAULT_MARKET_SYMBOL,
      timeframe: DEFAULT_TIMEFRAME,
      limit: DEFAULT_CANDLE_LIMIT,
    });
    // Solo carga inicial automática una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyConfigBlock = async (kind: 'detector' | 'long' | 'short') => {
    const payload =
      kind === 'detector'
        ? {
            tolerancePct,
            minTouches,
            pivotWindow,
            showSupports,
            showResistances,
            showLongSetups,
            showShortSetups,
            showVolume,
          }
        : kind === 'long'
          ? {
            supportProximityPct,
            rejectionThreshold,
            minRR,
            stopBufferPct,
            confirmationMode,
            requirePullback,
            pullbackLookback,
          }
          : {
            resistanceProximityPct,
            rejectionThreshold: shortRejectionThreshold,
            minRR: shortMinRR,
            stopBufferPct: shortStopBufferPct,
            confirmationMode: shortConfirmationMode,
            requireRally,
            rallyLookback,
            requireBreakPreviousLow,
          };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedConfig(kind);
      setTimeout(() => {
        setCopiedConfig((prev) => (prev === kind ? null : prev));
      }, 1500);
    } catch {
      setCopiedConfig('error');
      setTimeout(() => {
        setCopiedConfig((prev) => (prev === 'error' ? null : prev));
      }, 1500);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1650px] p-4 md:p-6">
      <section className="mb-4 flex justify-end">
        <Link
          to="/strategies/buy-the-dip"
          className="inline-flex items-center rounded-lg border border-sky-400/70 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/25"
        >
          Ir a Estrategia Buy-the-Dip
        </Link>
      </section>

      <MarketToolbar
        symbol={selectedSymbol}
        timeframe={selectedTimeframe}
        limit={selectedLimit}
        symbolOptions={[...DEFAULT_SYMBOL_OPTIONS]}
        timeframeOptions={[...DEFAULT_TIMEFRAME_OPTIONS]}
        minLimit={MIN_CANDLE_LIMIT}
        maxLimit={MAX_CANDLE_LIMIT}
        status={marketStatus}
        loading={marketStatus === 'loading'}
        errorMessage={marketError}
        lastLoaded={lastMarketLoad}
        onChangeSymbol={setSelectedSymbol}
        onChangeTimeframe={(value) => setSelectedTimeframe(value as MarketTimeframe)}
        onChangeLimit={(value) => setSelectedLimit(clampLimit(value))}
        onRefresh={() => void refreshMarketCandles()}
        onReset={() => {
          setSelectedSymbol(DEFAULT_MARKET_SYMBOL);
          setSelectedTimeframe(DEFAULT_TIMEFRAME);
          setSelectedLimit(DEFAULT_CANDLE_LIMIT);
          setMarketStatus('idle');
          setMarketError(null);
          void refreshMarketCandles({
            symbol: DEFAULT_MARKET_SYMBOL,
            timeframe: DEFAULT_TIMEFRAME,
            limit: DEFAULT_CANDLE_LIMIT,
          });
        }}
      />

      <div className="grid grid-cols-1 gap-4">
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/40 p-3 md:p-4">
          <ChartPanel
            candles={candles}
            supports={supports}
            resistances={resistances}
            longSetups={longSetups}
            shortSetups={shortSetups}
            showSupports={showSupports}
            showResistances={showResistances}
            showLongSetups={showLongSetups}
            showShortSetups={showShortSetups}
            showVolume={showVolume}
            selectedSupportId={selectedSupportId}
            selectedResistanceId={selectedResistanceId}
            selectedLongSetupId={selectedLongSetupId}
            selectedShortSetupId={selectedShortSetupId}
          />
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">Configuración Detector</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyConfigBlock('detector')}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-slate-400"
                >
                  {copiedConfig === 'detector' ? 'Copiado' : 'Copiar'}
                </button>
                {copiedConfig === 'error' ? (
                  <span className="text-[11px] text-rose-400">No se pudo copiar</span>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Tolerancia % ({tolerancePct.toFixed(2)}%)</span>
                  <InfoTooltip text="Define qué tan cerca (en porcentaje) deben estar los pivots para agruparse en una misma zona. Más alto: zonas más amplias y menos estrictas. Más bajo: zonas más precisas pero más exigentes." />
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={tolerancePct}
                  onChange={(event) => setTolerancePct(Number(event.target.value))}
                  className="w-full accent-sky-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-300">
                  <span className="mb-1 flex items-center gap-1.5">
                    <span>Mínimo de Toques</span>
                    <InfoTooltip text="Cantidad mínima de veces que una zona fue tocada para ser mostrada. Si subes este valor, filtras zonas débiles o con poco historial." />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minTouches}
                    onChange={(event) => setMinTouches(Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-sky-500 focus:ring"
                  />
                </label>

                <label className="block text-xs text-slate-300">
                  <span className="mb-1 flex items-center gap-1.5">
                    <span>Pivot Window</span>
                    <InfoTooltip text="Número de velas vecinas usadas para confirmar un pivot low/high local. Más alto = pivots más estrictos y menos señales." />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={pivotWindow}
                    onChange={(event) => setPivotWindow(Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-sky-500 focus:ring"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showSupports}
                  onChange={(event) => setShowSupports(event.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span>Mostrar soportes</span>
                  <InfoTooltip text="Activa o desactiva la visualización de zonas de soporte detectadas en el gráfico." />
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showResistances}
                  onChange={(event) => setShowResistances(event.target.checked)}
                  className="h-4 w-4 accent-rose-400"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span>Mostrar resistencias</span>
                  <InfoTooltip text="Activa o desactiva la visualización de zonas de resistencia detectadas en el gráfico." />
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showLongSetups}
                  onChange={(event) => setShowLongSetups(event.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span>Mostrar LONG setups</span>
                  <InfoTooltip text="Muestra u oculta las señales LONG detectadas automáticamente sobre el gráfico." />
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showShortSetups}
                  onChange={(event) => setShowShortSetups(event.target.checked)}
                  className="h-4 w-4 accent-rose-500"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span>Mostrar SHORT setups</span>
                  <InfoTooltip text="Muestra u oculta las señales SHORT detectadas automáticamente sobre el gráfico." />
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(event) => setShowVolume(event.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span>Mostrar volumen</span>
                  <InfoTooltip text="Muestra u oculta el histograma de volumen en la parte inferior del chart." />
                </span>
              </label>
            </div>

            <div className="my-4 h-px bg-slate-800" />

            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Configuración Long Setups
              </h3>
              <button
                type="button"
                onClick={() => void copyConfigBlock('long')}
                className="rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-slate-400"
              >
                {copiedConfig === 'long' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Support proximity %</span>
                  <InfoTooltip text="Indica qué tan cerca debe estar la vela de un soporte para considerarla candidata a LONG. Más alto = más setups; más bajo = setups más estrictos." />
                </span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.05}
                  value={supportProximityPct}
                  onChange={(event) => setSupportProximityPct(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-emerald-500 focus:ring"
                />
              </label>

              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Rejection threshold</span>
                  <InfoTooltip text="Mínimo de fuerza de rechazo (mecha inferior respecto al rango total) para validar rebote alcista en soporte." />
                </span>
                <input
                  type="number"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={rejectionThreshold}
                  onChange={(event) => setRejectionThreshold(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-emerald-500 focus:ring"
                />
              </label>

              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Min RR</span>
                  <InfoTooltip text="Relación riesgo/beneficio mínima requerida. Si el setup no alcanza este RR contra la resistencia objetivo, se descarta. >2 Excelente. 1.5–2 Bueno. <1.5 Meh" />
                </span>
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={minRR}
                  onChange={(event) => setMinRR(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-emerald-500 focus:ring"
                />
              </label>

              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Stop buffer %</span>
                  <InfoTooltip text="Margen extra debajo del soporte para colocar el stop. Más alto = stop más holgado (menos barridas, más riesgo por trade)." />
                </span>
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={0.05}
                  value={stopBufferPct}
                  onChange={(event) => setStopBufferPct(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-emerald-500 focus:ring"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs text-slate-300">
              <span className="mb-1 flex items-center gap-1.5">
                <span>Confirmation mode</span>
                <InfoTooltip text="aggressive: entra con soporte + rechazo. balanced: añade cierre alcista. conservative: además exige cierre por encima de la vela previa." />
              </span>
              <select
                value={confirmationMode}
                onChange={(event) => setConfirmationMode(event.target.value as ConfirmationMode)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-emerald-500 focus:ring"
              >
                <option value="aggressive">aggressive</option>
                <option value="balanced">balanced</option>
                <option value="conservative">conservative</option>
              </select>
            </label>

            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={requirePullback}
                onChange={(event) => setRequirePullback(event.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              <span className="inline-flex items-center gap-1.5">
                <span>Requerir contexto de pullback</span>
                <InfoTooltip text="Si está activo, solo acepta setups cuando hay contexto previo de caída/retroceso, evitando señales fuera de contexto." />
              </span>
            </label>

            <label className="mt-3 block text-xs text-slate-300">
              <span className="mb-1 flex items-center gap-1.5">
                <span>Pullback lookback</span>
                <InfoTooltip text="Cantidad de velas que se revisan hacia atrás para evaluar si hubo pullback antes del posible LONG." />
              </span>
              <input
                type="number"
                min={2}
                max={30}
                value={pullbackLookback}
                onChange={(event) => setPullbackLookback(Number(event.target.value))}
                disabled={!requirePullback}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-emerald-500 focus:ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <div className="my-4 h-px bg-slate-800" />

            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Configuración Short Setups
              </h3>
              <button
                type="button"
                onClick={() => void copyConfigBlock('short')}
                className="rounded-lg border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-slate-400"
              >
                {copiedConfig === 'short' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Resistance proximity %</span>
                  <InfoTooltip text="Qué tan cerca debe estar la vela de una resistencia para considerar SHORT. Más alto = más señales; más bajo = mayor precisión." />
                </span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.05}
                  value={resistanceProximityPct}
                  onChange={(event) => setResistanceProximityPct(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-rose-500 focus:ring"
                />
              </label>

              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Rejection threshold</span>
                  <InfoTooltip text="Mínimo de fuerza de rechazo (mecha superior respecto al rango) para validar rechazo bajista en resistencia." />
                </span>
                <input
                  type="number"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={shortRejectionThreshold}
                  onChange={(event) => setShortRejectionThreshold(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-rose-500 focus:ring"
                />
              </label>

              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Min RR</span>
                  <InfoTooltip text="Relación riesgo/beneficio mínima para SHORT. Si no alcanza el umbral, el setup se descarta." />
                </span>
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={shortMinRR}
                  onChange={(event) => setShortMinRR(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-rose-500 focus:ring"
                />
              </label>

              <label className="block text-xs text-slate-300">
                <span className="mb-1 flex items-center gap-1.5">
                  <span>Stop buffer %</span>
                  <InfoTooltip text="Margen extra por encima de la resistencia para ubicar el stop de SHORT." />
                </span>
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={0.05}
                  value={shortStopBufferPct}
                  onChange={(event) => setShortStopBufferPct(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-rose-500 focus:ring"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs text-slate-300">
              <span className="mb-1 flex items-center gap-1.5">
                <span>Confirmation mode</span>
                <InfoTooltip text="aggressive: resistencia + rechazo. balanced: añade close < open. conservative: además close < close previo." />
              </span>
              <select
                value={shortConfirmationMode}
                onChange={(event) => setShortConfirmationMode(event.target.value as ConfirmationMode)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-rose-500 focus:ring"
              >
                <option value="aggressive">aggressive</option>
                <option value="balanced">balanced</option>
                <option value="conservative">conservative</option>
              </select>
            </label>

            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={requireRally}
                onChange={(event) => setRequireRally(event.target.checked)}
                className="h-4 w-4 accent-rose-500"
              />
              <span className="inline-flex items-center gap-1.5">
                <span>Requerir contexto de rally</span>
                <InfoTooltip text="Si está activo, exige subida previa antes del rechazo en resistencia para evitar shorts fuera de contexto." />
              </span>
            </label>

            <label className="mt-3 block text-xs text-slate-300">
              <span className="mb-1 flex items-center gap-1.5">
                <span>Rally lookback</span>
                <InfoTooltip text="Cantidad de velas hacia atrás para evaluar si hubo rally previo al posible SHORT." />
              </span>
              <input
                type="number"
                min={2}
                max={30}
                value={rallyLookback}
                onChange={(event) => setRallyLookback(Number(event.target.value))}
                disabled={!requireRally}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-rose-500 focus:ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={requireBreakPreviousLow}
                onChange={(event) => setRequireBreakPreviousLow(event.target.checked)}
                className="h-4 w-4 accent-rose-500"
              />
              <span className="inline-flex items-center gap-1.5">
                <span>Exigir ruptura de previous low</span>
                <InfoTooltip text="Activa un filtro más estricto: para confirmar SHORT exige cierre por debajo del low previo." />
              </span>
            </label>

            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs">
              <p className="font-semibold text-slate-100">Resistencia inmediata</p>
              {immediateResistance ? (
                <>
                  <p className="mt-1 text-slate-300">
                    Zona: {immediateResistance.minPrice.toFixed(3)} - {immediateResistance.maxPrice.toFixed(3)}
                  </p>
                  <p className="mt-0.5 text-slate-400">
                    Mid: {immediateResistance.midPrice.toFixed(3)} | Toques: {immediateResistance.touches}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-slate-400">No hay una resistencia por encima del precio actual.</p>
              )}
            </div>
          </section>

          <SupportsPanel
            title="Soportes Detectados"
            kind="support"
            zones={supports}
            selectedZoneId={selectedSupportId}
            onSelectZone={(zoneId) => {
              setSelectedSupportId(zoneId);
              setSelectedResistanceId(null);
              setSelectedLongSetupId(null);
              setSelectedShortSetupId(null);
            }}
          />

          <SupportsPanel
            title="Resistencias Detectadas"
            kind="resistance"
            zones={resistances}
            selectedZoneId={selectedResistanceId}
            onSelectZone={(zoneId) => {
              setSelectedResistanceId(zoneId);
              setSelectedSupportId(null);
              setSelectedLongSetupId(null);
              setSelectedShortSetupId(null);
            }}
          />

          <LongSetupsPanel
            setups={longSetups}
            selectedSetupId={selectedLongSetupId}
            currentPrice={currentPrice}
            onSelectSetup={(setupId) => {
              setSelectedLongSetupId(setupId);
              setSelectedShortSetupId(null);

              if (!setupId) {
                return;
              }

              const selectedSetup = longSetups.find((setup) => setup.id === setupId);
              if (!selectedSetup) {
                return;
              }

              setSelectedSupportId(selectedSetup.supportZoneId);
              setSelectedResistanceId(selectedSetup.resistanceZoneId ?? null);
            }}
          />

          <ShortSetupsPanel
            setups={shortSetups}
            selectedSetupId={selectedShortSetupId}
            currentPrice={currentPrice}
            onSelectSetup={(setupId) => {
              setSelectedShortSetupId(setupId);
              setSelectedLongSetupId(null);

              if (!setupId) {
                return;
              }

              const selectedSetup = shortSetups.find((setup) => setup.id === setupId);
              if (!selectedSetup) {
                return;
              }

              setSelectedResistanceId(selectedSetup.resistanceZoneId);
              setSelectedSupportId(selectedSetup.supportZoneId ?? null);
            }}
          />
        </aside>
      </div>
    </main>
  );
}
