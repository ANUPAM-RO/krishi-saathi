import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addDays, formatDateOnly, roundMoney, todayInIndia } from '@krishi/shared';
import { PrismaService } from '../prisma/prisma.service';

export const mandiPriceInclude = {
  mandi: { select: { id: true, name: true, district: true, state: true, latitude: true, longitude: true } },
  crop: true,
} satisfies Prisma.MandiPriceInclude;

export interface PriceFilter {
  cropId?: string;
  cropIds?: string[];
  mandiId?: string;
  district?: string;
  state?: string;
}

@Injectable()
export class MandiService {
  constructor(private readonly prisma: PrismaService) {}

  listMandis(state?: string, district?: string) {
    return this.prisma.mandi.findMany({
      where: {
        isActive: true,
        state: state ? { equals: state, mode: 'insensitive' } : undefined,
        district: district ? { equals: district, mode: 'insensitive' } : undefined,
      },
      select: { id: true, name: true, district: true, state: true, latitude: true, longitude: true },
      orderBy: [{ district: 'asc' }, { name: 'asc' }],
    });
  }

  /** Latest price for each (mandi, crop) pair matching the filter, newest first. */
  async latestPrices(filter: PriceFilter, take = 200) {
    const conditions: Prisma.Sql[] = [Prisma.sql`m.is_active = true`];
    if (filter.cropId) conditions.push(Prisma.sql`mp.crop_id = ${filter.cropId}`);
    if (filter.cropIds) {
      if (!filter.cropIds.length) return [];
      conditions.push(Prisma.sql`mp.crop_id IN (${Prisma.join(filter.cropIds)})`);
    }
    if (filter.mandiId) conditions.push(Prisma.sql`mp.mandi_id = ${filter.mandiId}`);
    if (filter.state) conditions.push(Prisma.sql`LOWER(m.state) = LOWER(${filter.state})`);
    if (filter.district) conditions.push(Prisma.sql`LOWER(m.district) = LOWER(${filter.district})`);

    // DISTINCT ON picks the newest row per (mandi, crop) in the database.
    const latest = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM (
        SELECT DISTINCT ON (mp.mandi_id, mp.crop_id) mp.id, mp.price_date
        FROM mandi_prices mp
        JOIN mandis m ON m.id = mp.mandi_id
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY mp.mandi_id, mp.crop_id, mp.price_date DESC, mp.updated_at DESC
      ) t
      ORDER BY t.price_date DESC
      LIMIT ${take}`;
    if (!latest.length) return [];

    const rows = await this.prisma.mandiPrice.findMany({
      where: { id: { in: latest.map((r) => r.id) } },
      include: mandiPriceInclude,
    });
    return rows.sort(
      (a, b) => b.priceDate.getTime() - a.priceDate.getTime() || a.mandi.name.localeCompare(b.mandi.name),
    );
  }

  async cropPrices(cropId: string, filter: Omit<PriceFilter, 'cropId' | 'cropIds'>, days: number) {
    const crop = await this.prisma.crop.findUnique({ where: { id: cropId } });
    if (!crop) throw new NotFoundException('Crop not found');

    const latest = await this.latestPrices({ ...filter, cropId });
    const grouped = await this.prisma.mandiPrice.groupBy({
      by: ['priceDate'],
      where: { ...this.where({ ...filter, cropId }), priceDate: { gte: addDays(todayInIndia(), -days) }, unit: 'QUINTAL' },
      _avg: { price: true },
      orderBy: { priceDate: 'asc' },
    });
    const history = grouped.map((g) => ({
      date: formatDateOnly(g.priceDate),
      avgPrice: g._avg.price == null ? null : roundMoney(Number(g._avg.price)),
    }));
    return { crop, latest, history };
  }

  private where(f: PriceFilter): Prisma.MandiPriceWhereInput {
    return {
      cropId: f.cropId ?? (f.cropIds ? { in: f.cropIds } : undefined),
      mandiId: f.mandiId,
      mandi: {
        isActive: true,
        state: f.state ? { equals: f.state, mode: 'insensitive' } : undefined,
        district: f.district ? { equals: f.district, mode: 'insensitive' } : undefined,
      },
    };
  }
}
