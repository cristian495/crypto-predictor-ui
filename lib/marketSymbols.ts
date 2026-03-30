export const DEFAULT_SYMBOL_OPTIONS = [
  'XRPUSDT',
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'DOGEUSDT',
  'ADAUSDT',
] as const;

export type MarketSymbol = (typeof DEFAULT_SYMBOL_OPTIONS)[number];
export const DEFAULT_MARKET_SYMBOL: MarketSymbol = 'XRPUSDT';
