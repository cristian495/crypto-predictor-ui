'use client';

export type BacktestTabKey =
  | 'summary'
  | 'backtest-chart'
  | 'current-signal'
  | 'portfolio'
  | 'walkforward'
  | 'configuration';

type BacktestTabsProps = {
  selectedTab: BacktestTabKey;
  onChangeTab: (tab: BacktestTabKey) => void;
  hasWalkForwardData: boolean;
  hasPortfolioData: boolean;
};

type TabOption = {
  key: BacktestTabKey;
  label: string;
  helper?: string;
};

const TAB_OPTIONS: TabOption[] = [
  { key: 'summary', label: 'Resumen' },
  { key: 'backtest-chart', label: 'Backtest Chart' },
  { key: 'current-signal', label: 'Señal Actual' },
  { key: 'portfolio', label: 'Cartera' },
  { key: 'walkforward', label: 'Walkforward' },
  { key: 'configuration', label: 'Configuración' },
];

export function BacktestTabs({ selectedTab, onChangeTab, hasWalkForwardData, hasPortfolioData }: BacktestTabsProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => {
          const isSelected = tab.key === selectedTab;
          const isWalkForward = tab.key === 'walkforward';
          const isPortfolio = tab.key === 'portfolio';
          const statusLabel =
            (isWalkForward && !hasWalkForwardData) || (isPortfolio && !hasPortfolioData)
              ? 'sin datos'
              : null;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeTab(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                  : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span>{tab.label}</span>
              {statusLabel ? <span className="ml-2 text-[10px] text-slate-400">{statusLabel}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
