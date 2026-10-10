// Response and request shapes for the Krishi Saathi REST API (see docs/API.md).
import type {
  ActivityType,
  AlertSeverity,
  AreaUnit,
  CropSeason,
  ExpenseCategory,
  FarmerCropStatus,
  Language,
  NotificationType,
  PriceUnit,
  Role,
  SchemeCategory,
  SoilType,
  SupplierCategory,
} from '@krishi/shared';

/** ISO-8601 timestamp. Date-only fields are midnight UTC; use the first 10 characters. */
export type IsoDate = string;

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

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
  createdAt: IsoDate;
}

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

export interface CropCalendarItem {
  id: string;
  activityType: ActivityType;
  dayOffset: number;
  title: string;
  titleHi: string;
  titleBn: string;
}

export type CropWithCalendar = Crop & { calendar: CropCalendarItem[] };

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
  createdAt: IsoDate;
  updatedAt: IsoDate;
  activeCropCount: number;
}

export type FarmDetail = Farm & { farmerCrops: FarmerCrop[] };

export interface Activity {
  id: string;
  farmerCropId: string;
  activityType: ActivityType;
  title: string;
  titleHi: string;
  titleBn: string;
  description: string | null;
  descriptionHi: string | null;
  descriptionBn: string | null;
  scheduledDate: IsoDate;
  completed: boolean;
  completedAt: IsoDate | null;
}

export type ActivityWithCrop = Activity & {
  farmerCrop: { id: string; farm: { id: string; name: string }; crop: Crop };
};

export interface ProfitSummary {
  expectedRevenue: number | null;
  totalExpenses: number;
  estimatedProfit: number | null;
  isEstimate: true;
}

export type YieldSource = 'FARMER' | 'CROP_DEFAULT';
export type PriceSource = 'FARMER' | 'MANDI';

export interface ProfitAssumptions {
  yieldQuintals: number | null;
  yieldSource: YieldSource | null;
  pricePerQuintal: number | null;
  priceSource: PriceSource | null;
  priceDate: IsoDate | null;
  mandiName: string | null;
  areaInAcres: number;
}

export type Profit = ProfitSummary & {
  byCategory: Partial<Record<ExpenseCategory, number>>;
  assumptions: ProfitAssumptions;
};

export interface FarmerCrop {
  id: string;
  farmId: string;
  farm: { id: string; name: string };
  crop: Crop;
  sowingDate: IsoDate;
  expectedHarvestDate: IsoDate;
  area: number;
  areaUnit: AreaUnit;
  status: FarmerCropStatus;
  expectedYield: number | null;
  expectedPricePerQuintal: number | null;
  notes: string | null;
  createdAt: IsoDate;
  progressPercent: number;
  nextActivity: Activity | null;
  summary: ProfitSummary;
}

export type FarmerCropDetail = FarmerCrop & {
  activities: Activity[];
  expenses: Expense[];
  profit: Profit;
};

export interface Expense {
  id: string;
  farmerCropId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: IsoDate;
  description: string | null;
  createdAt: IsoDate;
  farmerCrop: { id: string; crop: Crop; farm: { id: string; name: string } };
}

export interface ExpenseList {
  items: Expense[];
  total: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

export interface Mandi {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

export interface MandiPrice {
  id: string;
  mandi: Mandi;
  crop: Crop;
  price: number;
  minPrice: number | null;
  maxPrice: number | null;
  unit: PriceUnit;
  priceDate: IsoDate;
  source: string;
  updatedAt: IsoDate;
}

export interface MandiCropPrices {
  crop: Crop;
  latest: MandiPrice[];
  history: { date: IsoDate; avgPrice: number }[];
}

export interface NotificationData {
  farmerCropId?: string;
  activityId?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  createdAt: IsoDate;
  readAt: IsoDate | null;
}

export interface NotificationPage {
  items: AppNotification[];
  unreadCount: number;
  total: number;
  page: number;
  pageSize: number;
}

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
  publishedAt: IsoDate | null;
  createdAt: IsoDate;
}

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  rainProbability: number;
  rainfall: number;
  windSpeed: number;
  weatherCode: number;
  observedAt: IsoDate;
}

export interface WeatherDay {
  date: IsoDate;
  tempMin: number;
  tempMax: number;
  rainProbability: number;
  rainfall: number;
  windSpeedMax: number;
  weatherCode: number;
}

export interface WeatherAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  validFrom: IsoDate;
  validTo: IsoDate;
  district: string | null;
  state: string | null;
  cropId: string | null;
}

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  label: string | null;
}

export interface WeatherCurrentResponse {
  location: WeatherLocation;
  current: WeatherCurrent;
  fetchedAt: IsoDate;
  isStale: boolean;
  source: string;
}

export interface WeatherForecastResponse {
  location: WeatherLocation;
  daily: WeatherDay[];
  alerts: WeatherAlert[];
  fetchedAt: IsoDate;
  isStale: boolean;
  source: string;
}

export interface Dashboard {
  user: User;
  activeCrops: FarmerCrop[];
  todayTasks: ActivityWithCrop[];
  overdueCount: number;
  upcomingTasks: ActivityWithCrop[];
  weather: {
    current: WeatherCurrent;
    location: WeatherLocation;
    fetchedAt: IsoDate;
    isStale: boolean;
  } | null;
  mandiPrices: MandiPrice[];
  totals: ProfitSummary;
  unreadNotifications: number;
  hasFarms: boolean;
}

// ---- Auth ----

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

// ---- Request bodies ----

export interface UpdateProfileBody {
  name?: string;
  village?: string;
  district?: string;
  state?: string;
  language?: Language;
}

export interface FarmBody {
  name: string;
  area: number;
  areaUnit: AreaUnit;
  village?: string;
  district?: string;
  state?: string;
  /** `null` clears a saved location / soil type on update. */
  latitude?: number | null;
  longitude?: number | null;
  soilType?: SoilType | null;
  irrigationAvailable?: boolean;
}

export interface CreateFarmerCropBody {
  farmId: string;
  cropId: string;
  sowingDate: string;
  area: number;
  areaUnit: AreaUnit;
  expectedYield?: number;
  expectedPricePerQuintal?: number;
  notes?: string;
}

export interface UpdateFarmerCropBody {
  sowingDate?: string;
  area?: number;
  areaUnit?: AreaUnit;
  status?: FarmerCropStatus;
  expectedYield?: number | null;
  expectedPricePerQuintal?: number | null;
  notes?: string | null;
}

export interface ExpenseBody {
  farmerCropId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  description?: string;
}

export type ActivityRange = 'today' | 'upcoming' | 'overdue' | 'completed';

export interface Supplier {
  id: string;
  name: string;
  categories: SupplierCategory[];
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  village: string | null;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  isVerified: boolean;
  /** Straight-line distance from the farmer; null when the supplier has no map location. */
  distanceKm: number | null;
}

export interface NearbySuppliers {
  location: { latitude: number; longitude: number; label: string };
  radiusKm: number;
  items: Supplier[];
}

export interface Scheme {
  id: string;
  title: string;
  summary: string;
  category: SchemeCategory;
  benefits: string | null;
  eligibility: string | null;
  howToApply: string | null;
  documents: string | null;
  applyUrl: string | null;
  helpline: string | null;
  language: Language;
  /** null = central (all-India) scheme. */
  state: string | null;
  publishedAt: IsoDate | null;
}
