'use client';

import {
  BUY_THE_DIP_CONFIG_FIELDS,
  BUY_THE_DIP_CONFIG_SNAPSHOT,
  type BuyTheDipConfigSnapshot,
  type StrategyConfigFieldDescriptor,
} from '@/lib/backtest/configTooltips';

type StrategyConfigPanelProps = {
  selectedSymbol: string;
  snapshot?: BuyTheDipConfigSnapshot;
};

const GROUP_ORDER: StrategyConfigFieldDescriptor['group'][] = [
  'Data',
  'Entry',
  'Exit',
  'Risk',
  'Filters',
  'Walkforward',
  'Universe',
];

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatScalar(
  key: keyof BuyTheDipConfigSnapshot,
  value: string | number | boolean | null,
): string {
  if (value === null) return '-';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;

  const percentKeys: Array<keyof BuyTheDipConfigSnapshot> = [
    'DIP_THRESHOLD_PCT',
    'DIP_THRESHOLD_STRONG',
    'TAKE_PROFIT_PCT',
    'STOP_LOSS_PCT',
    'DIP_EVENT_RESET_PCT',
    'FAIL_FAST_MIN_REBOUND_PCT',
    'POSITION_PCT',
    'FEE_PCT',
  ];

  if (percentKeys.includes(key)) {
    return pct(value);
  }

  if (key === 'INITIAL_CAPITAL') {
    return `$${value.toLocaleString()}`;
  }

  return `${value}`;
}

