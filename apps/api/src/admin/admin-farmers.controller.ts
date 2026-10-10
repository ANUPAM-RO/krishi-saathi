import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { userSelect } from '../auth/user-select';
import { AuditService } from '../common/audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { pageArgs } from '../common/pagination';
import { ACTIVE_CROP_STATUSES } from '../farmer-crops/farmer-crops.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminFarmerQueryDto, AdminFarmQueryDto, AdminUpdateFarmerDto } from './dto';

const insensitive = (value?: string) => (value ? { equals: value, mode: 'insensitive' as const } : undefined);

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminFarmersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('farmers')
  async farmers(@Query() q: AdminFarmerQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const search = q.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: 'FARMER',
      isActive: q.isActive,
      district: insensitive(q.district),
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search.replace(/\s/g, '') } },
            { village: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          ...userSelect,
          lastLoginAt: true,
          _count: { select: { farms: true } },
          farms: { select: { _count: { select: { farmerCrops: { where: { status: { in: ACTIVE_CROP_STATUSES } } } } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const items = rows.map(({ _count, farms, ...u }) => ({
      ...u,
      farmCount: _count.farms,
      activeCropCount: farms.reduce((s, f) => s + f._count.farmerCrops, 0),
    }));
    return { items, total, page, pageSize };
  }

  @Get('farmers/:id')
  async farmer(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        lastLoginAt: true,
        farms: {
          orderBy: { createdAt: 'asc' },
          include: {
            farmerCrops: {
              orderBy: { sowingDate: 'desc' },
              include: {
                crop: true,
                _count: { select: { activities: true, expenses: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Farmer not found');
    return user;
  }

  @Patch('farmers/:id')
  async updateFarmer(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateFarmerDto,
  ) {
    const before = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('Farmer not found');
    const updated = await this.prisma.user.update({ where: { id }, data: dto, select: userSelect });
    if (dto.isActive === false) {
      // Deactivation also ends existing sessions.
      await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await this.audit.log(admin.id, 'farmer.update', 'user', id, { before, after: dto });
    return updated;
  }

  @Get('farms')
  async farms(@Query() q: AdminFarmQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const search = q.search?.trim();
    const where: Prisma.FarmWhereInput = {
      district: insensitive(q.district),
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { village: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search.replace(/\s/g, '') } } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.farm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          _count: { select: { farmerCrops: true } },
        },
      }),
      this.prisma.farm.count({ where }),
    ]);
    const items = rows.map(({ _count, ...f }) => ({ ...f, cropCount: _count.farmerCrops }));
    return { items, total, page, pageSize };
  }
}
