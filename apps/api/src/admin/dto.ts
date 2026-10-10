import { PartialType } from '@nestjs/swagger';
import {
  ActivityType,
  AlertSeverity,
  CropSeason,
  Language,
  NotificationType,
  PriceUnit,
  SchemeCategory,
  SupplierCategory,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';

const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

// ---------- Farmers ----------

export class AdminFarmerQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
}

export class AdminUpdateFarmerDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(100) village?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsEnum(Language) language?: Language;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AdminFarmQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
}

// ---------- Crops & calendar ----------

export class CreateCropDto {
  @IsString() @Matches(/^[a-z0-9-]{2,50}$/, { message: 'code must be lowercase letters, digits and dashes' }) code: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) nameHi: string;
  @IsString() @IsNotEmpty() @MaxLength(100) nameBn: string;
  @IsOptional() @IsString() @MaxLength(100) localName?: string;
  @IsEnum(CropSeason) season: CropSeason;
  @Type(() => Number) @IsInt() @Min(1) @Max(1500) durationDays: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000) defaultYieldPerAcre?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCropDto extends PartialType(CreateCropDto) {}

export class CreateCalendarTemplateDto {
  @IsEnum(ActivityType) activityType: ActivityType;
  /** Days relative to sowing; negative for pre-sowing work. */
  @Type(() => Number) @IsInt() @Min(-365) @Max(1500) dayOffset: number;
  @IsString() @IsNotEmpty() @MaxLength(150) title: string;
  @IsString() @IsNotEmpty() @MaxLength(150) titleHi: string;
  @IsString() @IsNotEmpty() @MaxLength(150) titleBn: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionHi?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionBn?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCalendarTemplateDto extends PartialType(CreateCalendarTemplateDto) {}

// ---------- Mandis & prices ----------

export class CreateMandiDto {
  @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) district: string;
  @IsString() @IsNotEmpty() @MaxLength(100) state: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateMandiDto extends PartialType(CreateMandiDto) {}

export class AdminMandiPriceQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsUUID() mandiId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateMandiPriceDto {
  @IsUUID() mandiId: string;
  @IsUUID() cropId: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) price: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) maxPrice?: number;
  @IsOptional() @IsEnum(PriceUnit) unit?: PriceUnit;
  @IsDateString() priceDate: string;
  @IsOptional() @IsString() @MaxLength(50) source?: string;
}

export class UpdateMandiPriceDto extends PartialType(CreateMandiPriceDto) {}

/** Import rows are validated individually so one bad row doesn't reject the whole file. */
export class ImportPriceRowDto {
  mandiName: string;
  district: string;
  state: string;
  cropCode: string;
  price: number | string;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  unit?: string | null;
  priceDate: string;
}

export class ImportMandiPricesDto {
  @IsOptional() @IsString() @MaxLength(50) source?: string;

  @IsArray()
  @ArrayMaxSize(2000)
  rows: ImportPriceRowDto[];
}

// ---------- Advisories, alerts, notifications ----------

export class AdminAdvisoryQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsEnum(Language) language?: Language;
}

export class CreateAdvisoryDto {
  @IsOptional() @IsUUID() cropId?: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) description: string;
  @IsOptional() @IsEnum(CropSeason) season?: CropSeason;
  @IsEnum(Language) language: Language;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
}

export class UpdateAdvisoryDto extends PartialType(CreateAdvisoryDto) {}

export class PublishDto {
  @IsOptional() @IsBoolean() notify?: boolean;
}

export class AdminWeatherAlertQueryDto extends PaginationQueryDto {
  @IsOptional() @Transform(toBool) @IsBoolean() active?: boolean;
}

export class CreateWeatherAlertDto {
  @IsEnum(AlertSeverity) severity: AlertSeverity;
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) message: string;
  @IsEnum(Language) language: Language;
  @IsDateString() validFrom: string;
  @IsDateString() validTo: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsBoolean() notify?: boolean;
}

export class UpdateWeatherAlertDto extends PartialType(CreateWeatherAlertDto) {}

export class NotificationTargetDto {
  @IsOptional() @IsBoolean() all?: boolean;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsEnum(Language) language?: Language;
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @IsUUID('all', { each: true }) userIds?: string[];
}

export class SendNotificationDto {
  @IsEnum(NotificationType) type: NotificationType;
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) message: string;
  @ValidateNested() @Type(() => NotificationTargetDto) target: NotificationTargetDto;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class AdminNotificationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(NotificationType) type?: NotificationType;
}

export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(50) entity?: string;
}

// ---------- Suppliers & government schemes ----------

export class AdminSupplierQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(SupplierCategory) category?: SupplierCategory;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
}

export class CreateSupplierDto {
  @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @IsEnum(SupplierCategory, { each: true }) categories: SupplierCategory[];
  @IsOptional() @IsString() @MaxLength(100) contactPerson?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9 -]{8,16}$/, { message: 'phone must be digits, optionally with + and spaces' })
  phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) village?: string;
  @IsString() @IsNotEmpty() @MaxLength(100) district: string;
  @IsString() @IsNotEmpty() @MaxLength(100) state: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isVerified?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class AdminSchemeQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(SchemeCategory) category?: SchemeCategory;
  @IsOptional() @IsEnum(Language) language?: Language;
}

export class CreateSchemeDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) summary: string;
  @IsEnum(SchemeCategory) category: SchemeCategory;
  @IsOptional() @IsString() @MaxLength(3000) benefits?: string;
  @IsOptional() @IsString() @MaxLength(3000) eligibility?: string;
  @IsOptional() @IsString() @MaxLength(3000) howToApply?: string;
  @IsOptional() @IsString() @MaxLength(3000) documents?: string;
  @IsOptional() @IsUrl({ protocols: ['https', 'http'], require_protocol: true }) @MaxLength(500) applyUrl?: string;
  @IsOptional() @IsString() @MaxLength(50) helpline?: string;
  @IsEnum(Language) language: Language;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateSchemeDto extends PartialType(CreateSchemeDto) {}
