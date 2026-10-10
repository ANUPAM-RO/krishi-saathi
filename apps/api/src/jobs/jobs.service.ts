import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { addDays, formatDateOnly, todayInIndia } from '@krishi/shared';
import { APP_CONFIG, AppConfig } from '../config/configuration';
import { pickLocalized, renderMessage } from '../common/i18n/messages';
import { ACTIVE_CROP_STATUSES } from '../farmer-crops/farmer-crops.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { HEAVY_RAIN, WeatherService } from '../weather/weather.service';

const TZ = 'Asia/Kolkata';

export const JOB_NAMES = ['reminders', 'weather-check', 'dispatch', 'cleanup'] as const;
export type JobName = (typeof JOB_NAMES)[number];

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly weather: WeatherService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  run(name: JobName): Promise<unknown> {
    switch (name) {
      case 'reminders':
        return this.sendActivityReminders();
      case 'weather-check':
        return this.checkHeavyRain();
      case 'dispatch':
        return this.notifications.dispatchDue().then(() => ({ ok: true }));
      case 'cleanup':
        return this.cleanup();
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchTick() {
    if (this.config.jobsEnabled) await this.notifications.dispatchDue();
  }

  @Cron('0 7 * * *', { timeZone: TZ })
  async remindersTick() {
    if (this.config.jobsEnabled) await this.sendActivityReminders();
  }

  @Cron('0 18 * * *', { timeZone: TZ })
  async weatherTick() {
    if (this.config.jobsEnabled) await this.checkHeavyRain();
  }

  @Cron('30 3 * * *', { timeZone: TZ })
  async cleanupTick() {
    if (this.config.jobsEnabled) await this.cleanup();
  }

  /** One reminder per activity due today (IST) that hasn't been reminded yet. */
  async sendActivityReminders(): Promise<{ reminded: number }> {
    const today = todayInIndia();
    const due = await this.prisma.cropActivity.findMany({
      where: {
        scheduledDate: today,
        completed: false,
        reminderSentAt: null,
        farmerCrop: { status: { in: ACTIVE_CROP_STATUSES }, farm: { user: { isActive: true } } },
      },
      include: {
        farmerCrop: {
          select: {
            id: true,
            crop: true,
            farm: { select: { name: true, userId: true, user: { select: { language: true } } } },
          },
        },
      },
      take: 5000,
    });
    if (!due.length) return { reminded: 0 };

    const data: Prisma.NotificationCreateManyInput[] = due.map((a) => {
      const lang = a.farmerCrop.farm.user.language;
      const text = renderMessage('activityDueToday', lang, {
        activity: pickLocalized(a, 'title', lang),
        crop: pickLocalized(a.farmerCrop.crop, 'name', lang),
        farm: a.farmerCrop.farm.name,
      });
      return {
        userId: a.farmerCrop.farm.userId,
        type: 'CROP_REMINDER',
        title: text.title,
        message: text.body,
        data: { farmerCropId: a.farmerCrop.id, activityId: a.id },
      };
    });

    await this.prisma.$transaction([
      this.prisma.notification.createMany({ data }),
      this.prisma.cropActivity.updateMany({
        where: { id: { in: due.map((a) => a.id) } },
        data: { reminderSentAt: new Date() },
      }),
    ]);
    void this.notifications.dispatchDue();
    this.logger.log(`Sent ${due.length} activity reminder(s)`);
    return { reminded: due.length };
  }

  /** Warns farmers the evening before forecast heavy rain at any of their farms (once per farmer per day). */
  async checkHeavyRain(): Promise<{ checkedFarms: number; alerted: number }> {
    const tomorrow = formatDateOnly(addDays(todayInIndia(), 1));
    const farms = await this.prisma.farm.findMany({
      where: { user: { isActive: true, role: 'FARMER' } },
      select: { id: true, userId: true, user: { select: { language: true } } },
    });

    const alertedUsers = new Set<string>();
    for (const farm of farms) {
      if (alertedUsers.has(farm.userId)) continue;
      try {
        const location = await this.weather.resolveLocation(farm.userId, { farmId: farm.id });
        const snapshot = await this.weather.getSnapshot(location);
        if (snapshot.isStale) continue;
        const day = snapshot.daily.find((d) => d.date === tomorrow);
        if (
          !day ||
          (day.rainProbability ?? 0) < HEAVY_RAIN.minProbability ||
          (day.rainfall ?? 0) < HEAVY_RAIN.minRainfallMm
        ) {
          continue;
        }

        const already = await this.prisma.notification.count({
          where: { userId: farm.userId, type: 'WEATHER_ALERT', data: { path: ['date'], equals: tomorrow } },
        });
        if (already) {
          alertedUsers.add(farm.userId);
          continue;
        }

        const text = renderMessage('heavyRain', farm.user.language, {
          rain: Math.round(day.rainfall ?? 0),
          prob: day.rainProbability ?? 0,
          place: location.label,
        });
        await this.notifications.notifyUsers([farm.userId], {
          type: 'WEATHER_ALERT',
          title: text.title,
          message: text.body,
          data: { date: tomorrow, farmId: farm.id },
        });
        alertedUsers.add(farm.userId);
      } catch (err) {
        this.logger.warn(`Rain check failed for farm ${farm.id}: ${(err as Error).message}`);
      }
    }
    return { checkedFarms: farms.length, alerted: alertedUsers.size };
  }

  async cleanup() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const [weather, otps, tokens] = await this.prisma.$transaction([
      this.prisma.weatherRecord.deleteMany({ where: { fetchedAt: { lt: new Date(now - 7 * day) } } }),
      this.prisma.otpRequest.deleteMany({ where: { createdAt: { lt: new Date(now - day) } } }),
      this.prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date(now) } }, { revokedAt: { lt: new Date(now - 30 * day) } }],
        },
      }),
    ]);
    return { weatherRecords: weather.count, otpRequests: otps.count, refreshTokens: tokens.count };
  }
}
