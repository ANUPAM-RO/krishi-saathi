import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/api/hooks';
import type { AppNotification } from '@/api/types';
import { AppText, Button, FormError, Icon, QueryBoundary, Screen } from '@/components';
import { NOTIFICATION_ICONS } from '@/lib/enumUi';
import { errorMessage } from '@/lib/errors';
import { formatTimeAgo } from '@/lib/format';
import { hrefForNotificationData } from '@/lib/push';
import { colors, radius, spacing, touch } from '@/theme';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const query = useNotifications();
  const markAll = useMarkAllNotificationsRead();

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={{ icon: 'notifications-off-outline', message: t('notifications.none') }}
      >
        {(data) => (
          <>
            {data.unreadCount > 0 ? (
              <Button
                title={t('notifications.markAll')}
                variant="outline"
                size="medium"
                icon="checkmark-done"
                loading={markAll.isPending}
                onPress={() => markAll.mutate()}
              />
            ) : null}
            <FormError message={markAll.isError ? errorMessage(markAll.error, t) : null} />
            {data.items.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const { t } = useTranslation();
  const markRead = useMarkNotificationRead();
  const unread = !n.readAt;
  const href = hrefForNotificationData(n.data);

  const open = () => {
    if (unread) markRead.mutate(n.id);
    if (href) router.push(href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? `${t('notifications.unread')}: ` : ''}${n.title}`}
      onPress={open}
      style={({ pressed }) => [styles.item, unread && styles.unread, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.icon, unread && { backgroundColor: colors.primary }]}>
        <Icon name={NOTIFICATION_ICONS[n.type]} size={24} color={unread ? colors.onPrimary : colors.primaryDark} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <AppText variant="large" bold style={{ flex: 1 }}>
            {n.title}
          </AppText>
          {unread ? (
            <View style={styles.newPill}>
              <AppText variant="small" bold color={colors.onPrimary}>
                {t('notifications.unread')}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText>{n.message}</AppText>
        <AppText variant="small" muted>
          {`${t(`enums.notificationType.${n.type}`)} · ${formatTimeAgo(n.createdAt, t)}`}
        </AppText>
        {unread && !href ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => markRead.mutate(n.id)}
            style={styles.markRead}
            hitSlop={6}
          >
            <Icon name="checkmark" size={20} color={colors.primary} />
            <AppText bold color={colors.primary}>
              {t('notifications.markRead')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {href ? <Icon name="chevron-forward" size={22} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
  unread: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F4FBF4' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newPill: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: spacing.sm },
  markRead: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: touch.min, alignSelf: 'flex-start' },
});
