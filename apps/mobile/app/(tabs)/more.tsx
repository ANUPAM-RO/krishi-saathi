import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Card, ListItem, Screen } from '@/components';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { colors, spacing } from '@/theme';

export default function MoreScreen() {
  const { t } = useTranslation();
  const { user, language, signOut } = useAuth();
  const unread = useNotifications().data?.unreadCount ?? 0;
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = () =>
    Alert.alert(t('more.logoutTitle'), t('more.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.logout'),
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await signOut();
        },
      },
    ]);

  return (
    <Screen edges={[]}>
      {user ? (
        <Card tone="primary" onPress={() => router.push('/settings/profile')}>
          <AppText variant="title">{user.name}</AppText>
          <AppText muted>{displayPhone(user.phone)}</AppText>
          {user.village || user.district ? (
            <AppText variant="small">{[user.village, user.district].filter(Boolean).join(', ')}</AppText>
          ) : null}
        </Card>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <ListItem icon="map" title={t('more.farms')} onPress={() => router.push('/farms')} />
        <ListItem
          icon="wallet"
          iconBg={colors.accentLight}
          iconColor={colors.accent}
          title={t('more.expenses')}
          onPress={() => router.push('/expenses')}
        />
        <ListItem
          icon="partly-sunny"
          iconBg={colors.infoLight}
          iconColor={colors.info}
          title={t('more.weather')}
          onPress={() => router.push('/weather')}
        />
        <ListItem
          icon="notifications"
          title={t('more.notifications')}
          badge={unread}
          onPress={() => router.push('/notifications')}
        />
        <ListItem icon="bulb" title={t('more.advisories')} onPress={() => router.push('/advisories')} />
        <ListItem
          icon="storefront"
          iconBg={colors.accentLight}
          iconColor={colors.accent}
          title={t('more.suppliers')}
          subtitle={t('more.suppliersHint')}
          onPress={() => router.push('/suppliers')}
        />
        <ListItem
          icon="business"
          iconBg={colors.infoLight}
          iconColor={colors.info}
          title={t('more.schemes')}
          subtitle={t('more.schemesHint')}
          onPress={() => router.push('/schemes')}
        />
        <ListItem icon="person-circle" title={t('more.profile')} onPress={() => router.push('/settings/profile')} />
        <ListItem
          icon="language"
          title={t('more.language')}
          subtitle={LANGUAGE_NATIVE_NAMES[language]}
          onPress={() => router.push('/settings/language')}
        />
        <ListItem
          icon="log-out"
          title={loggingOut ? t('common.loading') : t('more.logout')}
          danger
          onPress={loggingOut ? undefined : confirmLogout}
        />
      </View>
    </Screen>
  );
}
