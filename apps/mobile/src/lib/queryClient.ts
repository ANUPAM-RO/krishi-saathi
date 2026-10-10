import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  dehydrate,
  focusManager,
  hydrate,
  onlineManager,
  type DehydratedState,
} from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { isApiError } from '@/api/client';

const CACHE_KEY = 'ks.queryCache.v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SAVE_DEBOUNCE_MS = 1500;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Keep data around long enough to be persisted and shown offline.
      gcTime: MAX_AGE_MS,
      retry: (count, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return count < 2;
      },
    },
    mutations: {
      // Fail fast offline so the farmer sees a clear message instead of a spinner.
      networkMode: 'always',
      retry: false,
    },
  },
});

// React Query's online state follows NetInfo; paused queries resume when back online.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

// Refetch stale data when the app comes back to the foreground.
AppState.addEventListener('change', (status) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
});

interface PersistedCache {
  savedAt: number;
  state: DehydratedState;
}

/** Restore the last saved cache so screens can show data offline right away. */
export async function restoreQueryCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedCache;
    if (!parsed?.state || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return;
    }
    hydrate(queryClient, parsed.state);
  } catch {
    // A broken cache is not fatal; start fresh.
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistEnabled = true;

async function saveNow(): Promise<void> {
  if (!persistEnabled) return;
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (q) => q.state.status === 'success' && q.meta?.persist !== false,
      shouldDehydrateMutation: () => false,
    });
    const payload: PersistedCache = { savedAt: Date.now(), state };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or similar: offline cache is best effort.
  }
}

/** Start writing the cache to AsyncStorage (debounced) whenever a query updates. Returns an unsubscribe. */
export function startQueryPersistence(): () => void {
  persistEnabled = true;
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' && event.type !== 'removed') return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveNow(), SAVE_DEBOUNCE_MS);
  });
  return () => {
    unsubscribe();
    if (saveTimer) clearTimeout(saveTimer);
  };
}

/** Called on logout: wipe memory and disk so the next farmer never sees old data. */
export async function clearQueryCache(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  queryClient.clear();
  await AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
}
