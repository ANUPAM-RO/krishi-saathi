'use client';

// Client-side session store backed by localStorage.
// Tradeoff (MVP): tokens in localStorage are readable by any script on the page, so an XSS bug
// could leak them. An httpOnly-cookie BFF would be safer; it is out of scope for this MVP.

import { useSyncExternalStore } from 'react';
import type { User } from './types';

const STORAGE_KEY = 'krishi-admin-session';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedRaw: string | null | undefined;
let cachedSession: Session | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as Session) : null;
      cachedSession = parsed && parsed.accessToken && parsed.refreshToken && parsed.user ? parsed : null;
    } catch {
      cachedSession = null;
    }
  }
  return cachedSession;
}

function emit() {
  listeners.forEach((l) => l());
}

export function setSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode etc.) - the session simply won't persist.
  }
  emit();
}

export function updateTokens(accessToken: string, refreshToken: string): void {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, accessToken, refreshToken });
}

export function clearSession(): void {
  setSession(null);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Current session; `null` during SSR and the hydration render, then the stored value. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
