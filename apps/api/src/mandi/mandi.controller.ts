import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { MandiService } from './mandi.service';

export class RegionQueryDto {
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
}

export class MandiPriceQueryDto extends RegionQueryDto {
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsUUID() mandiId?: string;
}

export class CropPriceQueryDto extends RegionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number = 30;
}

@ApiTags('mandi')
@ApiBearerAuth()
@Controller()
export class MandiController {
  constructor(private readonly mandi: MandiService) {}

  @Get('mandis')
  mandis(@Query() q: RegionQueryDto) {
    return this.mandi.listMandis(q.state, q.district);
  }

  @Get('mandi-prices')
  prices(@Query() q: MandiPriceQueryDto) {
    return this.mandi.latestPrices(q);
  }

  @Get('mandi-prices/:cropId')
  cropPrices(@Param('cropId', ParseUUIDPipe) cropId: string, @Query() q: CropPriceQueryDto) {
    return this.mandi.cropPrices(cropId, { state: q.state, district: q.district }, q.days ?? 30);
  }
}
