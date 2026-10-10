import '@/i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import type { NotificationResponse } from 'expo-notifications';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NotificationData } from '@/api/types';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { AppText } from '@/components';
import { Notifications, hrefForNotificationData } from '@/lib/push';
import { queryClient, startQueryPersistence } from '@/lib/queryClient';
import { colors, fontSize } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** Keeps the farmer on the right part of the app for their sign-in / profile state. */
function useAuthGate() {
  const { status, needsProfile, languageChosen } = useAuth();
  const segments = useSegments();
  const top = segments[0];

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'signedOut') {
      if (top !== '(auth)') router.replace(languageChosen ? '/login' : '/language');
      return;
    }
    if (needsProfile) {
      if (top !== '(onboarding)') router.replace('/onboarding/profile');
      return;
    }
    if (top === '(auth)') router.replace('/');
  }, [status, needsProfile, languageChosen, top]);
}

/** Opens the right screen when a push notification is tapped (cold start or while running). */
function useNotificationRouting(ready: boolean) {
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!ready || !Notifications) return;
    const notifications = Notifications;
    const open = (response: NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      handled.current.add(id);
      const data = response.notification.request.content.data as NotificationData | undefined;
      const href = hrefForNotificationData(data);
      router.push(href ?? '/notifications');
      // Do not open the same notification again on the next app start.
      notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    let sub: { remove: () => void } | null = null;
    try {
      notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
      sub = notifications.addNotificationResponseReceivedListener(open);
    } catch {
      // Notifications unavailable on this platform.
    }
    return () => sub?.remove();
  }, [ready]);
}

function RootNavigator() {
  const { t } = useTranslation();
  const { status, needsProfile } = useAuth();
  const signedIn = status === 'signedIn';

  useEffect(() => startQueryPersistence(), []);
  useAuthGate();
  useNotificationRouting(signedIn && !needsProfile);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <AppText variant="display" color={colors.onPrimary}>
          {t('common.appName')}
        </AppText>
        <ActivityIndicator size="large" color={colors.onPrimary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.onPrimary,
          headerTitleStyle: { fontSize: fontSize.title, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        {/* Order matters: when a guard flips, the first allowed screen is shown. */}
        <Stack.Protected guard={signedIn && !needsProfile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('tabs.home') }} />
          <Stack.Screen name="farms/index" options={{ title: t('farms.title') }} />
          <Stack.Screen name="farms/new" options={{ title: t('farms.add') }} />
          <Stack.Screen name="farms/[id]/index" options={{ title: t('farms.details') }} />
          <Stack.Screen name="farms/[id]/edit" options={{ title: t('farms.edit') }} />
          <Stack.Screen name="crop/new" options={{ title: t('crops.add') }} />
          <Stack.Screen name="crop/[id]/index" options={{ title: t('crops.details') }} />
          <Stack.Screen name="crop/[id]/edit" options={{ title: t('crops.edit') }} />
          <Stack.Screen name="crop/[id]/profit" options={{ title: t('profit.title') }} />
          <Stack.Screen name="activity/[id]" options={{ title: t('tasks.detail') }} />
          <Stack.Screen name="expenses/index" options={{ title: t('expenses.title') }} />
          <Stack.Screen name="expenses/new" options={{ title: t('expenses.add') }} />
          <Stack.Screen name="expenses/[id]" options={{ title: t('expenses.edit') }} />
          <Stack.Screen name="weather" options={{ title: t('weather.title') }} />
          <Stack.Screen name="mandi-price/[cropId]" options={{ title: t('mandi.title') }} />
          <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
          <Stack.Screen name="advisories" options={{ title: t('advisories.title') }} />
          <Stack.Screen name="suppliers" options={{ title: t('suppliers.title') }} />
          <Stack.Screen name="schemes/index" options={{ title: t('schemes.title') }} />
          <Stack.Screen name="schemes/[id]" options={{ title: t('schemes.detailTitle') }} />
          <Stack.Screen name="settings/profile" options={{ title: t('profile.editTitle') }} />
          <Stack.Screen name="settings/language" options={{ title: t('language.settingsTitle') }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
});
