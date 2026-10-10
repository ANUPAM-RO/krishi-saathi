// Domain enums shared by API, mobile and admin. Values mirror the Prisma enums.

export const LANGUAGES = ['en', 'hi', 'bn'] as const;
export type Language = (typeof LANGUAGES)[number];

export const ROLES = ['FARMER', 'ADMIN', 'EXPERT'] as const;
export type Role = (typeof ROLES)[number];

export const AREA_UNITS = ['BIGHA', 'ACRE', 'HECTARE'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const SOIL_TYPES = ['ALLUVIAL', 'CLAY', 'LOAMY', 'SANDY', 'LATERITE', 'RED', 'BLACK', 'OTHER'] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export const CROP_SEASONS = ['KHARIF', 'RABI', 'ZAID', 'PERENNIAL'] as const;
export type CropSeason = (typeof CROP_SEASONS)[number];

export const FARMER_CROP_STATUSES = ['PLANNED', 'ACTIVE', 'HARVESTED', 'FAILED'] as const;
export type FarmerCropStatus = (typeof FARMER_CROP_STATUSES)[number];

export const ACTIVITY_TYPES = [
  'LAND_PREPARATION',
  'SOWING',
  'TRANSPLANTING',
  'IRRIGATION',
  'FERTILIZER',
  'WEEDING',
  'PEST_CONTROL',
  'HARVEST',
  'OTHER',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  'SEED',
  'FERTILIZER',
  'PESTICIDE',
  'LABOUR',
  'IRRIGATION',
  'MACHINERY',
  'TRANSPORT',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const NOTIFICATION_TYPES = ['CROP_REMINDER', 'WEATHER_ALERT', 'PRICE_ALERT', 'ADVISORY', 'GENERAL'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PRICE_UNITS = ['QUINTAL', 'KG'] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const ALERT_SEVERITIES = ['INFO', 'WARNING', 'SEVERE'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const SUPPLIER_CATEGORIES = ['TRACTOR', 'PUMP', 'FERTILIZER', 'SEED', 'PESTICIDE'] as const;
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

export const SCHEME_CATEGORIES = ['INCOME_SUPPORT', 'INSURANCE', 'CREDIT', 'SUBSIDY', 'OTHER'] as const;
export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];
