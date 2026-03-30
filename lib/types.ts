export type Candle = {
  time: string; // YYYY-MM-DD o YYYY-MM-DD HH:mm (UTC)
  timestamp?: number; // unix timestamp en segundos, opcional para series intradía
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PivotPoint = {
  index: number;
  time: string;
  price: number;
};

export type PivotLow = PivotPoint;
export type PivotHigh = PivotPoint;

export type PriceZoneKind = 'support' | 'resistance';

export type PriceZone = {
  id: string;
  kind: PriceZoneKind;
  minPrice: number;
  maxPrice: number;
  midPrice: number;
  touches: number;
  touchDates: string[];
  score: number;
  touchIndexes?: number[];
};

export type SupportZone = PriceZone & { kind: 'support' };
export type ResistanceZone = PriceZone & { kind: 'resistance' };

export type DetectorOptions = {
  tolerancePct: number;
  minTouches: number;
  pivotWindow: number;
};

export type ConfirmationMode = 'aggressive' | 'balanced' | 'conservative';

export type LongSetupStatus = 'candidate' | 'confirmed' | 'invalid';

export type LongSetup = {
  id: string;
  candleIndex: number;
  time: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice?: number;
  rr?: number;
  supportZoneId: string;
  resistanceZoneId?: string;
  rejectionScore: number;
  confirmationScore: number;
  contextScore: number;
  rrScore: number;
  totalScore: number;
  tags: string[];
  status: LongSetupStatus;
};

export type LongDetectionOptions = {
  supportProximityPct: number;
  rejectionThreshold: number;
  minRR: number;
  stopBufferPct: number;
  confirmationMode: ConfirmationMode;
  requirePullback: boolean;
  pullbackLookback: number;
};

export type ShortSetupStatus = 'candidate' | 'confirmed' | 'strong_confirmed' | 'invalid';
export type SetupQuality = 'A' | 'B' | 'C';

export type ShortSetup = {
  id: string;
  candleIndex: number;
  time: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice?: number;
  rr?: number;
  resistanceZoneId: string;
  supportZoneId?: string;
  rejectionScore: number;
  confirmationScore: number;
  contextScore: number;
  rrScore: number;
  totalScore: number;
  tags: string[];
  status: ShortSetupStatus;
  quality: SetupQuality;
};

export type ShortDetectionOptions = {
  resistanceProximityPct: number;
  rejectionThreshold: number;
  minRR: number;
  stopBufferPct: number;
  confirmationMode: ConfirmationMode;
  requireRally: boolean;
  rallyLookback: number;
  requireBreakPreviousLow?: boolean;
};
