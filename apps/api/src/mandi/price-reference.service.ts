import { Injectable } from '@nestjs/common';
import { addDays, todayInIndia } from '@krishi/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface ReferencePrice {
  pricePerQuintal: number;
  priceDate: Date;
  mandiName: string;
}

export type PriceLookup = (cropId: string, district?: string | null, state?: string | null) => Promise<ReferencePrice | null>;

/** Only prices this recent are used as a fallback selling price for profit estimates. */
const MAX_PRICE_AGE_DAYS = 90;

@Injectable()
export class PriceReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a memoised lookup for the latest mandi price for a crop, preferring the farm's
   * district, then its state, then anywhere. Create one per request to avoid repeat queries.
   */
  createLookup(): PriceLookup {
    const cache = new Map<string, Promise<ReferencePrice | null>>();
    return (cropId, district, state) => {
      const key = `${cropId}|${district ?? ''}|${state ?? ''}`;
      if (!cache.has(key)) cache.set(key, this.find(cropId, district ?? null, state ?? null));
      return cache.get(key)!;
    };
  }

  private async find(cropId: string, district: string | null, state: string | null): Promise<ReferencePrice | null> {
    const since = addDays(todayInIndia(), -MAX_PRICE_AGE_DAYS);
    const scopes = [
      district && state ? { district: { equals: district, mode: 'insensitive' as const }, state: { equals: state, mode: 'insensitive' as const } } : null,
      state ? { state: { equals: state, mode: 'insensitive' as const } } : null,
      {},
    ].filter((s): s is NonNullable<typeof s> => s !== null);

    for (const mandi of scopes) {
      const row = await this.prisma.mandiPrice.findFirst({
        where: { cropId, priceDate: { gte: since }, mandi },
        orderBy: [{ priceDate: 'desc' }, { updatedAt: 'desc' }],
        include: { mandi: { select: { name: true } } },
      });
      if (row) {
        const price = Number(row.price);
        return {
          pricePerQuintal: row.unit === 'KG' ? price * 100 : price,
          priceDate: row.priceDate,
          mandiName: row.mandi.name,
        };
      }
    }
    return null;
  }
}
