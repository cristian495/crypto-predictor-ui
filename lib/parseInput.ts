import Papa from 'papaparse';

const KNOWN_HEADERS = new Set([
  'time',
  'opentime',
  'timestamp',
  'date',
  'datetime',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'o',
  'h',
  'l',
  'c',
  'v',
]);

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseInput(raw: string): unknown {
  const input = raw.trim();

  if (!input) {
    throw new Error('No hay datos para parsear.');
  }

  try {
    return JSON.parse(input);
  } catch {
    // Continuamos hacia CSV/TXT.
  }

  const headerResult = Papa.parse(input, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  const normalizedFields = (headerResult.meta.fields ?? []).map(normalizeHeader);
  const headerLooksLikeOhlcv =
    normalizedFields.some((field) => KNOWN_HEADERS.has(field)) &&
    normalizedFields.some((field) =>
      field === 'open' || field === 'o' || field === 'high' || field === 'h',
    );

  const hasHeaderData =
    Array.isArray(headerResult.data) &&
    headerResult.data.length > 0 &&
    typeof headerResult.data[0] === 'object' &&
    headerResult.meta.fields &&
    headerResult.meta.fields.length > 1;

  if (hasHeaderData && headerLooksLikeOhlcv) {
    return headerResult.data;
  }

  const rowsResult = Papa.parse(input, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  if (Array.isArray(rowsResult.data) && rowsResult.data.length > 0) {
    return rowsResult.data;
  }

  throw new Error('No se pudo parsear el texto como JSON ni como CSV/TXT válido.');
}
