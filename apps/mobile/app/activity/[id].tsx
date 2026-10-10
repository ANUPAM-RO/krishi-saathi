import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useActivityLookup, useFarmerCrop, useToggleActivity } from '@/api/hooks';
import type { Activity, ActivityWithCrop } from '@/api/types';
import { AppText, Button, Card, EmptyState, FormError, Icon, InfoRow, QueryBoundary, Screen } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { ACTIVITY_ICONS } from '@/lib/enumUi';
import { errorMessage } from '@/lib/errors';
import { dateOnly, formatDate, formatRelativeDay, todayString } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ActivityDetailScreen() {
  const { t } = useTranslation();
  const { id, farmerCropId } = useLocalSearchParams<{ id: string; farmerCropId?: string }>();
  const query = useActivityLookup(id, farmerCropId);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary
        query={query}
        isEmpty={(a) => a === null}
        empty={{ icon: 'help-circle-outline', title: t('errors.notFound') }}
      >
        {(activity) => (activity ? <ActivityBody activity={activity} /> : <EmptyState />)}
      </QueryBoundary>
    </Screen>
  );
}

function ActivityBody({ activity }: { activity: Activity | ActivityWithCrop }) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const toggle = useToggleActivity();
  // Crop info comes with list results; otherwise read it from the crop (usually cached).
  const embedded = 'farmerCrop' in activity ? (activity as ActivityWithCrop).farmerCrop : null;
  const cropQuery = useFarmerCrop(embedded ? undefined : activity.farmerCropId);
  const cropName = embedded ? loc(embedded.crop) : cropQuery.data ? loc(cropQuery.data.crop) : null;
  const farmName = embedded?.farm.name ?? cropQuery.data?.farm.name ?? null;

  // The toggle response is the fresh activity; prefer it until the lookup refetches.
  const current: Activity = toggle.data && toggle.data.id === activity.id ? { ...activity, ...toggle.data } : activity;
  const day = dateOnly(current.scheduledDate);
  const overdue = !current.completed && day < todayString();
  const description = loc(current, 'description');

  const statusLabel = current.completed
    ? t('tasks.statusDone')
    : overdue
      ? t('tasks.statusOverdue')
      : t('tasks.statusPending');
  const statusColor = current.completed ? colors.primary : overdue ? colors.danger : colors.warning;

  return (
    <>
      <Card>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Icon name={ACTIVITY_ICONS[current.activityType]} size={36} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{loc(current, 'title')}</AppText>
            <AppText muted>{t(`enums.activityType.${current.activityType}`)}</AppText>
          </View>
        </View>
        <InfoRow label={t('expenses.date')} value={`${formatRelativeDay(day, t)} (${formatDate(day, t)})`} />
        <InfoRow label={t('crops.status')} value={statusLabel} color={statusColor} strong />
        {current.completed && current.completedAt ? (
          <InfoRow label={t('tasks.statusDone')} value={formatDate(current.completedAt, t)} />
        ) : null}
        {cropName ? <InfoRow label={t('common.crop')} value={cropName} /> : null}
        {farmName ? <InfoRow label={t('common.farm')} value={farmName} /> : null}
      </Card>

      <Card tone="primary">
        <AppText variant="large" bold>
          {t('tasks.description')}
        </AppText>
        <AppText variant="large">{description || t('tasks.noDescription')}</AppText>
      </Card>

      <FormError message={toggle.isError ? errorMessage(toggle.error, t) : null} />
      {current.completed ? (
        <Button
          title={t('tasks.markNotDone')}
          variant="outline"
          icon="arrow-undo"
          loading={toggle.isPending}
          onPress={() => toggle.mutate({ id: current.id, done: false })}
        />
      ) : (
        <Button
          title={t('tasks.markDone')}
          icon="checkmark-circle"
          loading={toggle.isPending}
          onPress={() => toggle.mutate({ id: current.id, done: true })}
        />
      )}
      <Button
        title={t('tasks.openCrop')}
        variant="ghost"
        size="medium"
        icon="leaf"
        onPress={() => router.push({ pathname: '/crop/[id]', params: { id: current.farmerCropId } })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
