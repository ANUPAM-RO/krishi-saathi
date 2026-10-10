// Typed API shapes, mirroring docs/API.md. Timestamps are ISO-8601 strings; date-only
// fields come back as midnight UTC and should be displayed using their first 10 chars.
import type {
  ActivityType,
  AlertSeverity,
  AreaUnit,
  CropSeason,
  FarmerCropStatus,
  Language,
  NotificationType,
  PriceUnit,
  Role,
  SoilType,
} from '@krishi/shared';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---------- Auth ----------

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
  language: Language;
  village: string | null;
  district: string | null;
  state: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UserRef {
  id: string;
  name: string | null;
  phone: string;
}

export interface SendOtpResponse {
  phone: string;
  expiresInSeconds: number;
  devCode?: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNewUser: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ---------- Master data ----------

export interface Crop {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  nameBn: string;
  localName: string | null;
  season: CropSeason;
  durationDays: number;
  defaultYieldPerAcre: number | null;
  isActive: boolean;
}

export interface AdminCrop extends Crop {
  templateCount: number;
}

export interface CropInput {
  code: string;
  name: string;
  nameHi: string;
  nameBn: string;
  localName?: string | null;
  season: CropSeason;
  durationDays: number;
  defaultYieldPerAcre?: number | null;
  isActive?: boolean;
}

/** Crop calendar template row (`Template` in the API doc; fields per the Prisma model). */
export interface CalendarTemplate {
  id: string;
  cropId: string;
  activityType: ActivityType;
  dayOffset: number;
  title: string;
  titleHi: string;
  titleBn: string;
  description: string | null;
  descriptionHi: string | null;
  descriptionBn: string | null;
  sortOrder: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarTemplateInput {
  activityType: ActivityType;
  dayOffset: number;
  title: string;
  titleHi: string;
  titleBn: string;
  description?: string;
  descriptionHi?: string;
  descriptionBn?: string;
  sortOrder?: number;
}

// ---------- Farms & farmers ----------

export interface Farm {
  id: string;
  name: string;
  area: number;
  areaUnit: AreaUnit;
  village: string | null;
  district: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  soilType: SoilType | null;
  irrigationAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  activeCropCount?: number;
}

/** The doc calls this "FarmerCrop-lite"; only the fields we display are required. */
export interface FarmerCropLite {
  id: string;
  crop: Crop;
  sowingDate: string;
  expectedHarvestDate?: string | null;
  area: number;
  areaUnit: AreaUnit;
  status: FarmerCropStatus;
  progressPercent?: number;
  expectedYield?: number | null;
  expectedPricePerQuintal?: number | null;
}

export interface AdminFarmerListItem extends User {
  farmCount: number;
  activeCropCount: number;
  lastLoginAt: string | null;
}

export interface AdminFarmerDetail extends User {
  farms: (Farm & { farmerCrops: FarmerCropLite[] })[];
}

export interface AdminFarmerPatch {
  name?: string;
  village?: string;
  district?: string;
  state?: string;
  language?: Language;
  isActive?: boolean;
}

export interface AdminFarm extends Farm {
  user: UserRef;
  cropCount: number;
}

// ---------- Mandi ----------

export interface Mandi {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  isActive?: boolean;
}

export interface MandiInput {
  name: string;
  district: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}

export interface MandiPrice {
  id: string;
  mandi: Mandi;
  crop: Crop;
  price: number;
  minPrice: number | null;
  maxPrice: number | null;
  unit: PriceUnit;
  priceDate: string;
  source: string | null;
  updatedAt: string;
}

export interface MandiPriceInput {
  mandiId: string;
  cropId: string;
  price: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  unit?: PriceUnit;
  priceDate: string;
  source?: string;
}

export interface MandiPriceImportRow {
  mandiName: string;
  district: string;
  state: string;
  cropCode: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  unit?: PriceUnit;
  priceDate: string;
}

export interface MandiPriceImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

// ---------- Content ----------

export interface Advisory {
  id: string;
  crop: Crop | null;
  title: string;
  description: string;
  season: CropSeason | null;
  language: Language;
  state: string | null;
  district: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface AdvisoryInput {
  cropId?: string | null;
  title: string;
  description: string;
  season?: CropSeason | null;
  language: Language;
  state?: string | null;
  district?: string | null;
}

export interface PublishAdvisoryResult {
  advisory: Advisory;
  notified: number;
}

export interface WeatherAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  validFrom: string;
  validTo: string;
  district: string | null;
  state: string | null;
  cropId: string | null;
  /** Not in the shared WeatherAlert shape, but the admin list likely includes it (Prisma column). */
  language?: Language;
  crop?: Crop | null;
  createdAt?: string;
}

export interface WeatherAlertInput {
  severity: AlertSeverity;
  title: string;
  message: string;
  language: Language;
  validFrom: string;
  validTo: string;
  state?: string | null;
  district?: string | null;
  cropId?: string | null;
  notify?: boolean;
}

export interface CreateWeatherAlertResult {
  alert: WeatherAlert;
  notified: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

export interface AdminNotification extends Notification {
  user: UserRef;
}

export interface NotificationTarget {
  all?: boolean;
  state?: string;
  district?: string;
  cropId?: string;
  language?: Language;
  userIds?: string[];
}

export interface SendNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  target: NotificationTarget;
  scheduledAt?: string;
}

export interface SendNotificationResult {
  recipients: number;
}

// ---------- Admin misc ----------

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  changes: unknown;
  createdAt: string;
  actor: UserRef | null;
}

export interface AdminStats {
  farmers: number;
  farms: number;
  activeCrops: number;
  tasksDueToday: number;
  overdueTasks: number;
  completedTasksLast7Days: number;
  notificationsLast7Days: number;
  activeWeatherAlerts: number;
  latestMandiPriceDate: string | null;
  farmersByDistrict: { district: string | null; count: number }[];
  cropsByType: { cropId: string; name: string; count: number }[];
}

export interface AdminSettings {
  languages: readonly string[];
  areaUnits: readonly string[];
  soilTypes: readonly string[];
  seasons: readonly string[];
  activityTypes: readonly string[];
  expenseCategories: readonly string[];
  notificationTypes: readonly string[];
  priceUnits: readonly string[];
  severities: readonly string[];
  [key: string]: unknown;
}
