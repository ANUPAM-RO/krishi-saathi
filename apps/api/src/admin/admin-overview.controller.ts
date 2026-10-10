import { BadRequestException, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ACTIVITY_TYPES,
  ALERT_SEVERITIES,
  AREA_UNITS,
  CROP_SEASONS,
  EXPENSE_CATEGORIES,
  LANGUAGES,
  NOTIFICATION_TYPES,
  PRICE_UNITS,
  SOIL_TYPES,
  addDays,
  todayInIndia,
} from '@krishi/shared';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { AuditService } from '../common/audit/audit.service';
import { pageArgs } from '../common/pagination';
import { ACTIVE_CROP_STATUSES } from '../farmer-crops/farmer-crops.service';
import { JOB_NAMES, JobName, JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminOverviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  async stats() {
    const today = todayInIndia();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeCropWhere = { status: { in: ACTIVE_CROP_STATUSES } };
    const activeTaskWhere = { completed: false, farmerCrop: activeCropWhere };

    const [
      farmers,
      farms,
      activeCrops,
      tasksDueToday,
      overdueTasks,
      completedTasksLast7Days,
      notificationsLast7Days,
      activeWeatherAlerts,
      latestPrice,
      byDistrict,
      byCrop,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'FARMER' } }),
      this.prisma.farm.count(),
      this.prisma.farmerCrop.count({ where: activeCropWhere }),
      this.prisma.cropActivity.count({ where: { ...activeTaskWhere, scheduledDate: today } }),
      this.prisma.cropActivity.count({ where: { ...activeTaskWhere, scheduledDate: { lt: today } } }),
      this.prisma.cropActivity.count({ where: { completed: true, completedAt: { gte: weekAgo } } }),
      this.prisma.notification.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.weatherAlert.count({ where: { validTo: { gte: new Date() }, validFrom: { lte: addDays(today, 7) } } }),
      this.prisma.mandiPrice.findFirst({ orderBy: { priceDate: 'desc' }, select: { priceDate: true } }),
      this.prisma.user.groupBy({
        by: ['district'],
        where: { role: 'FARMER' },
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.farmerCrop.groupBy({
        by: ['cropId'],
        where: activeCropWhere,
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
    ]);

    const crops = await this.prisma.crop.findMany({
      where: { id: { in: byCrop.map((c) => c.cropId) } },
      select: { id: true, name: true },
    });
    const cropName = new Map(crops.map((c) => [c.id, c.name]));

    return {
      farmers,
      farms,
      activeCrops,
      tasksDueToday,
      overdueTasks,
      completedTasksLast7Days,
      notificationsLast7Days,
      activeWeatherAlerts,
      latestMandiPriceDate: latestPrice?.priceDate ?? null,
      farmersByDistrict: byDistrict.map((d) => ({ district: d.district ?? 'Unknown', count: d._count._all })),
      cropsByType: byCrop.map((c) => ({ cropId: c.cropId, name: cropName.get(c.cropId) ?? '—', count: c._count._all })),
    };
  }

  @Get('settings')
  settings() {
    return {
      languages: LANGUAGES,
      areaUnits: AREA_UNITS,
      soilTypes: SOIL_TYPES,
      seasons: CROP_SEASONS,
      activityTypes: ACTIVITY_TYPES,
      expenseCategories: EXPENSE_CATEGORIES,
      notificationTypes: NOTIFICATION_TYPES,
      priceUnits: PRICE_UNITS,
      severities: ALERT_SEVERITIES,
    };
  }

  @Get('audit-logs')
  async auditLogs(@Query() q: AuditLogQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const where = { entity: q.entity };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Runs a background job immediately (useful for pilots and QA). */
  @Post('jobs/:name/run')
  @HttpCode(HttpStatus.OK)
  async runJob(@CurrentUser() user: AuthUser, @Param('name') name: string) {
    if (!JOB_NAMES.includes(name as JobName)) {
      throw new BadRequestException(`Unknown job. Use one of: ${JOB_NAMES.join(', ')}`);
    }
    const result = await this.jobs.run(name as JobName);
    await this.audit.log(user.id, 'job.run', 'job', name, result);
    return result;
  }
}
