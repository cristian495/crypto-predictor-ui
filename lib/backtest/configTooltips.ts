export type BuyTheDipSymbolOverride = {
  dip_threshold: number;
  use_rsi_filter: boolean;
  use_volume_filter: boolean;
  hold_timeout_hours?: number;
  max_positions?: number;
  take_profit_pct?: number;
  stop_loss_pct?: number;
  min_volume_mult?: number;
  rsi_min?: number;
  rsi_max?: number;
  one_entry_per_dip_event?: boolean;
  dip_event_reset_pct?: number;
  fail_fast_bars?: number | null;
  fail_fast_min_rebound_pct?: number;
};

export type BuyTheDipConfigSnapshot = {
  TIMEFRAME: string;
  DAYS: number;
  DIP_THRESHOLD_PCT: number;
  DIP_THRESHOLD_STRONG: number;
  USE_STRONG_THRESHOLD: boolean;
  DIP_LOOKBACK_HOURS: number;
  TAKE_PROFIT_PCT: number;
  STOP_LOSS_PCT: number;
  HOLD_TIMEOUT_HOURS: number;
  ONE_ENTRY_PER_DIP_EVENT: boolean;
  DIP_EVENT_RESET_PCT: number;
  FAIL_FAST_BARS: number | null;
  FAIL_FAST_MIN_REBOUND_PCT: number;
  POSITION_PCT: number;
  MAX_POSITIONS: number;
  INITIAL_CAPITAL: number;
  FEE_PCT: number;
  MIN_VOLUME_MULT: number;
  RSI_MIN: number;
  RSI_MAX: number;
  USE_VOLUME_FILTER: boolean;
  USE_RSI_FILTER: boolean;
  LONG_ONLY: boolean;
  WF_TRAIN_MONTHS: number;
  WF_TEST_MONTHS: number;
  WF_STEP_MONTHS: number;
  DEFAULT_SYMBOLS: string[];
  SYMBOL_SIGNAL_OVERRIDES: Record<string, BuyTheDipSymbolOverride>;
};

export type StrategyConfigFieldDescriptor = {
  key: keyof BuyTheDipConfigSnapshot;
  description: string;
  tooltip: string;
  group: 'Data' | 'Entry' | 'Exit' | 'Risk' | 'Filters' | 'Walkforward' | 'Universe';
};

// Confirmed values copied from Predictor/buy_the_dip/config.py
export const BUY_THE_DIP_CONFIG_SNAPSHOT: BuyTheDipConfigSnapshot = {
  TIMEFRAME: '1h',
  DAYS: 365,
  DIP_THRESHOLD_PCT: -0.05,
  DIP_THRESHOLD_STRONG: -0.07,
  USE_STRONG_THRESHOLD: true,
  DIP_LOOKBACK_HOURS: 24,
  TAKE_PROFIT_PCT: 0.04,
  STOP_LOSS_PCT: 0.2,
  HOLD_TIMEOUT_HOURS: 24,
  ONE_ENTRY_PER_DIP_EVENT: false,
  DIP_EVENT_RESET_PCT: -0.04,
  FAIL_FAST_BARS: null,
  FAIL_FAST_MIN_REBOUND_PCT: 0.01,
  POSITION_PCT: 0.2,
  MAX_POSITIONS: 2,
  INITIAL_CAPITAL: 10000,
  FEE_PCT: 0.001,
  MIN_VOLUME_MULT: 0.5,
  RSI_MIN: 10,
  RSI_MAX: 40,
  USE_VOLUME_FILTER: false,
  USE_RSI_FILTER: false,
  LONG_ONLY: true,
  WF_TRAIN_MONTHS: 6,
  WF_TEST_MONTHS: 2,
  WF_STEP_MONTHS: 2,
  DEFAULT_SYMBOLS: [
    'SUI/USDT',
    'ADA/USDT',
    'XRP/USDT',
    'INJ/USDT',
    'LINK/USDT',
    'BNB/USDT',
    'POL/USDT',
    'DOGE/USDT',
    'BTC/USDT',
    'AVAX/USDT',
    'SOL/USDT',
  ],
  SYMBOL_SIGNAL_OVERRIDES: {
    'SUI/USDT': { dip_threshold: -0.07, use_rsi_filter: true, use_volume_filter: false },
    'BNB/USDT': { dip_threshold: -0.05, use_rsi_filter: false, use_volume_filter: true },
    'DOGE/USDT': { dip_threshold: -0.05, use_rsi_filter: true, use_volume_filter: true },
    'ADA/USDT': { dip_threshold: -0.06, use_rsi_filter: false, use_volume_filter: true },
    'XRP/USDT': {
      dip_threshold: -0.055,
      use_rsi_filter: true,
      use_volume_filter: true,
      hold_timeout_hours: 27,
      max_positions: 4,
      take_profit_pct: 0.04,
      stop_loss_pct: 0.2,
      min_volume_mult: 0.6,
      rsi_min: 25,
      rsi_max: 60,
      one_entry_per_dip_event: false,
      dip_event_reset_pct: -0.04,
      fail_fast_bars: null,
      fail_fast_min_rebound_pct: 0.01,
    },
    'LINK/USDT': { dip_threshold: -0.07, use_rsi_filter: false, use_volume_filter: false },
    'POL/USDT': { dip_threshold: -0.08, use_rsi_filter: false, use_volume_filter: true },
    'AVAX/USDT': { dip_threshold: -0.08, use_rsi_filter: false, use_volume_filter: true },
    'SOL/USDT': { dip_threshold: -0.08, use_rsi_filter: false, use_volume_filter: true },
    'INJ/USDT': { dip_threshold: -0.08, use_rsi_filter: false, use_volume_filter: true },
    'BTC/USDT': { dip_threshold: -0.07, use_rsi_filter: true, use_volume_filter: false },
  },
};

