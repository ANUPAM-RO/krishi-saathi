import type { AreaUnit } from './enums';

/**
 * Square metres per unit. Bigha varies by state; the West Bengal bigha
 * (about 1,337.8 m², roughly 1/3 acre) is used since the pilot is in West Bengal.
 */
export const SQUARE_METRES_PER_UNIT: Record<AreaUnit, number> = {
  BIGHA: 1337.8,
  ACRE: 4046.8564,
  HECTARE: 10000,
};

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (value < 0) throw new Error('Area cannot be negative');
  if (from === to) return value;
  return (value * SQUARE_METRES_PER_UNIT[from]) / SQUARE_METRES_PER_UNIT[to];
}

export function toAcres(value: number, unit: AreaUnit): number {
  return convertArea(value, unit, 'ACRE');
}
