'use client';

import { useEffect, useMemo, useState } from 'react';
import { BacktestCandlesChart } from '@/components/backtest/BacktestCandlesChart';
import { BacktestStatsCards } from '@/components/backtest/BacktestStatsCards';
import { FuturesRealityPanel } from '@/components/backtest/FuturesRealityPanel';
import { PortfolioPanel } from '@/components/backtest/PortfolioPanel';
import { LiveSignalsPanel } from '@/components/backtest/LiveSignalsPanel';
import { BacktestSummaryTable } from '@/components/backtest/BacktestSummaryTable';
import { CurrentSignalChart } from '@/components/backtest/CurrentSignalChart';
import { CurrentSignalPanel } from '@/components/backtest/CurrentSignalPanel';
import { SymbolStatsPanel } from '@/components/backtest/SymbolStatsPanel';
import { WalkForwardChart } from '@/components/backtest/WalkForwardChart';
import { WalkForwardSegmentsTable } from '@/components/backtest/WalkForwardSegmentsTable';
import { WalkForwardSummaryCards } from '@/components/backtest/WalkForwardSummaryCards';
import { BacktestTabs, type BacktestTabKey } from '@/components/backtest/BacktestTabs';
import { StrategyConfigPanel } from '@/components/strategy/StrategyConfigPanel';
import { StrategyHeader } from '@/components/strategy/StrategyHeader';
import {
  BUY_THE_DIP_CONFIG_SNAPSHOT,
  type BuyTheDipConfigSnapshot,
} from '@/lib/backtest/configTooltips';
import { loadBuyTheDipPageData } from '@/lib/backtest/dataLoader';
import { mockStrategyRunData, mockWalkForwardRunData } from '@/lib/backtest/mockData';
import type { LiveRun, PortfolioRun, StrategyRun, WalkForwardRun } from '@/lib/backtest/types';

