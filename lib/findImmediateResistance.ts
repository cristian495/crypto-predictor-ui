import type { ResistanceZone } from './types';
import { findNearestResistanceAbove } from './findNearestResistanceAbove';

export function findImmediateResistance(
  currentPrice: number | null,
  resistances: ResistanceZone[],
): ResistanceZone | null {
  if (currentPrice === null || !Number.isFinite(currentPrice)) {
    return null;
  }

  return findNearestResistanceAbove(currentPrice, resistances);
}
