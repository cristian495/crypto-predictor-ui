import type { ResistanceZone } from './types';

export function findNearestResistanceAbove(
  price: number,
  resistances: ResistanceZone[],
): ResistanceZone | null {
  if (!Number.isFinite(price)) {
    return null;
  }

  return (
    [...resistances]
      .filter((zone) => zone.midPrice > price)
      .sort((a, b) => a.midPrice - b.midPrice)[0] ?? null
  );
}
