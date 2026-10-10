import {
  BadRequestException,
  Body,
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
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { pageArgs } from '../common/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminAdvisoryQueryDto,
  AdminNotificationQueryDto,
  AdminWeatherAlertQueryDto,
  CreateAdvisoryDto,
  CreateWeatherAlertDto,
  PublishDto,
  SendNotificationDto,
  UpdateAdvisoryDto,
  UpdateWeatherAlertDto,
} from './dto';
import { resolveRecipients } from './targeting';

const blankToNull = (v?: string | null) => (v === undefined ? undefined : v?.trim() || null);

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminContentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Advisories ----------

  @Get('advisories')
  async advisories(@Query() q: AdminAdvisoryQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const where: Prisma.CropAdvisoryWhereInput = { cropId: q.cropId, language: q.language };
    const [items, total] = await Promise.all([
      this.prisma.cropAdvisory.findMany({ where, include: { crop: true }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.cropAdvisory.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post('advisories')
  async createAdvisory(@CurrentUser() admin: AuthUser, @Body() dto: CreateAdvisoryDto) {
    const advisory = await this.prisma.cropAdvisory.create({
      data: { ...dto, state: blankToNull(dto.state), district: blankToNull(dto.district), createdById: admin.id },
      include: { crop: true },
    });
    await this.audit.log(admin.id, 'advisory.create', 'crop_advisory', advisory.id, dto);
    return advisory;
  }

  @Put('advisories/:id')
  async updateAdvisory(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdvisoryDto,
  ) {
    const before = await this.findAdvisory(id);
    const advisory = await this.prisma.cropAdvisory.update({
      where: { id },
      data: { ...dto, state: blankToNull(dto.state), district: blankToNull(dto.district) },
      include: { crop: true },
    });
    await this.audit.log(admin.id, 'advisory.update', 'crop_advisory', id, { before, after: dto });
    return advisory;
  }

  @Delete('advisories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdvisory(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.findAdvisory(id);
    await this.prisma.cropAdvisory.delete({ where: { id } });
    await this.audit.log(admin.id, 'advisory.delete', 'crop_advisory', id, { before });
  }

  @Post('advisories/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishAdvisory(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishDto) {
    await this.findAdvisory(id);
    const advisory = await this.prisma.cropAdvisory.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
      include: { crop: true },
    });

    let notified = 0;
    if (dto.notify) {
      const recipients = await resolveRecipients(this.prisma, {
        language: advisory.language,
        state: advisory.state,
        district: advisory.district,
        cropId: advisory.cropId,
        all: true,
      });
      notified = await this.notifications.notifyUsers(recipients, {
        type: 'ADVISORY',
        title: advisory.title,
        message: advisory.description.slice(0, 300),
        data: { advisoryId: advisory.id, cropId: advisory.cropId },
      });
    }
    await this.audit.log(admin.id, 'advisory.publish', 'crop_advisory', id, { notify: !!dto.notify, notified });
    return { advisory, notified };
  }

  // ---------- Weather alerts ----------

  @Get('weather-alerts')
  async weatherAlerts(@Query() q: AdminWeatherAlertQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const now = new Date();
    const where: Prisma.WeatherAlertWhereInput =
      q.active === true ? { validTo: { gte: now } } : q.active === false ? { validTo: { lt: now } } : {};
    const [items, total] = await Promise.all([
      this.prisma.weatherAlert.findMany({ where, include: { crop: true }, orderBy: { validFrom: 'desc' }, skip, take }),
      this.prisma.weatherAlert.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post('weather-alerts')
  async createWeatherAlert(@CurrentUser() admin: AuthUser, @Body() dto: CreateWeatherAlertDto) {
    const { notify, ...data } = dto;
    const validFrom = new Date(data.validFrom);
    const validTo = new Date(data.validTo);
    if (validTo <= validFrom) throw new BadRequestException('validTo must be after validFrom');

    const alert = await this.prisma.weatherAlert.create({
      data: {
        ...data,
        validFrom,
        validTo,
        state: blankToNull(data.state),
        district: blankToNull(data.district),
        createdById: admin.id,
      },
      include: { crop: true },
    });

    let notified = 0;
    if (notify) {
      const recipients = await resolveRecipients(this.prisma, {
        all: true,
        language: alert.language,
        state: alert.state,
        district: alert.district,
        cropId: alert.cropId,
      });
      notified = await this.notifications.notifyUsers(recipients, {
        type: 'WEATHER_ALERT',
        title: alert.title,
        message: alert.message,
        data: { weatherAlertId: alert.id },
      });
    }
    await this.audit.log(admin.id, 'weather_alert.create', 'weather_alert', alert.id, { ...dto, notified });
    return { alert, notified };
  }

  @Put('weather-alerts/:id')
  async updateWeatherAlert(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWeatherAlertDto,
  ) {
    const before = await this.prisma.weatherAlert.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Weather alert not found');
    const { notify: _notify, ...data } = dto;
    const validFrom = data.validFrom ? new Date(data.validFrom) : before.validFrom;
    const validTo = data.validTo ? new Date(data.validTo) : before.validTo;
    if (validTo <= validFrom) throw new BadRequestException('validTo must be after validFrom');

    const alert = await this.prisma.weatherAlert.update({
      where: { id },
      data: { ...data, validFrom, validTo, state: blankToNull(data.state), district: blankToNull(data.district) },
      include: { crop: true },
    });
    await this.audit.log(admin.id, 'weather_alert.update', 'weather_alert', id, { before, after: dto });
    return alert;
  }

  @Delete('weather-alerts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWeatherAlert(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.prisma.weatherAlert.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Weather alert not found');
    await this.prisma.weatherAlert.delete({ where: { id } });
    await this.audit.log(admin.id, 'weather_alert.delete', 'weather_alert', id, { before });
  }

  // ---------- Notifications ----------

  @Get('notifications')
  async notificationsList(@Query() q: AdminNotificationQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const where: Prisma.NotificationWhereInput = { type: q.type };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post('notifications/send')
  @HttpCode(HttpStatus.OK)
  async send(@CurrentUser() admin: AuthUser, @Body() dto: SendNotificationDto) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    const recipients = await resolveRecipients(this.prisma, dto.target);
    const count = await this.notifications.notifyUsers(recipients, {
      type: dto.type,
      title: dto.title,
      message: dto.message,
      scheduledAt,
    });
    await this.audit.log(admin.id, 'notification.send', 'notification', null, {
      type: dto.type,
      title: dto.title,
      target: dto.target,
      scheduledAt,
      recipients: count,
    });
    return { recipients: count };
  }

  private async findAdvisory(id: string) {
    const advisory = await this.prisma.cropAdvisory.findUnique({ where: { id } });
    if (!advisory) throw new NotFoundException('Advisory not found');
    return advisory;
  }
}
