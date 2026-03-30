import type { SupportZone } from './types';

export function findNearestSupportBelow(price: number, supports: SupportZone[]): SupportZone | null {
  if (!Number.isFinite(price)) {
    return null;
  }

  return (
    [...supports]
      .filter((zone) => zone.midPrice < price)
      .sort((a, b) => b.midPrice - a.midPrice)[0] ?? null
  );
}
