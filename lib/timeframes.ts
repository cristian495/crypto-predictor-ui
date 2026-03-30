export const DEFAULT_TIMEFRAME_OPTIONS = ['15m', '1h', '4h', '1d', '1w'] as const;

export type MarketTimeframe = (typeof DEFAULT_TIMEFRAME_OPTIONS)[number];
export const DEFAULT_TIMEFRAME: MarketTimeframe = '1d';
