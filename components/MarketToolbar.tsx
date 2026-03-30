'use client';

type ToolbarStatus = 'idle' | 'loading' | 'loaded' | 'error';

type LastLoadedSnapshot = {
  symbol: string;
  timeframe: string;
  count: number;
  updatedAt: string;
};

type MarketToolbarProps = {
  symbol: string;
  timeframe: string;
  limit: number;
  symbolOptions: string[];
  timeframeOptions: string[];
  onChangeSymbol: (value: string) => void;
  onChangeTimeframe: (value: string) => void;
  onChangeLimit: (value: number) => void;
  onRefresh: () => void;
  onReset?: () => void;
  loading?: boolean;
  status?: ToolbarStatus;
  errorMessage?: string | null;
  lastLoaded?: LastLoadedSnapshot | null;
  minLimit?: number;
  maxLimit?: number;
};

const QUICK_LIMITS = [50, 100, 200, 500];

function getStatusBadge(status: ToolbarStatus): { text: string; className: string } {
  if (status === 'loading') {
    return {
      text: 'loading',
      className: 'border-sky-400/50 bg-sky-500/10 text-sky-300',
    };
  }

  if (status === 'loaded') {
    return {
      text: 'loaded',
      className: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300',
    };
  }

  if (status === 'error') {
    return {
      text: 'error',
      className: 'border-rose-400/50 bg-rose-500/10 text-rose-300',
    };
  }

  return {
    text: 'idle',
    className: 'border-slate-500/50 bg-slate-500/10 text-slate-300',
  };
}

export function MarketToolbar({
  symbol,
  timeframe,
  limit,
  symbolOptions,
  timeframeOptions,
  onChangeSymbol,
  onChangeTimeframe,
  onChangeLimit,
  onRefresh,
  onReset,
  loading = false,
  status = 'idle',
  errorMessage = null,
  lastLoaded = null,
  minLimit = 20,
  maxLimit = 1000,
}: MarketToolbarProps) {
  const badge = getStatusBadge(status);

  return (
    <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">Control de Mercado</h2>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase ${badge.className}`}>
          {badge.text}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.2fr_auto]">
        <label className="text-xs text-slate-300">
          <span className="mb-1 block">Símbolo</span>
          <select
            value={symbol}
            onChange={(event) => onChangeSymbol(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-sky-500 focus:ring"
            disabled={loading}
          >
            {symbolOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-300">
          <span className="mb-1 block">Timeframe</span>
          <select
            value={timeframe}
            onChange={(event) => onChangeTimeframe(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-sky-500 focus:ring"
            disabled={loading}
          >
            {timeframeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="text-xs text-slate-300">
          <span className="mb-1 block">Cantidad de velas</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={minLimit}
              max={maxLimit}
              value={limit}
              onChange={(event) => onChangeLimit(Number(event.target.value))}
              className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 outline-none ring-sky-500 focus:ring"
              disabled={loading}
            />
            <div className="flex flex-wrap gap-1">
              {QUICK_LIMITS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => onChangeLimit(quick)}
                  className={`rounded border px-2 py-1 text-[11px] ${
                    limit === quick
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-slate-600 text-slate-300 hover:border-slate-400'
                  }`}
                  disabled={loading}
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Rango permitido: {minLimit} - {maxLimit}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading || !onReset}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        {lastLoaded ? (
          <>
            <p className="text-xs text-slate-200">
              {lastLoaded.symbol} · {lastLoaded.timeframe.toUpperCase()} · {lastLoaded.count} velas
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Última actualización: {lastLoaded.updatedAt}</p>
          </>
        ) : (
          <p className="text-xs text-slate-400">Sin carga de mercado todavía.</p>
        )}

        {errorMessage ? <p className="mt-2 text-xs text-rose-400">{errorMessage}</p> : null}
      </div>
    </section>
  );
}
