import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FarmerCropStatus, Prisma } from '@prisma/client';
import {
  calculateExpectedHarvestDate,
  calculateProfit,
  cropProgressPercent,
  diffInDays,
  expensesByCategory,
  generateActivitySchedule,
  sumExpenses,
  toAcres,
  todayInIndia,
} from '@krishi/shared';
import { parseDateOnly } from '../common/dates';
import { PriceLookup, PriceReferenceService } from '../mandi/price-reference.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFarmerCropDto, FarmerCropQueryDto, UpdateFarmerCropDto } from './dto';

export const ACTIVE_CROP_STATUSES: FarmerCropStatus[] = ['ACTIVE', 'PLANNED'];

const farmSelect = { id: true, name: true, district: true, state: true } satisfies Prisma.FarmSelect;

const listInclude = {
  crop: true,
  farm: { select: farmSelect },
  activities: { where: { completed: false }, orderBy: { scheduledDate: 'asc' }, take: 1 },
  expenses: { select: { amount: true, category: true } },
} satisfies Prisma.FarmerCropInclude;

type FarmerCropForList = Prisma.FarmerCropGetPayload<{ include: typeof listInclude }>;
type ProfitSource = Pick<FarmerCropForList, 'cropId' | 'area' | 'areaUnit' | 'expectedYield' | 'expectedPricePerQuintal' | 'crop' | 'farm'> & {
  expenses: { amount: Prisma.Decimal; category: FarmerCropForList['expenses'][number]['category'] }[];
};

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

