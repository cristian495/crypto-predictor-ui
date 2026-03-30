import type { PivotPoint, PriceZone, PriceZoneKind } from './types';

type PivotGroup = {
  pivots: PivotPoint[];
  min: number;
  max: number;
  mid: number;
};

function recalcGroup(group: PivotGroup): PivotGroup {
  const prices = group.pivots.map((pivot) => pivot.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const mid = (min + max) / 2;
  return { ...group, min, max, mid };
}

function pivotWithinTolerance(pivotPrice: number, midPrice: number, tolerancePct: number): boolean {
  const tolerance = (midPrice * tolerancePct) / 100;
  return Math.abs(pivotPrice - midPrice) <= tolerance;
}

export function clusterPriceZones(
  pivots: PivotPoint[],
  tolerancePct: number,
  kind: PriceZoneKind,
): PriceZone[] {
  if (!pivots.length) {
    return [];
  }

  const safeTolerancePct = Math.max(tolerancePct, 0.01);
  const sortedByPrice = [...pivots].sort((a, b) => a.price - b.price);
  const groups: PivotGroup[] = [];

  sortedByPrice.forEach((pivot) => {
    let bestGroupIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    groups.forEach((group, groupIndex) => {
      if (!pivotWithinTolerance(pivot.price, group.mid, safeTolerancePct)) {
        return;
      }

      const distance = Math.abs(pivot.price - group.mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestGroupIndex = groupIndex;
      }
    });

    if (bestGroupIndex === -1) {
      groups.push({
        pivots: [pivot],
        min: pivot.price,
        max: pivot.price,
        mid: pivot.price,
      });
      return;
    }

    groups[bestGroupIndex].pivots.push(pivot);
    groups[bestGroupIndex] = recalcGroup(groups[bestGroupIndex]);
  });

  const provisionalZones = groups.map((group, idx) => {
    const uniqueDates = [...new Set(group.pivots.map((pivot) => pivot.time))].sort();
    const touchIndexes = [...new Set(group.pivots.map((pivot) => pivot.index))].sort((a, b) => a - b);

    const adaptiveHalfBand = Math.max(
      (group.mid * safeTolerancePct) / 100 / 2,
      (group.max - group.min) / 2,
      0.0000001,
    );

    const minPrice = group.mid - adaptiveHalfBand;
    const maxPrice = group.mid + adaptiveHalfBand;
    const lastTouchDate = uniqueDates[uniqueDates.length - 1] ?? '1970-01-01';

    return {
      id: `${kind}-${idx + 1}`,
      kind,
      minPrice,
      maxPrice,
      midPrice: group.mid,
      touches: group.pivots.length,
      touchDates: uniqueDates,
      touchIndexes,
      lastTouchTimestamp: Date.parse(lastTouchDate),
    };
  });

  const minTimestamp = Math.min(...provisionalZones.map((zone) => zone.lastTouchTimestamp));
  const maxTimestamp = Math.max(...provisionalZones.map((zone) => zone.lastTouchTimestamp));
  const range = Math.max(maxTimestamp - minTimestamp, 1);

  return provisionalZones
    .map((zone) => {
      const recencyBonus = ((zone.lastTouchTimestamp - minTimestamp) / range) * 10;
      return {
        id: zone.id,
        kind: zone.kind,
        minPrice: zone.minPrice,
        maxPrice: zone.maxPrice,
        midPrice: zone.midPrice,
        touches: zone.touches,
        touchDates: zone.touchDates,
        touchIndexes: zone.touchIndexes,
        score: zone.touches * 10 + recencyBonus,
      } satisfies PriceZone;
    })
    .sort((a, b) => b.score - a.score || b.touches - a.touches || b.midPrice - a.midPrice);
}
