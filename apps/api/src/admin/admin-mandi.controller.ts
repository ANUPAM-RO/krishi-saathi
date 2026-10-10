import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, PriceUnit } from '@prisma/client';
import { toDateOnly } from '@krishi/shared';
import { AuditService } from '../common/audit/audit.service';
import { parseDateOnly } from '../common/dates';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { pageArgs } from '../common/pagination';
import { mandiPriceInclude } from '../mandi/mandi.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminMandiPriceQueryDto,
  CreateMandiDto,
  CreateMandiPriceDto,
  ImportMandiPricesDto,
  ImportPriceRowDto,
  UpdateMandiDto,
  UpdateMandiPriceDto,
} from './dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminMandiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Mandis ----------

  @Get('mandis')
  mandis() {
    return this.prisma.mandi.findMany({ orderBy: [{ state: 'asc' }, { district: 'asc' }, { name: 'asc' }] });
  }

  @Post('mandis')
  async createMandi(@CurrentUser() admin: AuthUser, @Body() dto: CreateMandiDto) {
    try {
      const mandi = await this.prisma.mandi.create({ data: this.trimMandi(dto) });
      await this.audit.log(admin.id, 'mandi.create', 'mandi', mandi.id, dto);
      return mandi;
    } catch (err) {
      throw this.mapUnique(err, 'This mandi already exists in that district');
    }
  }

  @Put('mandis/:id')
  async updateMandi(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMandiDto) {
    const before = await this.prisma.mandi.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Mandi not found');
    try {
      const mandi = await this.prisma.mandi.update({ where: { id }, data: this.trimMandi(dto) });
      await this.audit.log(admin.id, 'mandi.update', 'mandi', id, { before, after: dto });
      return mandi;
    } catch (err) {
      throw this.mapUnique(err, 'This mandi already exists in that district');
    }
  }

  // ---------- Prices ----------

  @Get('mandi-prices')
  async prices(@Query() q: AdminMandiPriceQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const where: Prisma.MandiPriceWhereInput = {
      cropId: q.cropId,
      mandiId: q.mandiId,
      priceDate: {
        gte: q.from ? parseDateOnly(q.from, 'from') : undefined,
        lte: q.to ? parseDateOnly(q.to, 'to') : undefined,
      },
    };
    const [items, total] = await Promise.all([
      this.prisma.mandiPrice.findMany({
        where,
        include: mandiPriceInclude,
        orderBy: [{ priceDate: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.mandiPrice.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post('mandi-prices')
  async upsertPrice(@CurrentUser() admin: AuthUser, @Body() dto: CreateMandiPriceDto) {
    const [mandi, crop] = await Promise.all([
      this.prisma.mandi.findUnique({ where: { id: dto.mandiId }, select: { id: true } }),
      this.prisma.crop.findUnique({ where: { id: dto.cropId }, select: { id: true } }),
    ]);
    if (!mandi) throw new NotFoundException('Mandi not found');
    if (!crop) throw new NotFoundException('Crop not found');

    const priceDate = parseDateOnly(dto.priceDate, 'priceDate');
    const values = {
      price: dto.price,
      minPrice: dto.minPrice ?? null,
      maxPrice: dto.maxPrice ?? null,
      unit: dto.unit ?? 'QUINTAL',
      source: dto.source?.trim() || 'admin',
    };
    const price = await this.prisma.mandiPrice.upsert({
      where: { mandiId_cropId_priceDate: { mandiId: dto.mandiId, cropId: dto.cropId, priceDate } },
      create: { mandiId: dto.mandiId, cropId: dto.cropId, priceDate, ...values },
      update: values,
      include: mandiPriceInclude,
    });
    await this.audit.log(admin.id, 'mandi_price.upsert', 'mandi_price', price.id, dto);
    return price;
  }

  @Put('mandi-prices/:id')
  async updatePrice(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMandiPriceDto,
  ) {
    const before = await this.prisma.mandiPrice.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Price not found');
    try {
      const price = await this.prisma.mandiPrice.update({
        where: { id },
        data: {
          mandiId: dto.mandiId,
          cropId: dto.cropId,
          price: dto.price,
          minPrice: dto.minPrice,
          maxPrice: dto.maxPrice,
          unit: dto.unit,
          priceDate: dto.priceDate ? parseDateOnly(dto.priceDate, 'priceDate') : undefined,
          source: dto.source,
        },
        include: mandiPriceInclude,
      });
      await this.audit.log(admin.id, 'mandi_price.update', 'mandi_price', id, { before, after: dto });
      return price;
    } catch (err) {
      throw this.mapUnique(err, 'A price for this mandi, crop and date already exists');
    }
  }

  @Delete('mandi-prices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePrice(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.prisma.mandiPrice.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Price not found');
    await this.prisma.mandiPrice.delete({ where: { id } });
    await this.audit.log(admin.id, 'mandi_price.delete', 'mandi_price', id, { before });
  }

  /** Bulk import (e.g. from an Agmarknet CSV export). Unknown mandis are created automatically. */
  @Post('mandi-prices/import')
  @HttpCode(HttpStatus.OK)
  async importPrices(@CurrentUser() admin: AuthUser, @Body() dto: ImportMandiPricesDto) {
    const source = dto.source?.trim() || 'csv-import';
    const crops = await this.prisma.crop.findMany({ select: { id: true, code: true } });
    const cropByCode = new Map(crops.map((c) => [c.code.toLowerCase(), c.id]));
    const mandiCache = new Map<string, string>();

    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    for (const [index, raw] of dto.rows.entries()) {
      const rowNumber = index + 1;
      try {
        const row = this.parseImportRow(raw);
        const cropId = cropByCode.get(row.cropCode.toLowerCase());
        if (!cropId) throw new Error(`Unknown cropCode "${row.cropCode}"`);

        const mandiKey = `${row.mandiName}|${row.district}|${row.state}`.toLowerCase();
        let mandiId = mandiCache.get(mandiKey);
        if (!mandiId) {
          const existing = await this.prisma.mandi.findFirst({
            where: {
              name: { equals: row.mandiName, mode: 'insensitive' },
              district: { equals: row.district, mode: 'insensitive' },
              state: { equals: row.state, mode: 'insensitive' },
            },
            select: { id: true },
          });
          mandiId =
            existing?.id ??
            (await this.prisma.mandi.create({
              data: { name: row.mandiName, district: row.district, state: row.state },
              select: { id: true },
            })).id;
          mandiCache.set(mandiKey, mandiId);
        }

        const key = { mandiId_cropId_priceDate: { mandiId, cropId, priceDate: row.priceDate } };
        const exists = await this.prisma.mandiPrice.findUnique({ where: key, select: { id: true } });
        const values = { price: row.price, minPrice: row.minPrice, maxPrice: row.maxPrice, unit: row.unit, source };
        if (exists) {
          await this.prisma.mandiPrice.update({ where: { id: exists.id }, data: values });
          updated++;
        } else {
          await this.prisma.mandiPrice.create({ data: { mandiId, cropId, priceDate: row.priceDate, ...values } });
          created++;
        }
      } catch (err) {
        errors.push({ row: rowNumber, message: (err as Error).message });
      }
    }

    await this.audit.log(admin.id, 'mandi_price.import', 'mandi_price', null, {
      source,
      rows: dto.rows.length,
      created,
      updated,
      errors: errors.length,
    });
    return { created, updated, errors };
  }

  private parseImportRow(raw: ImportPriceRowDto) {
    const text = (v: unknown, field: string) => {
      const s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
      if (!s) throw new Error(`${field} is required`);
      if (s.length > 150) throw new Error(`${field} is too long`);
      return s;
    };
    const num = (v: unknown, field: string, required: boolean): number | null => {
      if (v === null || v === undefined || v === '') {
        if (required) throw new Error(`${field} is required`);
        return null;
      }
      const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new Error(`${field} must be a positive number`);
      return Math.round(n * 100) / 100;
    };

    let priceDate: Date;
    try {
      priceDate = toDateOnly(text(raw?.priceDate, 'priceDate'));
    } catch (err) {
      throw new Error((err as Error).message.startsWith('priceDate') ? (err as Error).message : 'priceDate must be YYYY-MM-DD');
    }

    const unitRaw = (raw?.unit ?? '').toString().trim().toUpperCase();
    if (unitRaw && unitRaw !== 'QUINTAL' && unitRaw !== 'KG') throw new Error('unit must be QUINTAL or KG');

    return {
      mandiName: text(raw?.mandiName, 'mandiName'),
      district: text(raw?.district, 'district'),
      state: text(raw?.state, 'state'),
      cropCode: text(raw?.cropCode, 'cropCode'),
      price: num(raw?.price, 'price', true)!,
      minPrice: num(raw?.minPrice, 'minPrice', false),
      maxPrice: num(raw?.maxPrice, 'maxPrice', false),
      unit: (unitRaw || 'QUINTAL') as PriceUnit,
      priceDate,
    };
  }

  private trimMandi<T extends Partial<CreateMandiDto>>(dto: T): T {
    return { ...dto, name: dto.name?.trim(), district: dto.district?.trim(), state: dto.state?.trim() };
  }

  private mapUnique(err: unknown, message: string) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return new ConflictException(message);
    return err;
  }
}
