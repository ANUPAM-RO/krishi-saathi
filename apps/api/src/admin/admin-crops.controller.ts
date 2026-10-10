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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarTemplateDto, CreateCropDto, UpdateCalendarTemplateDto, UpdateCropDto } from './dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminCropsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('crops')
  async crops() {
    const rows = await this.prisma.crop.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { calendarTemplates: true } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, templateCount: _count.calendarTemplates }));
  }

  @Post('crops')
  async createCrop(@CurrentUser() admin: AuthUser, @Body() dto: CreateCropDto) {
    try {
      const crop = await this.prisma.crop.create({ data: dto });
      await this.audit.log(admin.id, 'crop.create', 'crop', crop.id, dto);
      return crop;
    } catch (err) {
      throw this.mapUnique(err, 'A crop with this code already exists');
    }
  }

  @Put('crops/:id')
  async updateCrop(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCropDto) {
    const before = await this.prisma.crop.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Crop not found');
    try {
      const crop = await this.prisma.crop.update({ where: { id }, data: dto });
      await this.audit.log(admin.id, 'crop.update', 'crop', id, { before, after: dto });
      return crop;
    } catch (err) {
      throw this.mapUnique(err, 'A crop with this code already exists');
    }
  }

  @Get('crops/:id/calendar')
  async calendar(@Param('id', ParseUUIDPipe) id: string) {
    await this.findCrop(id);
    return this.prisma.cropCalendarTemplate.findMany({
      where: { cropId: id },
      orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  @Post('crops/:id/calendar')
  async addTemplate(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCalendarTemplateDto,
  ) {
    await this.findCrop(id);
    const template = await this.prisma.cropCalendarTemplate.create({ data: { ...dto, cropId: id } });
    await this.audit.log(admin.id, 'calendar.create', 'crop_calendar_template', template.id, { cropId: id, ...dto });
    return template;
  }

  @Put('calendar-templates/:id')
  async updateTemplate(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarTemplateDto,
  ) {
    const before = await this.prisma.cropCalendarTemplate.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Template not found');
    // Only affects crops planted after this change; existing activities keep their copy.
    const template = await this.prisma.cropCalendarTemplate.update({ where: { id }, data: dto });
    await this.audit.log(admin.id, 'calendar.update', 'crop_calendar_template', id, { before, after: dto });
    return template;
  }

  @Delete('calendar-templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.prisma.cropCalendarTemplate.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Template not found');
    await this.prisma.cropCalendarTemplate.delete({ where: { id } });
    await this.audit.log(admin.id, 'calendar.delete', 'crop_calendar_template', id, { before });
  }

  private async findCrop(id: string) {
    const crop = await this.prisma.crop.findUnique({ where: { id }, select: { id: true } });
    if (!crop) throw new NotFoundException('Crop not found');
  }

  private mapUnique(err: unknown, message: string) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return new ConflictException(message);
    return err;
  }
}