export default function BuyTheDipPage() {
  const [strategyRunData, setStrategyRunData] = useState<StrategyRun>(mockStrategyRunData);
  const [walkForwardData, setWalkForwardData] = useState<WalkForwardRun | undefined>(mockWalkForwardRunData);
  const [portfolioData, setPortfolioData] = useState<PortfolioRun | undefined>(undefined);
  const [liveData, setLiveData] = useState<LiveRun | undefined>(undefined);
  const [configSnapshot, setConfigSnapshot] = useState<BuyTheDipConfigSnapshot>(BUY_THE_DIP_CONFIG_SNAPSHOT);
  const [activeDataMode, setActiveDataMode] = useState<'mock' | 'json'>('mock');
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [dataBaseUrl, setDataBaseUrl] = useState<string | undefined>(undefined);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    mockStrategyRunData.symbolResults[0]?.symbol ?? '',
  );
  const [selectedTab, setSelectedTab] = useState<BacktestTabKey>('summary');
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const symbolOptions = useMemo(
    () => strategyRunData.symbolResults.map((result) => result.symbol),
    [strategyRunData.symbolResults],
  );

  const selectedBacktest = useMemo(
    () => strategyRunData.symbolResults.find((result) => result.symbol === selectedSymbol),
    [selectedSymbol, strategyRunData.symbolResults],
  );

  const selectedWalkForward = useMemo(
    () => walkForwardData?.symbolResults.find((result) => result.symbol === selectedSymbol),
    [selectedSymbol, walkForwardData?.symbolResults],
  );

  const activeSymbolConfig = useMemo(() => {
    const override = strategyRunData.config.symbolOverrides[selectedSymbol];
    return {
      useVolumeFilter: override?.useVolumeFilter ?? strategyRunData.config.useVolumeFilter,
      useRsiFilter: override?.useRsiFilter ?? strategyRunData.config.useRsiFilter,
      minVolumeMult: override?.minVolumeMult ?? strategyRunData.config.minVolumeMult,
      rsiMin: override?.rsiMin ?? strategyRunData.config.rsiMin,
      rsiMax: override?.rsiMax ?? strategyRunData.config.rsiMax,
    };
  }, [
    selectedSymbol,
    strategyRunData.config.minVolumeMult,
    strategyRunData.config.rsiMax,
    strategyRunData.config.rsiMin,
    strategyRunData.config.symbolOverrides,
    strategyRunData.config.useRsiFilter,
    strategyRunData.config.useVolumeFilter,
  ]);

  const hasWalkForwardData = selectedWalkForward?.status === 'available';
  const hasPortfolioData = portfolioData?.status === 'available';
  const hasLiveData = Boolean(liveData && (liveData.resolved > 0 || liveData.open > 0));
  const selectedTrade =
    selectedBacktest?.trades.find((trade) => trade.id === selectedTradeId) ?? null;
  const selectedSegments = selectedWalkForward?.segments ?? [];
  const selectedSegment =
    selectedSegments.find((segment) => segment.segmentId === selectedSegmentId) ?? null;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsDataLoading(true);
      try {
        const payload = await loadBuyTheDipPageData();
        if (cancelled) return;

        setStrategyRunData(payload.strategyRunData);
        setWalkForwardData(payload.walkForwardData);
        setPortfolioData(payload.portfolioData);
        setLiveData(payload.liveData);
        setConfigSnapshot(payload.configSnapshot);
        setActiveDataMode(payload.resolvedMode);
        setDataMessage(payload.message ?? null);
        setDataBaseUrl(payload.dataBaseUrl);
      } catch (error) {
        if (cancelled) return;
        const reason = error instanceof Error ? error.message : 'unknown error';
        setDataMessage(`Error cargando buy_the_dip: ${reason}`);
      } finally {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const symbols = strategyRunData.symbolResults.map((result) => result.symbol);
    if (!symbols.length) {
      setSelectedSymbol('');
      return;
    }

    if (!symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0]);
    }
  }, [selectedSymbol, strategyRunData.symbolResults]);

  useEffect(() => {
    setSelectedTradeId(null);
    setSelectedSegmentId(null);
  }, [selectedSymbol]);

  useEffect(() => {
    if (!selectedSegments.length) {
      setSelectedSegmentId(null);
      return;
    }

    if (selectedSegmentId && selectedSegments.some((segment) => segment.segmentId === selectedSegmentId)) {
      return;
    }

    setSelectedSegmentId(selectedSegments[0]?.segmentId ?? null);
  }, [selectedSegmentId, selectedSegments]);

  return (
    <main className="mx-auto w-full max-w-[1300px] space-y-4 p-4 md:p-6">
      <StrategyHeader
        title="Buy-the-Dip Strategy"
        description="Workspace para visualizar backtest, señal actual y walkforward consumiendo JSON estructurado o mock fallback."
        selectedSymbol={selectedSymbol}
        symbolOptions={symbolOptions}
        runId={strategyRunData.runId}
        generatedAt={strategyRunData.generatedAt}
        source={strategyRunData.source}
        onSelectSymbol={setSelectedSymbol}
      />

      <BacktestTabs
        selectedTab={selectedTab}
        onChangeTab={setSelectedTab}
        hasWalkForwardData={Boolean(hasWalkForwardData)}
        hasPortfolioData={Boolean(hasPortfolioData)}
        hasLiveData={hasLiveData}
      />

      <section
        className={`rounded-lg border px-3 py-2 text-xs ${
          dataMessage
            ? 'border-amber-500/50 bg-amber-500/10 text-amber-100'
            : 'border-slate-800 bg-slate-900/70 text-slate-300'
        }`}
      >
        <p>
          Fuente activa: <span className="font-semibold">{activeDataMode === 'json' ? 'JSON real' : 'mock data'}</span>
          {dataBaseUrl ? <span className="text-slate-400"> · {dataBaseUrl}</span> : null}
          {isDataLoading ? <span className="ml-2 text-slate-400">cargando...</span> : null}
        </p>
        {dataMessage ? <p className="mt-1">{dataMessage}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        {selectedBacktest || selectedTab === 'portfolio' || selectedTab === 'live' ? null : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
            No hay resultado disponible para el símbolo seleccionado.
          </div>
        )}

        {selectedTab === 'summary' ? (
          <div className="space-y-4">
            <BacktestStatsCards strategyRunData={strategyRunData} walkForwardData={walkForwardData} />
            <BacktestSummaryTable
              strategyRunData={strategyRunData}
              walkForwardData={walkForwardData}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
            />
          </div>
        ) : null}

        {selectedBacktest && selectedTab === 'backtest-chart' ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Backtest Chart</h2>
            <div className="grid grid-cols-1 gap-4">
              <BacktestCandlesChart
                symbol={selectedBacktest.symbol}
                candles={selectedBacktest.candles}
                historicalSignals={selectedBacktest.historicalSignals}
                trades={selectedBacktest.trades}
                selectedTradeId={selectedTradeId}
                onSelectTradeId={setSelectedTradeId}
                minVolumeMult={activeSymbolConfig.minVolumeMult}
                useVolumeFilter={activeSymbolConfig.useVolumeFilter}
                useRsiFilter={activeSymbolConfig.useRsiFilter}
                rsiMin={activeSymbolConfig.rsiMin}
                rsiMax={activeSymbolConfig.rsiMax}
              />

              <FuturesRealityPanel
                symbol={selectedBacktest.symbol}
                futuresReality={selectedBacktest.futuresReality}
              />

              <SymbolStatsPanel
                symbolResult={selectedBacktest}
                config={strategyRunData.config}
                selectedTrade={selectedTrade}
              />
            </div>
          </div>
        ) : null}

        {selectedBacktest && selectedTab === 'current-signal' ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Señal Actual</h2>
            <div className="grid grid-cols-1 gap-4">
              <CurrentSignalChart
                symbol={selectedBacktest.symbol}
                candles={selectedBacktest.candles}
                maxBars={100}
              />

              <CurrentSignalPanel
                symbol={selectedBacktest.symbol}
                signal={selectedBacktest.currentSignal}
                timeframe={strategyRunData.config.timeframe}
                lookbackHours={strategyRunData.config.lookbackHours}
              />
            </div>
          </div>
        ) : null}

        {selectedTab === 'portfolio' ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Cartera (capital compartido)</h2>
            <PortfolioPanel portfolio={portfolioData} />
          </div>
        ) : null}

        {selectedTab === 'live' ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Validación en vivo (paper trading)
            </h2>
            <LiveSignalsPanel live={liveData} />
          </div>
        ) : null}

        {selectedBacktest && selectedTab === 'walkforward' ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Walkforward</h2>
            {hasWalkForwardData && selectedWalkForward ? (
              <>
                <WalkForwardSummaryCards symbolResult={selectedWalkForward} />

                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                  {selectedWalkForward.summary}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <WalkForwardChart
                    segments={selectedSegments}
                    selectedSegmentId={selectedSegmentId}
                    onSelectSegment={setSelectedSegmentId}
                  />

                  <aside className="space-y-3">
                    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                      <h3 className="text-sm font-semibold text-slate-100">Detalle del Segmento</h3>
                      {selectedSegment ? (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium text-slate-100">{selectedSegment.segmentId}</p>
                          <p>Train: {selectedSegment.trainStart || '-'} → {selectedSegment.trainEnd || '-'}</p>
                          <p>Test: {selectedSegment.testStart || '-'} → {selectedSegment.testEnd || '-'}</p>
                          <p className={selectedSegment.totalReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                            Return: {selectedSegment.totalReturnPct >= 0 ? '+' : ''}
                            {selectedSegment.totalReturnPct.toFixed(2)}%
                          </p>
                          <p>Sharpe: {selectedSegment.sharpe.toFixed(2)}</p>
                          <p>Win Rate: {selectedSegment.winRatePct.toFixed(1)}%</p>
                          <p>Trades: {selectedSegment.trades}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-slate-400">Selecciona un segmento para ver detalle.</p>
                      )}
                    </section>

                    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                      <h3 className="text-sm font-semibold text-slate-100">Trades Detail</h3>
                      {selectedSegment?.tradesDetail?.length ? (
                        <div className="mt-2 space-y-2">
                          {selectedSegment.tradesDetail.map((trade) => (
                            <div
                              key={trade.tradeId}
                              className="rounded-lg border border-slate-800 bg-slate-950/60 p-2"
                            >
                              <p className="font-medium text-slate-100">{trade.tradeId}</p>
                              <p className="mt-1">Entry: {trade.entryTime} @ {trade.entryPrice.toFixed(6)}</p>
                              <p className="mt-1">Exit: {trade.exitTime} @ {trade.exitPrice.toFixed(6)}</p>
                              <p className={trade.pnlPct >= 0 ? 'mt-1 text-emerald-300' : 'mt-1 text-rose-300'}>
                                PnL: {trade.pnlPct >= 0 ? '+' : ''}
                                {trade.pnlPct.toFixed(2)}%
                              </p>
                              <p className="mt-1 text-slate-400">Exit reason: {trade.exitReason ?? '-'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-slate-400">
                          No hay `tradesDetail` para este segmento en la fuente actual.
                        </p>
                      )}
                    </section>
                  </aside>
                </div>

                <WalkForwardSegmentsTable
                  segments={selectedSegments}
                  selectedSegmentId={selectedSegmentId}
                  onSelectSegment={setSelectedSegmentId}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                Walkforward no disponible para {selectedSymbol}. Esta sección ya está preparada para estado vacío.
              </div>
            )}
          </div>
        ) : null}

        {selectedBacktest && selectedTab === 'configuration' ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Configuración</h2>
            <StrategyConfigPanel selectedSymbol={selectedSymbol} snapshot={configSnapshot} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
