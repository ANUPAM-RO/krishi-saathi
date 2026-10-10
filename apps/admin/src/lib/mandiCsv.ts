import { PRICE_UNITS, type PriceUnit } from '@krishi/shared';
import Papa from 'papaparse';
import type { MandiPriceImportRow } from './types';

export const REQUIRED_COLUMNS = ['mandiName', 'district', 'state', 'cropCode', 'price', 'priceDate'] as const;
export const OPTIONAL_COLUMNS = ['minPrice', 'maxPrice', 'unit'] as const;
export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
export const MAX_IMPORT_ROWS = 2000;

export interface ParsedRow {
  /** 1-based line number in the CSV file (header is line 1). */
  line: number;
  raw: Record<string, string>;
  row: MandiPriceImportRow | null;
  errors: string[];
  warnings: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  /** Problems with the file as a whole (missing columns, too many rows, parse errors). */
  fileErrors: string[];
  unknownColumns: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Accepts "1,234.50" or "₹1234" and returns a number, or NaN. */
function parseAmount(s: string): number {
  const cleaned = s.replace(/[₹,\s]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** Map header variants (case, spaces, underscores) onto our canonical column names. */
function canonicalHeader(h: string): string {
  const key = h.trim().replace(/[\s_-]/g, '').toLowerCase();
  return ALL_COLUMNS.find((c) => c.toLowerCase() === key) ?? h.trim();
}

export function validateRow(
  raw: Record<string, string>,
  line: number,
  knownCropCodes: Set<string> | null,
): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const get = (k: string) => (raw[k] ?? '').trim();

  for (const col of REQUIRED_COLUMNS) {
    if (!get(col)) errors.push(`${col} is required`);
  }

  const price = parseAmount(get('price'));
  if (get('price') && (!Number.isFinite(price) || price <= 0)) errors.push('price must be a positive number');

  const optionalAmount = (col: 'minPrice' | 'maxPrice'): number | undefined => {
    const v = get(col);
    if (!v) return undefined;
    const n = parseAmount(v);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push(`${col} must be a positive number`);
      return undefined;
    }
    return n;
  };
  const minPrice = optionalAmount('minPrice');
  const maxPrice = optionalAmount('maxPrice');
  if (minPrice !== undefined && Number.isFinite(price) && minPrice > price) errors.push('minPrice is above price');
  if (maxPrice !== undefined && Number.isFinite(price) && maxPrice < price) errors.push('maxPrice is below price');

  const priceDate = get('priceDate');
  if (priceDate && !isValidDate(priceDate)) errors.push('priceDate must be YYYY-MM-DD');

  let unit: PriceUnit | undefined;
  const unitRaw = get('unit').toUpperCase();
  if (unitRaw) {
    if ((PRICE_UNITS as readonly string[]).includes(unitRaw)) unit = unitRaw as PriceUnit;
    else errors.push(`unit must be one of ${PRICE_UNITS.join(', ')}`);
  }

  const cropCode = get('cropCode');
  if (cropCode && knownCropCodes && !knownCropCodes.has(cropCode.toLowerCase())) {
    warnings.push(`Unknown crop code "${cropCode}"`);
  }

  const row: MandiPriceImportRow | null =
    errors.length === 0
      ? {
          mandiName: get('mandiName'),
          district: get('district'),
          state: get('state'),
          cropCode,
          price,
          priceDate,
          ...(minPrice !== undefined ? { minPrice } : {}),
          ...(maxPrice !== undefined ? { maxPrice } : {}),
          ...(unit ? { unit } : {}),
        }
      : null;

  return { line, raw, row, errors, warnings };
}

export function parseMandiCsv(text: string, knownCropCodes: Set<string> | null): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: canonicalHeader,
  });

  const fileErrors: string[] = [];
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) fileErrors.push(`Missing required column(s): ${missing.join(', ')}`);
  const unknownColumns = headers.filter((h) => !(ALL_COLUMNS as readonly string[]).includes(h));

  // Papa reports row-level problems (e.g. too many fields); surface a few of them.
  for (const err of parsed.errors.slice(0, 5)) {
    fileErrors.push(`Line ${(err.row ?? 0) + 2}: ${err.message}`);
  }
  if (parsed.data.length > MAX_IMPORT_ROWS) {
    fileErrors.push(`The file has ${parsed.data.length} rows; the maximum per import is ${MAX_IMPORT_ROWS}.`);
  }
  if (parsed.data.length === 0) fileErrors.push('The file has no data rows.');

  const rows = missing.length
    ? []
    : parsed.data.map((raw, i) => validateRow(raw, i + 2, knownCropCodes));

  return { rows, fileErrors, unknownColumns };
}

export function sampleCsv(cropCodes: string[]): string {
  const [a = 'PADDY', b = 'POTATO'] = cropCodes;
  const rows = [
    'mandiName,district,state,cropCode,price,minPrice,maxPrice,unit,priceDate',
    `Burdwan Krishak Bazar,Purba Bardhaman,West Bengal,${a},2300,2150,2400,QUINTAL,2026-07-01`,
    `Sheoraphuli,Hooghly,West Bengal,${b},1450,,,QUINTAL,2026-07-01`,
  ];
  return `${rows.join('\n')}\n`;
}
