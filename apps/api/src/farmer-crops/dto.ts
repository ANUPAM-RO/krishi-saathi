import { AreaUnit, FarmerCropStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateFarmerCropDto {
  @IsUUID() farmId: string;
  @IsUUID() cropId: string;

  /** YYYY-MM-DD */
  @IsDateString() sowingDate: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(100000) area: number;
  @IsEnum(AreaUnit) areaUnit: AreaUnit;

  /** Expected total yield in quintals. */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000) expectedYield?: number;

  /** Expected selling price per quintal (INR). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  expectedPricePerQuintal?: number;

  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateFarmerCropDto {
  @IsOptional() @IsDateString() sowingDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(100000) area?: number;
  @IsOptional() @IsEnum(AreaUnit) areaUnit?: AreaUnit;
  @IsOptional() @IsEnum(FarmerCropStatus) status?: FarmerCropStatus;

  /** Send null to clear and fall back to the crop's default yield. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  expectedYield?: number | null;

  /** Send null to clear and fall back to the latest mandi price. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  expectedPricePerQuintal?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(1000) notes?: string | null;
}

export class FarmerCropQueryDto {
  @IsOptional() @IsEnum(FarmerCropStatus) status?: FarmerCropStatus;
  @IsOptional() @IsUUID() farmId?: string;
}
