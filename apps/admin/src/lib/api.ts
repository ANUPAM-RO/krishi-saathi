'use client';

import { clearSession, getSession, setSession, updateTokens } from './session';
import type {
  AdminCrop,
  AdminFarm,
  AdminFarmerDetail,
  AdminFarmerListItem,
  AdminFarmerPatch,
  AdminNotification,
  AdminSettings,
  AdminStats,
  Advisory,
  AdvisoryInput,
  ApiErrorBody,
  AuditLog,
  CalendarTemplate,
  CalendarTemplateInput,
  CreateWeatherAlertResult,
  Crop,
  CropInput,
  Mandi,
  MandiInput,
  MandiPrice,
  MandiPriceImportResult,
  MandiPriceImportRow,
  MandiPriceInput,
  Paged,
  PublishAdvisoryResult,
  RefreshResponse,
  SendNotificationInput,
  SendNotificationResult,
  SendOtpResponse,
  User,
  VerifyOtpResponse,
  WeatherAlert,
  WeatherAlertInput,
  Scheme,
  SchemeInput,
  Supplier,
  SupplierInput,
} from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Human-readable message for any thrown value (API errors, network errors, etc.). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return `Cannot reach the API at ${API_URL}. Is the server running?`;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Attach the bearer token and refresh on 401 (default true). */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown;
  let message = `${res.status} ${res.statusText || 'Request failed'}`;
  try {
    body = await res.json();
    const b = body as Partial<ApiErrorBody>;
    if (Array.isArray(b.message)) message = b.message.join('; ');
    else if (typeof b.message === 'string' && b.message) message = b.message;
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, message, body);
}

// ---- Refresh handling: one in-flight refresh shared by all concurrent 401s ----

let refreshPromise: Promise<string | null> | null = null;

