import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type { Href } from 'expo-router';
import { Platform } from 'react-native';
import { api } from '@/api/endpoints';
import type { NotificationData } from '@/api/types';

const PUSH_TOKEN_KEY = 'ks.pushToken';

/**
 * expo-notifications throws on import in Expo Go on Android (SDK 53+), which breaks every route
 * that imports it. Load it lazily and treat it as unavailable there; use a development build to test push.
 */
const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const Notifications: typeof import('expo-notifications') | null = (() => {
  if (isExpoGoAndroid) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
})();

// Show notifications as banners while the app is open.
try {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Unsupported platform (e.g. web): ignore.
}

function readProjectId(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Ask for permission, get the Expo push token and register it with the API.
 * Never throws: emulators, missing projectId, denied permission and network errors are all ignored.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Notifications || Platform.OS === 'web' || !Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Krishi Saathi',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#2E7D32',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return null;

    const projectId = readProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return null;

    await api.farmer.registerDeviceToken(token, Platform.OS);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (e) {
    if (__DEV__) console.log('[push] registration skipped:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Best effort: tell the API to stop sending pushes to this device (call before clearing tokens). */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    await api.farmer.removeDeviceToken(token);
  } catch {
    // ignore
  }
}

/** Where a notification should take the farmer, based on its `data` payload. */
export function hrefForNotificationData(data: NotificationData | null | undefined): Href | null {
  if (!data) return null;
  const activityId = typeof data.activityId === 'string' ? data.activityId : undefined;
  const farmerCropId = typeof data.farmerCropId === 'string' ? data.farmerCropId : undefined;
  if (activityId) {
    return {
      pathname: '/activity/[id]',
      params: farmerCropId ? { id: activityId, farmerCropId } : { id: activityId },
    };
  }
  if (farmerCropId) return { pathname: '/crop/[id]', params: { id: farmerCropId } };
  return null;
}