@Injectable()
export class FarmerCropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PriceReferenceService,
  ) {}

  async list(userId: string, q: FarmerCropQueryDto = {}) {
    const rows = await this.prisma.farmerCrop.findMany({
      where: { farm: { userId }, status: q.status, farmId: q.farmId },
      include: listInclude,
      orderBy: [{ sowingDate: 'desc' }, { createdAt: 'desc' }],
    });
    const lookup = this.prices.createLookup();
    return Promise.all(rows.map((r) => this.toListItem(r, lookup)));
  }

  async get(userId: string, id: string) {
    const fc = await this.prisma.farmerCrop.findFirst({
      where: { id, farm: { userId } },
      include: {
        crop: true,
        farm: { select: farmSelect },
        activities: { orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }] },
        expenses: { orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }] },
      },
    });
    if (!fc) throw new NotFoundException('Crop not found');

    const lookup = this.prices.createLookup();
    const profit = await this.computeProfit(fc, lookup);
    const { activities, expenses, ...rest } = fc;
    const nextActivity = activities.find((a) => !a.completed) ?? null;
    const farmRef = { id: fc.farm.id, name: fc.farm.name };

    return {
      ...this.base(rest),
      progressPercent: cropProgressPercent(fc.sowingDate, fc.expectedHarvestDate, todayInIndia()),
      nextActivity,
      summary: this.summary(profit),
      activities,
      expenses: expenses.map((e) => ({ ...e, farmerCrop: { id: fc.id, crop: fc.crop, farm: farmRef } })),
      profit,
    };
  }

  async create(userId: string, dto: CreateFarmerCropDto) {
    const farm = await this.prisma.farm.findFirst({ where: { id: dto.farmId, userId }, select: { id: true } });
    if (!farm) throw new NotFoundException('Farm not found');

    const crop = await this.prisma.crop.findFirst({
      where: { id: dto.cropId, isActive: true },
      include: { calendarTemplates: { where: { isActive: true } } },
    });
    if (!crop) throw new NotFoundException('Crop not found');

    const sowingDate = parseDateOnly(dto.sowingDate, 'sowingDate');
    const today = todayInIndia();
    this.assertReasonableSowingDate(sowingDate, today);

    const schedule = generateActivitySchedule(sowingDate, crop.calendarTemplates);
    const created = await this.prisma.farmerCrop.create({
      data: {
        farmId: dto.farmId,
        cropId: dto.cropId,
        sowingDate,
        expectedHarvestDate: calculateExpectedHarvestDate(sowingDate, crop.durationDays),
        area: dto.area,
        areaUnit: dto.areaUnit,
        status: sowingDate > today ? 'PLANNED' : 'ACTIVE',
        expectedYield: dto.expectedYield,
        expectedPricePerQuintal: dto.expectedPricePerQuintal,
        notes: dto.notes?.trim() || null,
        activities: {
          create: schedule.map((t) => ({
            templateId: t.id,
            activityType: t.activityType,
            title: t.title,
            titleHi: t.titleHi,
            titleBn: t.titleBn,
            description: t.description,
            descriptionHi: t.descriptionHi,
            descriptionBn: t.descriptionBn,
            scheduledDate: t.scheduledDate,
            // A crop registered after it was sown: earlier steps are assumed done rather than
            // flooding the farmer with overdue tasks. completedAt stays null to mark them as assumed.
            completed: t.scheduledDate < today,
          })),
        },
      },
      select: { id: true },
    });
    return this.get(userId, created.id);
  }

  async update(userId: string, id: string, dto: UpdateFarmerCropDto) {
    const fc = await this.prisma.farmerCrop.findFirst({
      where: { id, farm: { userId } },
      include: { crop: { select: { durationDays: true } } },
    });
    if (!fc) throw new NotFoundException('Crop not found');

    const data: Prisma.FarmerCropUpdateInput = {
      area: dto.area,
      areaUnit: dto.areaUnit,
      status: dto.status,
      expectedYield: dto.expectedYield,
      expectedPricePerQuintal: dto.expectedPricePerQuintal,
      notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
    };

    let shiftDays = 0;
    if (dto.sowingDate) {
      const sowingDate = parseDateOnly(dto.sowingDate, 'sowingDate');
      this.assertReasonableSowingDate(sowingDate, todayInIndia());
      shiftDays = diffInDays(fc.sowingDate, sowingDate);
      data.sowingDate = sowingDate;
      data.expectedHarvestDate = calculateExpectedHarvestDate(sowingDate, fc.crop.durationDays);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.farmerCrop.update({ where: { id }, data });
      if (shiftDays !== 0) {
        await tx.$executeRaw`
          UPDATE crop_activities
          SET scheduled_date = scheduled_date + ${shiftDays}::int, reminder_sent_at = NULL, updated_at = NOW()
          WHERE farmer_crop_id = ${id} AND completed = false`;
      }
    });
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.farmerCrop.deleteMany({ where: { id, farm: { userId } } });
    if (count === 0) throw new NotFoundException('Crop not found');
  }

  async activities(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.prisma.cropActivity.findMany({
      where: { farmerCropId: id },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async profit(userId: string, id: string) {
    const fc = await this.prisma.farmerCrop.findFirst({
      where: { id, farm: { userId } },
      include: { crop: true, farm: { select: farmSelect }, expenses: { select: { amount: true, category: true } } },
    });
    if (!fc) throw new NotFoundException('Crop not found');
    return this.computeProfit(fc, this.prices.createLookup());
  }

  async assertOwned(userId: string, id: string) {
    const fc = await this.prisma.farmerCrop.findFirst({ where: { id, farm: { userId } }, select: { id: true } });
    if (!fc) throw new NotFoundException('Crop not found');
  }

  /** Revenue/expense/profit estimate with the assumptions behind it, so the UI can explain the figures. */
  async computeProfit(fc: ProfitSource, lookup: PriceLookup) {
    const areaInAcres = toAcres(Number(fc.area), fc.areaUnit);

    let yieldQuintals: number | null = null;
    let yieldSource: 'FARMER' | 'CROP_DEFAULT' | null = null;
    if (fc.expectedYield != null) {
      yieldQuintals = Number(fc.expectedYield);
      yieldSource = 'FARMER';
    } else if (fc.crop.defaultYieldPerAcre != null) {
      yieldQuintals = round(Number(fc.crop.defaultYieldPerAcre) * areaInAcres, 2);
      yieldSource = 'CROP_DEFAULT';
    }

    let pricePerQuintal: number | null = null;
    let priceSource: 'FARMER' | 'MANDI' | null = null;
    let priceDate: Date | null = null;
    let mandiName: string | null = null;
    if (fc.expectedPricePerQuintal != null) {
      pricePerQuintal = Number(fc.expectedPricePerQuintal);
      priceSource = 'FARMER';
    } else {
      const ref = await lookup(fc.cropId, fc.farm.district, fc.farm.state);
      if (ref) {
        pricePerQuintal = ref.pricePerQuintal;
        priceSource = 'MANDI';
        priceDate = ref.priceDate;
        mandiName = ref.mandiName;
      }
    }

    const expenses = fc.expenses.map((e) => ({ amount: Number(e.amount), category: e.category }));
    const estimate = calculateProfit({
      expectedYield: yieldQuintals,
      expectedPricePerQuintal: pricePerQuintal,
      totalExpenses: sumExpenses(expenses),
    });

    return {
      ...estimate,
      byCategory: expensesByCategory(expenses),
      assumptions: {
        yieldQuintals,
        yieldSource,
        pricePerQuintal,
        priceSource,
        priceDate,
        mandiName,
        areaInAcres: round(areaInAcres, 3),
      },
    };
  }

  private async toListItem(r: FarmerCropForList, lookup: PriceLookup) {
    const { activities, expenses: _e, ...rest } = r;
    const profit = await this.computeProfit(r, lookup);
    return {
      ...this.base(rest),
      progressPercent: cropProgressPercent(r.sowingDate, r.expectedHarvestDate, todayInIndia()),
      nextActivity: activities[0] ?? null,
      summary: this.summary(profit),
    };
  }

  private base(fc: Omit<FarmerCropForList, 'activities' | 'expenses'>) {
    return {
      id: fc.id,
      farmId: fc.farmId,
      farm: { id: fc.farm.id, name: fc.farm.name },
      crop: fc.crop,
      sowingDate: fc.sowingDate,
      expectedHarvestDate: fc.expectedHarvestDate,
      area: fc.area,
      areaUnit: fc.areaUnit,
      status: fc.status,
      expectedYield: fc.expectedYield,
      expectedPricePerQuintal: fc.expectedPricePerQuintal,
      notes: fc.notes,
      createdAt: fc.createdAt,
    };
  }

  private summary(p: { expectedRevenue: number | null; totalExpenses: number; estimatedProfit: number | null }) {
    return {
      expectedRevenue: p.expectedRevenue,
      totalExpenses: p.totalExpenses,
      estimatedProfit: p.estimatedProfit,
      isEstimate: true as const,
    };
  }

  private assertReasonableSowingDate(sowingDate: Date, today: Date) {
    const days = diffInDays(today, sowingDate);
    if (days > 366 || days < -730) {
      throw new BadRequestException('sowingDate must be within the last two years or the next year');
    }
  }
}
