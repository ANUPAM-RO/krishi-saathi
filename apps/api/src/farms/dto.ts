import { PartialType } from '@nestjs/swagger';
import { AreaUnit, SoilType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateFarmDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100000)
  area: number;

  @IsEnum(AreaUnit) areaUnit: AreaUnit;

  @IsOptional() @IsString() @MaxLength(100) village?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude?: number;

  @IsOptional() @IsEnum(SoilType) soilType?: SoilType;
  @IsOptional() @IsBoolean() irrigationAvailable?: boolean;
}

export class UpdateFarmDto extends PartialType(CreateFarmDto) {}
