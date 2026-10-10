import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lon: number;
}

export class LocationError extends Error {
  constructor(readonly reason: 'denied' | 'failed') {
    super(`location ${reason}`);
  }
}

const ASKED_KEY = 'ks.locationAsked';
const FIX_TIMEOUT_MS = 8_000;
const deviceLocationKey = ['deviceLocation'] as const;

/** ~1 km precision: enough for weather, and keeps the weather query key stable as GPS jitters. */
const round = (n: number) => Math.round(n * 100) / 100;

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/**
 * Reads the phone's position. `ask` controls the permission prompt: automatic reads ask only once ever,
 * so a farmer who said no is not asked on every app start; a tap on "Use my location" always asks.
 */
async function readDeviceLocation(ask: 'once' | 'always'): Promise<Coords> {
  let perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted' && perm.canAskAgain) {
    const askedBefore = ask === 'once' && (await AsyncStorage.getItem(ASKED_KEY).catch(() => null));
    if (!askedBefore) {
      await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
      perm = await Location.requestForegroundPermissionsAsync();
    }
  }
  if (perm.status !== 'granted') throw new LocationError('denied');

  const pos =
    (await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
      FIX_TIMEOUT_MS,
    )) ?? (await Location.getLastKnownPositionAsync().catch(() => null));
  if (!pos) throw new LocationError('failed');
  return { lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) };
}

/** The phone's current location, shared by every screen and refreshed at most every 10 minutes. */
export function useDeviceLocation() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: deviceLocationKey,
    queryFn: () => readDeviceLocation('once'),
    staleTime: 10 * 60 * 1000,
    retry: false,
    // Never write the farmer's position to the offline cache.
    meta: { persist: false },
  });

  /** Ask again (with a permission prompt if needed); throws LocationError on failure. */
  const refresh = () =>
    qc.fetchQuery({ queryKey: deviceLocationKey, queryFn: () => readDeviceLocation('always'), staleTime: 0 });

  return {
    coords: query.data ?? null,
    /** True until the first attempt finishes, so screens can wait instead of flashing the farm's weather. */
    isPending: query.isPending,
    isLocating: query.isFetching,
    refresh,
  };
}
