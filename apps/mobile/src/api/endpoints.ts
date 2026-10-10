import type { CropSeason, FarmerCropStatus } from '@krishi/shared';
import { request } from './client';
import type {
  Activity,
  ActivityRange,
  ActivityWithCrop,
  Advisory,
  CreateFarmerCropBody,
  Crop,
  CropWithCalendar,
  Dashboard,
  Expense,
  ExpenseBody,
  ExpenseList,
  Farm,
  FarmBody,
  FarmDetail,
  FarmerCrop,
  FarmerCropDetail,
  Mandi,
  MandiCropPrices,
  MandiPrice,
  AppNotification,
  NotificationPage,
  Profit,
  RefreshResponse,
  SendOtpResponse,
  UpdateFarmerCropBody,
  UpdateProfileBody,
  User,
  VerifyOtpResponse,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from './types';

export interface WeatherQuery {
  farmId?: string;
  lat?: number;
  lon?: number;
}

export interface MandiPriceQuery {
  cropId?: string;
  mandiId?: string;
  district?: string;
  state?: string;
}

const id = encodeURIComponent;

export const api = {
  auth: {
    sendOtp: (phone: string) =>
      request<SendOtpResponse>('/auth/send-otp', { method: 'POST', body: { phone }, auth: false }),
    verifyOtp: (phone: string, code: string, language?: string) =>
      request<VerifyOtpResponse>('/auth/verify-otp', {
        method: 'POST',
        body: { phone, code, language },
        auth: false,
      }),
    refresh: (refreshToken: string) =>
      request<RefreshResponse>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),
    logout: (refreshToken: string) =>
      request<void>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false, timeoutMs: 5000 }),
    me: () => request<User>('/auth/me'),
  },

  farmer: {
    me: () => request<User>('/farmers/me'),
    update: (body: UpdateProfileBody) => request<User>('/farmers/me', { method: 'PUT', body }),
    registerDeviceToken: (token: string, platform?: string) =>
      request<void>('/farmers/me/device-tokens', { method: 'POST', body: { token, platform } }),
    removeDeviceToken: (token: string) =>
      request<void>(`/farmers/me/device-tokens/${id(token)}`, { method: 'DELETE', timeoutMs: 5000 }),
  },

  farms: {
    list: () => request<Farm[]>('/farms'),
    get: (farmId: string) => request<FarmDetail>(`/farms/${id(farmId)}`),
    create: (body: FarmBody) => request<Farm>('/farms', { method: 'POST', body }),
    update: (farmId: string, body: Partial<FarmBody>) =>
      request<Farm>(`/farms/${id(farmId)}`, { method: 'PUT', body }),
    remove: (farmId: string) => request<void>(`/farms/${id(farmId)}`, { method: 'DELETE' }),
  },

  crops: {
    list: (season?: CropSeason) => request<Crop[]>('/crops', { query: { season } }),
    get: (cropId: string) => request<CropWithCalendar>(`/crops/${id(cropId)}`),
  },

  farmerCrops: {
    list: (params: { status?: FarmerCropStatus; farmId?: string } = {}) =>
      request<FarmerCrop[]>('/farmer-crops', { query: { ...params } }),
    get: (fcId: string) => request<FarmerCropDetail>(`/farmer-crops/${id(fcId)}`),
    create: (body: CreateFarmerCropBody) => request<FarmerCropDetail>('/farmer-crops', { method: 'POST', body }),
    update: (fcId: string, body: UpdateFarmerCropBody) =>
      request<FarmerCropDetail>(`/farmer-crops/${id(fcId)}`, { method: 'PUT', body }),
    remove: (fcId: string) => request<void>(`/farmer-crops/${id(fcId)}`, { method: 'DELETE' }),
    activities: (fcId: string) => request<Activity[]>(`/farmer-crops/${id(fcId)}/activities`),
    profit: (fcId: string) => request<Profit>(`/farmer-crops/${id(fcId)}/profit`),
  },

  activities: {
    list: (range: ActivityRange, days?: number) =>
      request<ActivityWithCrop[]>('/activities', { query: { range, days } }),
    complete: (activityId: string) =>
      request<Activity>(`/activities/${id(activityId)}/complete`, { method: 'POST' }),
    uncomplete: (activityId: string) =>
      request<Activity>(`/activities/${id(activityId)}/uncomplete`, { method: 'POST' }),
  },

  expenses: {
    list: (farmerCropId?: string) => request<ExpenseList>('/expenses', { query: { farmerCropId } }),
    create: (body: ExpenseBody) => request<Expense>('/expenses', { method: 'POST', body }),
    update: (expenseId: string, body: Partial<Omit<ExpenseBody, 'farmerCropId'>>) =>
      request<Expense>(`/expenses/${id(expenseId)}`, { method: 'PUT', body }),
    remove: (expenseId: string) => request<void>(`/expenses/${id(expenseId)}`, { method: 'DELETE' }),
  },

  weather: {
    current: (q: WeatherQuery) => request<WeatherCurrentResponse>('/weather/current', { query: { ...q } }),
    forecast: (q: WeatherQuery) => request<WeatherForecastResponse>('/weather/forecast', { query: { ...q } }),
  },

  mandi: {
    mandis: (q: { state?: string; district?: string } = {}) => request<Mandi[]>('/mandis', { query: q }),
    prices: (q: MandiPriceQuery = {}) => request<MandiPrice[]>('/mandi-prices', { query: { ...q } }),
    cropPrices: (cropId: string, q: { district?: string; state?: string; days?: number } = {}) =>
      request<MandiCropPrices>(`/mandi-prices/${id(cropId)}`, { query: q }),
  },

  dashboard: () => request<Dashboard>('/dashboard'),

  notifications: {
    list: (page = 1, pageSize = 50) =>
      request<NotificationPage>('/notifications', { query: { page, pageSize } }),
    markRead: (notificationId: string) =>
      request<AppNotification>(`/notifications/${id(notificationId)}/read`, { method: 'POST' }),
    markAllRead: () => request<void>('/notifications/read-all', { method: 'POST' }),
  },

  advisories: {
    list: (q: { cropId?: string; language?: string } = {}) => request<Advisory[]>('/advisories', { query: q }),
  },
};
