export type DemoKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  string,
  string,
  string,
];

export function generateDemoBinanceKlines(days = 120): DemoKline[] {
  const start = Date.UTC(2024, 0, 1);
  const rows: DemoKline[] = [];
  let lastClose = 120;

  for (let i = 0; i < days; i += 1) {
    const openTime = start + i * 24 * 60 * 60 * 1000;

    const seasonal = Math.sin(i / 4) * 4 + Math.cos(i / 9) * 2;
    const trend = i * 0.03;
    let basePrice = 112 + seasonal + trend;

    // Fuerza toques recurrentes para soportes visibles.
    if (i % 11 === 0 || i % 17 === 0) {
      basePrice -= 5.2;
    }
    if (i % 29 === 0) {
      basePrice -= 8.4;
    }

    const open = lastClose + Math.sin(i * 1.7) * 0.9;
    const close = basePrice + Math.cos(i * 1.3) * 0.8;
    const high = Math.max(open, close) + 1.2 + Math.abs(Math.sin(i)) * 0.9;
    const low = Math.min(open, close) - 1.3 - Math.abs(Math.cos(i * 1.9)) * 1.1;
    const volume = 1200 + Math.round(Math.abs(Math.sin(i / 3)) * 750 + (i % 13) * 20);

    rows.push([
      openTime,
      open.toFixed(2),
      high.toFixed(2),
      low.toFixed(2),
      close.toFixed(2),
      volume.toString(),
      openTime + 24 * 60 * 60 * 1000 - 1,
      '0',
      '0',
      '0',
      '0',
      '0',
    ]);

    lastClose = close;
  }

  return rows;
}

export const DEMO_BINANCE_KLINES = generateDemoBinanceKlines();
export const DEMO_DATASET_TEXT = JSON.stringify(DEMO_BINANCE_KLINES, null, 2);