/** Called when the session can no longer be refreshed. The app shell redirects to /login. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn;
}

async function doRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RefreshResponse;
    updateTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = opts;

  const send = (token: string | undefined) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  const token = auth ? getSession()?.accessToken : undefined;
  let res = await send(token);

  if (res.status === 401 && auth && token) {
    // If another request already refreshed while we were in flight, reuse the newer token.
    const current = getSession()?.accessToken;
    const newToken = current && current !== token ? current : await refreshAccessToken();
    if (newToken) {
      res = await send(newToken);
    } else {
      clearSession();
      onSessionExpired?.();
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---------- Auth ----------

export const authApi = {
  sendOtp: (phone: string) =>
    request<SendOtpResponse>('/auth/send-otp', { method: 'POST', body: { phone }, auth: false }),
  verifyOtp: (phone: string, code: string) =>
    request<VerifyOtpResponse>('/auth/verify-otp', { method: 'POST', body: { phone, code }, auth: false }),
  me: () => request<User>('/auth/me'),
  async logout(): Promise<void> {
    const session = getSession();
    if (session) {
      try {
        await request<void>('/auth/logout', {
          method: 'POST',
          body: { refreshToken: session.refreshToken },
          auth: false,
        });
      } catch {
        // Logging out locally is what matters; ignore server errors.
      }
    }
    setSession(null);
  },
};

// ---------- Admin endpoints ----------

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export const adminApi = {
  stats: () => request<AdminStats>('/admin/stats'),
  settings: () => request<AdminSettings>('/admin/settings'),

  farmers: (q: PageQuery & { search?: string; district?: string; isActive?: boolean }) =>
    request<Paged<AdminFarmerListItem>>('/admin/farmers', { query: { ...q } }),
  farmer: (id: string) => request<AdminFarmerDetail>(`/admin/farmers/${id}`),
  updateFarmer: (id: string, body: AdminFarmerPatch) =>
    request<User>(`/admin/farmers/${id}`, { method: 'PATCH', body }),

  farms: (q: PageQuery & { search?: string; district?: string }) =>
    request<Paged<AdminFarm>>('/admin/farms', { query: { ...q } }),

  crops: () => request<AdminCrop[]>('/admin/crops'),
  createCrop: (body: CropInput) => request<Crop>('/admin/crops', { method: 'POST', body }),
  updateCrop: (id: string, body: Partial<CropInput>) =>
    request<Crop>(`/admin/crops/${id}`, { method: 'PUT', body }),

  calendar: (cropId: string) => request<CalendarTemplate[]>(`/admin/crops/${cropId}/calendar`),
  createTemplate: (cropId: string, body: CalendarTemplateInput) =>
    request<CalendarTemplate>(`/admin/crops/${cropId}/calendar`, { method: 'POST', body }),
  updateTemplate: (id: string, body: Partial<CalendarTemplateInput>) =>
    request<CalendarTemplate>(`/admin/calendar-templates/${id}`, { method: 'PUT', body }),
  deleteTemplate: (id: string) => request<void>(`/admin/calendar-templates/${id}`, { method: 'DELETE' }),

  mandis: () => request<Mandi[]>('/admin/mandis'),
  createMandi: (body: MandiInput) => request<Mandi>('/admin/mandis', { method: 'POST', body }),
  updateMandi: (id: string, body: Partial<MandiInput>) =>
    request<Mandi>(`/admin/mandis/${id}`, { method: 'PUT', body }),

  mandiPrices: (q: PageQuery & { cropId?: string; mandiId?: string; from?: string; to?: string }) =>
    request<Paged<MandiPrice>>('/admin/mandi-prices', { query: { ...q } }),
  createMandiPrice: (body: MandiPriceInput) =>
    request<MandiPrice>('/admin/mandi-prices', { method: 'POST', body }),
  updateMandiPrice: (id: string, body: Partial<MandiPriceInput>) =>
    request<MandiPrice>(`/admin/mandi-prices/${id}`, { method: 'PUT', body }),
  deleteMandiPrice: (id: string) => request<void>(`/admin/mandi-prices/${id}`, { method: 'DELETE' }),
  importMandiPrices: (rows: MandiPriceImportRow[], source?: string) =>
    request<MandiPriceImportResult>('/admin/mandi-prices/import', { method: 'POST', body: { source, rows } }),

  advisories: (q: PageQuery & { cropId?: string; language?: string }) =>
    request<Paged<Advisory>>('/admin/advisories', { query: { ...q } }),
  createAdvisory: (body: AdvisoryInput) => request<Advisory>('/admin/advisories', { method: 'POST', body }),
  updateAdvisory: (id: string, body: Partial<AdvisoryInput>) =>
    request<Advisory>(`/admin/advisories/${id}`, { method: 'PUT', body }),
  deleteAdvisory: (id: string) => request<void>(`/admin/advisories/${id}`, { method: 'DELETE' }),
  publishAdvisory: (id: string, notify: boolean) =>
    request<PublishAdvisoryResult>(`/admin/advisories/${id}/publish`, { method: 'POST', body: { notify } }),

  weatherAlerts: (q: PageQuery & { active?: boolean }) =>
    request<Paged<WeatherAlert>>('/admin/weather-alerts', { query: { ...q } }),
  createWeatherAlert: (body: WeatherAlertInput) =>
    request<CreateWeatherAlertResult>('/admin/weather-alerts', { method: 'POST', body }),
  updateWeatherAlert: (id: string, body: Partial<WeatherAlertInput>) =>
    request<WeatherAlert>(`/admin/weather-alerts/${id}`, { method: 'PUT', body }),
  deleteWeatherAlert: (id: string) => request<void>(`/admin/weather-alerts/${id}`, { method: 'DELETE' }),

  notifications: (q: PageQuery & { type?: string }) =>
    request<Paged<AdminNotification>>('/admin/notifications', { query: { ...q } }),
  sendNotification: (body: SendNotificationInput) =>
    request<SendNotificationResult>('/admin/notifications/send', { method: 'POST', body }),

  suppliers: (q: PageQuery & { search?: string; category?: string; district?: string }) =>
    request<Paged<Supplier>>('/admin/suppliers', { query: { ...q } }),
  createSupplier: (body: SupplierInput) => request<Supplier>('/admin/suppliers', { method: 'POST', body }),
  updateSupplier: (id: string, body: Partial<SupplierInput>) =>
    request<Supplier>(`/admin/suppliers/${id}`, { method: 'PUT', body }),
  deleteSupplier: (id: string) => request<void>(`/admin/suppliers/${id}`, { method: 'DELETE' }),

  schemes: (q: PageQuery & { category?: string; language?: string }) =>
    request<Paged<Scheme>>('/admin/schemes', { query: { ...q } }),
  createScheme: (body: SchemeInput) => request<Scheme>('/admin/schemes', { method: 'POST', body }),
  updateScheme: (id: string, body: Partial<SchemeInput>) =>
    request<Scheme>(`/admin/schemes/${id}`, { method: 'PUT', body }),
  deleteScheme: (id: string) => request<void>(`/admin/schemes/${id}`, { method: 'DELETE' }),

  auditLogs: (q: PageQuery & { entity?: string }) =>
    request<Paged<AuditLog>>('/admin/audit-logs', { query: { ...q } }),
};