export function StrategyConfigPanel({ selectedSymbol, snapshot = BUY_THE_DIP_CONFIG_SNAPSHOT }: StrategyConfigPanelProps) {
  const selectedOverride = snapshot.SYMBOL_SIGNAL_OVERRIDES[selectedSymbol];
  const defaultThreshold = snapshot.USE_STRONG_THRESHOLD
    ? snapshot.DIP_THRESHOLD_STRONG
    : snapshot.DIP_THRESHOLD_PCT;

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="text-slate-400">Threshold activo default</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{pct(defaultThreshold)}</p>
          <p className="mt-1 text-slate-500">USE_STRONG_THRESHOLD = {snapshot.USE_STRONG_THRESHOLD ? 'true' : 'false'}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="text-slate-400">Modo</p>
          <p className="mt-1 text-sm font-semibold text-emerald-300">{snapshot.LONG_ONLY ? 'LONG ONLY' : 'LONG/SHORT'}</p>
          <p className="mt-1 text-slate-500">Timeframe {snapshot.TIMEFRAME}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="text-slate-400">Walkforward</p>
          <p className="mt-1 text-sm font-semibold text-sky-300">
            {snapshot.WF_TRAIN_MONTHS}/{snapshot.WF_TEST_MONTHS}/{snapshot.WF_STEP_MONTHS}
          </p>
          <p className="mt-1 text-slate-500">train / test / step (meses)</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="text-slate-400">Símbolos default</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{snapshot.DEFAULT_SYMBOLS.length}</p>
          <p className="mt-1 text-slate-500">Desde config.py</p>
        </div>
      </div>

      {GROUP_ORDER.map((group) => {
        const fields = BUY_THE_DIP_CONFIG_FIELDS.filter((field) => field.group === group);
        if (!fields.length) return null;

        return (
          <div key={group} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h3 className="text-sm font-semibold text-slate-100">{group}</h3>

            <div className="mt-2 space-y-2">
              {fields.map((field) => {
                const value = snapshot[field.key];
                const isArray = Array.isArray(value);
                const isObject = typeof value === 'object' && value !== null && !isArray;
                const isScalar =
                  value === null ||
                  typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean';

                return (
                  <div
                    key={field.key}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-100">{field.key}</p>
                      <span
                        className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400"
                        title={field.tooltip}
                      >
                        tooltip
                      </span>
                    </div>

                    {isScalar ? (
                      <p className="mt-1 text-slate-200">{formatScalar(field.key, value)}</p>
                    ) : null}

                    {isArray ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(value as string[]).map((item) => (
                          <span
                            key={item}
                            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {isObject ? (
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-[900px] w-full text-left text-[11px]">
                          <thead className="text-slate-400">
                            <tr>
                              <th className="px-2 py-1">Symbol</th>
                              <th className="px-2 py-1">dip_threshold</th>
                              <th className="px-2 py-1">use_rsi_filter</th>
                              <th className="px-2 py-1">use_volume_filter</th>
                              <th className="px-2 py-1">hold_timeout_hours</th>
                              <th className="px-2 py-1">max_positions</th>
                              <th className="px-2 py-1">take_profit_pct</th>
                              <th className="px-2 py-1">stop_loss_pct</th>
                              <th className="px-2 py-1">min_volume_mult</th>
                              <th className="px-2 py-1">rsi_min</th>
                              <th className="px-2 py-1">rsi_max</th>
                              <th className="px-2 py-1">one_entry_per_dip_event</th>
                              <th className="px-2 py-1">dip_event_reset_pct</th>
                              <th className="px-2 py-1">fail_fast_bars</th>
                              <th className="px-2 py-1">fail_fast_min_rebound_pct</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(value as BuyTheDipConfigSnapshot['SYMBOL_SIGNAL_OVERRIDES']).map(
                              ([symbol, override]) => {
                                const isSelected = symbol === selectedSymbol;

                                return (
                                  <tr
                                    key={symbol}
                                    className={`border-t border-slate-800 ${
                                      isSelected ? 'bg-sky-500/10 text-sky-200' : ''
                                    }`}
                                  >
                                    <td className="px-2 py-1">{symbol}</td>
                                    <td className="px-2 py-1">{pct(override.dip_threshold)}</td>
                                    <td className="px-2 py-1">{override.use_rsi_filter ? 'true' : 'false'}</td>
                                    <td className="px-2 py-1">{override.use_volume_filter ? 'true' : 'false'}</td>
                                    <td className="px-2 py-1">{override.hold_timeout_hours ?? '-'}</td>
                                    <td className="px-2 py-1">{override.max_positions ?? '-'}</td>
                                    <td className="px-2 py-1">{override.take_profit_pct !== undefined ? pct(override.take_profit_pct) : '-'}</td>
                                    <td className="px-2 py-1">{override.stop_loss_pct !== undefined ? pct(override.stop_loss_pct) : '-'}</td>
                                    <td className="px-2 py-1">{override.min_volume_mult !== undefined ? override.min_volume_mult.toFixed(2) : '-'}</td>
                                    <td className="px-2 py-1">{override.rsi_min !== undefined ? override.rsi_min : '-'}</td>
                                    <td className="px-2 py-1">{override.rsi_max !== undefined ? override.rsi_max : '-'}</td>
                                    <td className="px-2 py-1">{override.one_entry_per_dip_event !== undefined ? (override.one_entry_per_dip_event ? 'true' : 'false') : '-'}</td>
                                    <td className="px-2 py-1">{override.dip_event_reset_pct !== undefined ? pct(override.dip_event_reset_pct) : '-'}</td>
                                    <td className="px-2 py-1">{override.fail_fast_bars !== undefined && override.fail_fast_bars !== null ? override.fail_fast_bars : '-'}</td>
                                    <td className="px-2 py-1">{override.fail_fast_min_rebound_pct !== undefined ? pct(override.fail_fast_min_rebound_pct) : '-'}</td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    <p className="mt-1 text-slate-500">{field.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
        <h3 className="text-sm font-semibold text-slate-100">Override del símbolo seleccionado</h3>
        {selectedOverride ? (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <p>Symbol: {selectedSymbol}</p>
            <p className="mt-1">dip_threshold: {pct(selectedOverride.dip_threshold)}</p>
            <p className="mt-1">use_rsi_filter: {selectedOverride.use_rsi_filter ? 'true' : 'false'}</p>
            <p className="mt-1">use_volume_filter: {selectedOverride.use_volume_filter ? 'true' : 'false'}</p>
            <p className="mt-1">hold_timeout_hours: {selectedOverride.hold_timeout_hours ?? snapshot.HOLD_TIMEOUT_HOURS}</p>
            <p className="mt-1">max_positions: {selectedOverride.max_positions ?? snapshot.MAX_POSITIONS}</p>
            <p className="mt-1">take_profit_pct: {pct(selectedOverride.take_profit_pct ?? snapshot.TAKE_PROFIT_PCT)}</p>
            <p className="mt-1">stop_loss_pct: {pct(selectedOverride.stop_loss_pct ?? snapshot.STOP_LOSS_PCT)}</p>
            <p className="mt-1">min_volume_mult: {(selectedOverride.min_volume_mult ?? snapshot.MIN_VOLUME_MULT).toFixed(2)}</p>
            <p className="mt-1">rsi_min: {selectedOverride.rsi_min ?? snapshot.RSI_MIN}</p>
            <p className="mt-1">rsi_max: {selectedOverride.rsi_max ?? snapshot.RSI_MAX}</p>
            <p className="mt-1">one_entry_per_dip_event: {(selectedOverride.one_entry_per_dip_event ?? snapshot.ONE_ENTRY_PER_DIP_EVENT) ? 'true' : 'false'}</p>
            <p className="mt-1">dip_event_reset_pct: {pct(selectedOverride.dip_event_reset_pct ?? snapshot.DIP_EVENT_RESET_PCT)}</p>
            <p className="mt-1">fail_fast_bars: {selectedOverride.fail_fast_bars ?? snapshot.FAIL_FAST_BARS ?? '-'}</p>
            <p className="mt-1">
              fail_fast_min_rebound_pct: {pct(selectedOverride.fail_fast_min_rebound_pct ?? snapshot.FAIL_FAST_MIN_REBOUND_PCT)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-slate-400">No existe override en config.py para {selectedSymbol}.</p>
        )}
      </div>
    </section>
  );
}