export const BUY_THE_DIP_CONFIG_FIELDS: StrategyConfigFieldDescriptor[] = [
  {
    key: 'TIMEFRAME',
    description: 'Resolución de vela utilizada por señales y backtest.',
    tooltip: 'Equivale al TIMEFRAME del motor Python para descarga y cómputo.',
    group: 'Data',
  },
  {
    key: 'DAYS',
    description: 'Cantidad de días históricos a descargar.',
    tooltip: 'Define el rango temporal total analizado por símbolo.',
    group: 'Data',
  },
  {
    key: 'DIP_THRESHOLD_PCT',
    description: 'Umbral base de caída para disparar un dip.',
    tooltip: 'El dip se evalúa con past_return de 24h contra este nivel.',
    group: 'Entry',
  },
  {
    key: 'DIP_THRESHOLD_STRONG',
    description: 'Umbral más estricto para señales de mayor calidad.',
    tooltip: 'Cuando está activo, reemplaza el umbral base por uno más profundo.',
    group: 'Entry',
  },
  {
    key: 'USE_STRONG_THRESHOLD',
    description: 'Activa el umbral fuerte como default.',
    tooltip: 'Controla cuál threshold se usa antes de overrides por símbolo.',
    group: 'Entry',
  },
  {
    key: 'DIP_LOOKBACK_HOURS',
    description: 'Ventana de lookback usada para calcular past_return.',
    tooltip: 'Se calcula como pct_change del close en este número de horas.',
    group: 'Entry',
  },
  {
    key: 'TAKE_PROFIT_PCT',
    description: 'Take profit porcentual para salida.',
    tooltip: 'Nivel de salida objetivo para posiciones LONG abiertas.',
    group: 'Exit',
  },
  {
    key: 'STOP_LOSS_PCT',
    description: 'Stop loss porcentual de protección.',
    tooltip: 'Nivel de pérdida máxima por trade antes de cerrar posición.',
    group: 'Exit',
  },
  {
    key: 'HOLD_TIMEOUT_HOURS',
    description: 'Salida por tiempo máximo en posición.',
    tooltip: 'Si no toca TP/SL, la posición se cierra al cumplir este timeout.',
    group: 'Exit',
  },
  {
    key: 'ONE_ENTRY_PER_DIP_EVENT',
    description: 'Permite solo una entrada por evento de dip.',
    tooltip: 'Evita apilar múltiples entradas consecutivas dentro del mismo evento de caída.',
    group: 'Entry',
  },
  {
    key: 'DIP_EVENT_RESET_PCT',
    description: 'Umbral para resetear el evento de dip.',
    tooltip: 'Cuando past_return sube por encima de este valor, se habilita un nuevo evento de dip.',
    group: 'Entry',
  },
  {
    key: 'FAIL_FAST_BARS',
    description: 'Cierre temprano si no rebota en N velas.',
    tooltip: 'Si está activo y no hay rebote mínimo tras N velas, se cierra con exit_reason=fail_fast.',
    group: 'Exit',
  },
  {
    key: 'FAIL_FAST_MIN_REBOUND_PCT',
    description: 'Rebote mínimo exigido por fail-fast.',
    tooltip: 'Porcentaje mínimo de rebote intratrade para evitar salida temprana fail_fast.',
    group: 'Exit',
  },
  {
    key: 'POSITION_PCT',
    description: 'Fracción de capital asignada por trade.',
    tooltip: 'Tamaño de posición aplicado al abrir cada señal LONG.',
    group: 'Risk',
  },
  {
    key: 'MAX_POSITIONS',
    description: 'Número máximo de posiciones simultáneas.',
    tooltip: 'Limita exposición agregada cuando hay señales consecutivas.',
    group: 'Risk',
  },
  {
    key: 'INITIAL_CAPITAL',
    description: 'Capital inicial para simulación.',
    tooltip: 'Base de equity para métricas del backtest.',
    group: 'Risk',
  },
  {
    key: 'FEE_PCT',
    description: 'Fee por lado aplicado a cada operación.',
    tooltip: 'Se descuenta en entrada y salida para pnl_after_fees.',
    group: 'Risk',
  },
  {
    key: 'MIN_VOLUME_MULT',
    description: 'Mínimo de volumen relativo para habilitar entradas.',
    tooltip: 'Compara volumen actual versus media para validar liquidez.',
    group: 'Filters',
  },
  {
    key: 'RSI_MIN',
    description: 'Límite inferior de RSI para el filtro.',
    tooltip: 'Evita comprar en escenarios de pánico extremo si el filtro está activo.',
    group: 'Filters',
  },
  {
    key: 'RSI_MAX',
    description: 'Límite superior de RSI para el filtro.',
    tooltip: 'Restringe entradas a contexto relativamente sobrevendido.',
    group: 'Filters',
  },
  {
    key: 'USE_VOLUME_FILTER',
    description: 'Activa/desactiva filtro de volumen global.',
    tooltip: 'Puede ser reemplazado por overrides por símbolo.',
    group: 'Filters',
  },
  {
    key: 'USE_RSI_FILTER',
    description: 'Activa/desactiva filtro RSI global.',
    tooltip: 'Puede ser reemplazado por overrides por símbolo.',
    group: 'Filters',
  },
  {
    key: 'LONG_ONLY',
    description: 'Modo de trading solo LONG.',
    tooltip: 'La estrategia buy_the_dip no abre shorts en el motor actual.',
    group: 'Risk',
  },
  {
    key: 'WF_TRAIN_MONTHS',
    description: 'Meses de warmup/train para cada ventana walkforward.',
    tooltip: 'Usado para inicializar indicadores antes del tramo de test.',
    group: 'Walkforward',
  },
  {
    key: 'WF_TEST_MONTHS',
    description: 'Meses del tramo de test por ventana walkforward.',
    tooltip: 'Define el tamaño de cada bloque out-of-sample.',
    group: 'Walkforward',
  },
  {
    key: 'WF_STEP_MONTHS',
    description: 'Paso entre ventanas sucesivas de walkforward.',
    tooltip: 'Controla cuánto se desplaza la ventana en cada iteración.',
    group: 'Walkforward',
  },
  {
    key: 'DEFAULT_SYMBOLS',
    description: 'Universo por defecto validado para scanner/walkforward.',
    tooltip: 'Lista de símbolos sobre los que corre el pipeline multi-símbolo.',
    group: 'Universe',
  },
  {
    key: 'SYMBOL_SIGNAL_OVERRIDES',
    description: 'Overrides por simbolo para threshold, filtros y gestion de posicion/TP/SL.',
    tooltip: 'Permite personalizar sensibilidad, filtros y niveles de salida por activo.',
    group: 'Universe',
  },
];
