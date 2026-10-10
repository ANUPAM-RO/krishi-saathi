import { Controller, Get, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { roundMoney } from '@krishi/shared';
import { ActivitiesService } from '../activities/activities.service';
import { userSelect } from '../auth/user-select';
import { AuthUser, CurrentUser } from '../common/decorators';
import { FarmerCropsService } from '../farmer-crops/farmer-crops.service';
import { MandiService } from '../mandi/mandi.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly farmerCrops: FarmerCropsService,
    private readonly activities: ActivitiesService,
    private readonly weather: WeatherService,
    private readonly mandi: MandiService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async get(@CurrentUser() authUser: AuthUser) {
    const userId = authUser.id;
    const [user, farmCount, crops, todayTasks, overdueCount, upcomingTasks, unreadNotifications, weather] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect }),
        this.prisma.farm.count({ where: { userId } }),
        this.farmerCrops.list(userId),
        this.activities.list(userId, 'today'),
        this.activities.countOverdue(userId),
        this.activities.list(userId, 'upcoming', 7, 5),
        this.notifications.unreadCount(userId),
        this.currentWeather(userId),
      ]);

    const activeCrops = crops.filter((c) => c.status === 'ACTIVE' || c.status === 'PLANNED');
    const mandiPrices = await this.pricesFor(
      [...new Set(activeCrops.map((c) => c.crop.id))],
      user.state,
    );

    // Revenue/profit totals only include crops where an estimate is possible.
    const estimable = activeCrops.filter((c) => c.summary.expectedRevenue !== null);
    const totals = {
      totalExpenses: roundMoney(activeCrops.reduce((s, c) => s + c.summary.totalExpenses, 0)),
      expectedRevenue: estimable.length ? roundMoney(estimable.reduce((s, c) => s + c.summary.expectedRevenue!, 0)) : null,
      estimatedProfit: estimable.length ? roundMoney(estimable.reduce((s, c) => s + c.summary.estimatedProfit!, 0)) : null,
      isEstimate: true as const,
    };

    return {
      user,
      activeCrops,
      todayTasks,
      overdueCount,
      upcomingTasks,
      weather,
      mandiPrices,
      totals,
      unreadNotifications,
      hasFarms: farmCount > 0,
    };
  }

  private async currentWeather(userId: string) {
    try {
      const location = await this.weather.resolveLocation(userId, {});
      const s = await this.weather.getSnapshot(location);
      return { current: s.current, location: s.location, fetchedAt: s.fetchedAt, isStale: s.isStale };
    } catch (err) {
      this.logger.warn(`Dashboard weather unavailable: ${(err as Error).message}`);
      return null;
    }
  }

  private async pricesFor(cropIds: string[], state: string | null) {
    if (!cropIds.length) return [];
    const local = state ? await this.mandi.latestPrices({ cropIds, state }, 6) : [];
    return local.length ? local : this.mandi.latestPrices({ cropIds }, 6);
  }
}
