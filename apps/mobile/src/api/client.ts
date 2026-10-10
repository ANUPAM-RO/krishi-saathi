import { Platform } from 'react-native';
import type { ApiErrorBody, RefreshResponse } from './types';
import { clearTokens, loadTokens, saveTokens } from './tokens';

// 10.0.2.2 is the Android emulator's alias for the host machine; a browser needs localhost instead.
const configuredUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000/api';
export const API_URL = (
  Platform.OS === 'web' ? configuredUrl.replace('//10.0.2.2', '//localhost') : configuredUrl
).replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'auth';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(kind: ApiErrorKind, status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Send the bearer token and refresh on 401. Default true. */
  auth?: boolean;
  timeoutMs?: number;
}

let authFailureHandler: (() => void) | null = null;

/** Called when the session cannot be recovered (refresh failed). The auth context logs out. */
export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  let url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (query) {
    const parts = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (parts.length) url += `?${parts.join('&')}`;
  }
  return url;
}

async function send(url: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (controller.signal.aborted) throw new ApiError('timeout', 0, 'Request timed out');
    throw new ApiError('network', 0, e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFromResponse(res: Response, body: unknown): ApiError {
  const errBody = body && typeof body === 'object' ? (body as ApiErrorBody) : null;
  const raw = errBody?.message;
  const message = Array.isArray(raw) ? raw.join(', ') : raw || res.statusText || `HTTP ${res.status}`;
  return new ApiError(res.status === 401 ? 'auth' : 'http', res.status, message, errBody);
}

// A single in-flight refresh shared by every request that hits a 401 at the same time.
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  try {
    const res = await send(
      buildUrl('/auth/refresh'),
      { method: 'POST', body: { refreshToken: tokens.refreshToken } },
      null,
    );
    if (!res.ok) {
      // Only a rejected refresh token ends the session; server errors keep it for a later retry.
      if (res.status === 401 || res.status === 403 || res.status === 400) return null;
      throw errorFromResponse(res, await parseBody(res));
    }
    const data = (await parseBody(res)) as RefreshResponse;
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch (e) {
    if (isApiError(e)) throw e;
    throw new ApiError('network', 0, 'Refresh failed');
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function failSession(): Promise<never> {
  await clearTokens();
  authFailureHandler?.();
  throw new ApiError('auth', 401, 'Session expired');
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  const url = buildUrl(path, opts.query);

  let token: string | null = null;
  if (useAuth) {
    const tokens = await loadTokens();
    // Never hit the network for protected endpoints without a session.
    if (!tokens) throw new ApiError('auth', 401, 'Not signed in');
    token = tokens.accessToken;
  }

  let res = await send(url, opts, token);

  if (res.status === 401 && useAuth) {
    const newToken = await refreshAccessToken();
    if (!newToken) return failSession();
    res = await send(url, opts, newToken);
    if (res.status === 401) return failSession();
  }

  const body = await parseBody(res);
  if (!res.ok) throw errorFromResponse(res, body);
  return body as T;
}
