import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupplierCategory } from '@prisma/client';
import { distanceKm } from '@krishi/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

export class SupplierQueryDto {
  @IsOptional() @IsEnum(SupplierCategory) category?: SupplierCategory;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lon?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300) radiusKm?: number = 50;
}

const MAX_RESULTS = 100;

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weather: WeatherService,
  ) {}

  /**
   * Suppliers near the farmer, nearest first. The origin is the phone's position (lat/lon), else the farm,
   * else the farmer's village/district (same resolution as weather). Suppliers without coordinates are
   * listed after the mapped ones when they are in the farmer's district.
   */
  @Get()
  async nearby(@CurrentUser() user: AuthUser, @Query() q: SupplierQueryDto) {
    if ((q.lat === undefined) !== (q.lon === undefined)) {
      throw new BadRequestException('lat and lon must be provided together');
    }
    const origin = await this.weather.resolveLocation(user.id, q);
    const radiusKm = q.radiusKm ?? 50;

    const home = q.farmId
      ? await this.prisma.farm.findFirst({ where: { id: q.farmId, userId: user.id }, select: { district: true } })
      : await this.prisma.user.findUnique({ where: { id: user.id }, select: { district: true } });

    // Pilot scale (hundreds of rows): filter by distance in memory rather than with PostGIS.
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true, ...(q.category ? { categories: { has: q.category } } : {}) },
    });

    const mapped = suppliers
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        ...s,
        distanceKm: Math.round(distanceKm(origin.latitude, origin.longitude, s.latitude!, s.longitude!) * 10) / 10,
      }))
      .filter((s) => s.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const sameDistrict = home?.district
      ? suppliers
          .filter((s) => (s.latitude == null || s.longitude == null) && s.district.toLowerCase() === home.district!.toLowerCase())
          .map((s) => ({ ...s, distanceKm: null }))
      : [];

    return {
      location: { latitude: origin.latitude, longitude: origin.longitude, label: origin.label },
      radiusKm,
      items: [...mapped, ...sameDistrict].slice(0, MAX_RESULTS),
    };
  }
}
