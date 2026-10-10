import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ActivitiesController } from './activities/activities.controller';
import { ActivitiesService } from './activities/activities.service';
import { AdminContentController } from './admin/admin-content.controller';
import { AdminCropsController } from './admin/admin-crops.controller';
import { AdminFarmersController } from './admin/admin-farmers.controller';
import { AdminMandiController } from './admin/admin-mandi.controller';
import { AdminOverviewController } from './admin/admin-overview.controller';
import { AdvisoriesController } from './advisories/advisories.controller';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './common/audit/audit.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor';
import { AppConfigModule } from './config/config.module';
import { CropsController } from './crops/crops.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { ExpensesController } from './expenses/expenses.controller';
import { ExpensesService } from './expenses/expenses.service';
import { FarmerCropsController } from './farmer-crops/farmer-crops.controller';
import { FarmerCropsService } from './farmer-crops/farmer-crops.service';
import { FarmersController } from './farmers/farmers.controller';
import { FarmsController } from './farms/farms.controller';
import { FarmsService } from './farms/farms.service';
import { HealthController } from './health.controller';
import { JobsService } from './jobs/jobs.service';
import { MandiController } from './mandi/mandi.controller';
import { MandiService } from './mandi/mandi.service';
import { PriceReferenceService } from './mandi/price-reference.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { PushService } from './notifications/push.service';
import { PrismaModule } from './prisma/prisma.module';
import { WeatherController } from './weather/weather.controller';
import { WeatherService } from './weather/weather.service';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    ScheduleModule.forRoot(),
    // Generous default; auth endpoints set stricter per-route limits.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
  ],
  controllers: [
    HealthController,
    FarmersController,
    FarmsController,
    CropsController,
    FarmerCropsController,
    ActivitiesController,
    ExpensesController,
    WeatherController,
    MandiController,
    DashboardController,
    NotificationsController,
    AdvisoriesController,
    AdminOverviewController,
    AdminFarmersController,
    AdminCropsController,
    AdminMandiController,
    AdminContentController,
  ],
  providers: [
    FarmsService,
    FarmerCropsService,
    ActivitiesService,
    ExpensesService,
    WeatherService,
    MandiService,
    PriceReferenceService,
    NotificationsService,
    PushService,
    JobsService,
    // Order matters: throttle, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: SerializeInterceptor },
  ],
})
export class AppModule {}
