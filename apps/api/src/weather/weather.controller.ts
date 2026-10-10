import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from './weather.service';

export class WeatherQueryDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lon?: number;
}

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weather: WeatherService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('current')
  async current(@CurrentUser() user: AuthUser, @Query() q: WeatherQueryDto) {
    this.validate(q);
    const location = await this.weather.resolveLocation(user.id, q);
    const { daily: _daily, ...snapshot } = await this.weather.getSnapshot(location);
    return snapshot;
  }

  @Get('forecast')
  async forecast(@CurrentUser() user: AuthUser, @Query() q: WeatherQueryDto) {
    this.validate(q);
    const location = await this.weather.resolveLocation(user.id, q);
    const snapshot = await this.weather.getSnapshot(location);
    const { language } = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { language: true } });
    const alerts = await this.weather.alertsFor(user.id, location, snapshot.daily, language);
    return {
      location: snapshot.location,
      daily: snapshot.daily,
      alerts,
      fetchedAt: snapshot.fetchedAt,
      isStale: snapshot.isStale,
      source: snapshot.source,
    };
  }

  private validate(q: WeatherQueryDto) {
    if ((q.lat === undefined) !== (q.lon === undefined)) {
      throw new BadRequestException('lat and lon must be provided together');
    }
  }
}
