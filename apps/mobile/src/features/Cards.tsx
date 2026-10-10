import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToggleActivity } from '@/api/hooks';
import type { Activity, ActivityWithCrop, FarmerCrop, MandiPrice, WeatherCurrent } from '@/api/types';
import { AppText, Card, Icon, ProgressBar } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { ACTIVITY_ICONS, STATUS_COLORS } from '@/lib/enumUi';
import { dateOnly, daysOld, formatDate, formatMoney, formatRelativeDay, formatTimeAgo, todayString } from '@/lib/format';
import { weatherVisual } from '@/lib/weather';
import { colors, radius, spacing, touch } from '@/theme';

// ---------------- Tasks ----------------

function hasCrop(a: Activity | ActivityWithCrop): a is ActivityWithCrop {
  return 'farmerCrop' in a && !!(a as ActivityWithCrop).farmerCrop;
}

export function TaskItem({ activity, showCrop = true }: { activity: Activity | ActivityWithCrop; showCrop?: boolean }) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const toggle = useToggleActivity();
  const day = dateOnly(activity.scheduledDate);
  const overdue = !activity.completed && day < todayString();
  const busy = toggle.isPending;
  const title = loc(activity, 'title') || t(`enums.activityType.${activity.activityType}`);
  const cropLine = showCrop && hasCrop(activity) ? `${loc(activity.farmerCrop.crop)} · ${activity.farmerCrop.farm.name}` : null;

  const open = () =>
    router.push({ pathname: '/activity/[id]', params: { id: activity.id, farmerCropId: activity.farmerCropId } });

  return (
    <View style={[styles.task, overdue && styles.taskOverdue, activity.completed && styles.taskDone]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={open}
        style={({ pressed }) => [styles.taskMain, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.taskIcon, { backgroundColor: overdue ? colors.dangerLight : colors.primaryLight }]}>
          <Icon
            name={ACTIVITY_ICONS[activity.activityType]}
            size={26}
            color={overdue ? colors.danger : colors.primaryDark}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText
            variant="large"
            bold
            style={activity.completed ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}
          >
            {title}
          </AppText>
          {cropLine ? <AppText variant="small">{cropLine}</AppText> : null}
          <AppText variant="small" bold={overdue} color={overdue ? colors.danger : colors.textMuted}>
            {activity.completed && activity.completedAt
              ? t('tasks.doneOn', { date: formatDate(activity.completedAt, t, { short: true }) })
              : overdue
                ? `${t('tasks.statusOverdue')} · ${formatRelativeDay(day, t)}`
                : formatRelativeDay(day, t)}
          </AppText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: activity.completed, busy }}
        accessibilityLabel={activity.completed ? t('tasks.markNotDone') : t('tasks.markDone')}
        onPress={busy ? undefined : () => toggle.mutate({ id: activity.id, done: !activity.completed })}
        style={({ pressed }) => [
          styles.check,
          activity.completed && styles.checkDone,
          pressed && { opacity: 0.7 },
        ]}
        hitSlop={6}
      >
        {busy ? (
          <ActivityIndicator color={activity.completed ? colors.onPrimary : colors.primary} />
        ) : (
          <Icon
            name={activity.completed ? 'checkmark' : 'checkmark-outline'}
            size={30}
            color={activity.completed ? colors.onPrimary : colors.primary}
          />
        )}
      </Pressable>
    </View>
  );
}

// ---------------- Crops ----------------

export function CropCard({ farmerCrop }: { farmerCrop: FarmerCrop }) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const fc = farmerCrop;
  const statusColor = STATUS_COLORS[fc.status];
  return (
    <Card
      onPress={() => router.push({ pathname: '/crop/[id]', params: { id: fc.id } })}
      accessibilityLabel={`${loc(fc.crop)}, ${fc.farm.name}`}
    >
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">{loc(fc.crop)}</AppText>
          <AppText variant="small" muted>
            {fc.farm.name}
          </AppText>
        </View>
        <View style={[styles.pill, { borderColor: statusColor }]}>
          <AppText variant="small" bold color={statusColor}>
            {t(`enums.cropStatus.${fc.status}`)}
          </AppText>
        </View>
      </View>
      <ProgressBar percent={fc.progressPercent} color={statusColor} />
      <AppText variant="small" bold>
        {t('crops.progress', { n: Math.round(fc.progressPercent) })}
      </AppText>
      <View style={styles.rowBetween}>
        <AppText variant="small" muted>
          {t('crops.sownOn', { date: formatDate(fc.sowingDate, t, { short: true }) })}
        </AppText>
        <AppText variant="small" muted>
          {t('crops.harvestOn', { date: formatDate(fc.expectedHarvestDate, t, { short: true }) })}
        </AppText>
      </View>
      {fc.nextActivity && (fc.status === 'ACTIVE' || fc.status === 'PLANNED') ? (
        <View style={styles.next}>
          <Icon name={ACTIVITY_ICONS[fc.nextActivity.activityType]} size={20} color={colors.primaryDark} />
          <AppText variant="small" bold style={{ flex: 1 }}>
            {t('crops.nextTask', {
              title: loc(fc.nextActivity, 'title'),
              date: formatRelativeDay(fc.nextActivity.scheduledDate, t),
            })}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

// ---------------- Mandi ----------------

export function priceFreshness(priceDate: string, t: ReturnType<typeof useTranslation>['t']) {
  const age = daysOld(priceDate);
  return {
    old: age > 3,
    label: age > 1 ? t('mandi.oldPrice', { n: age }) : t('mandi.freshPrice', { date: formatRelativeDay(priceDate, t) }),
  };
}

export function MandiPriceCard({
  price,
  compact,
  showCrop = true,
  onPress,
}: {
  price: MandiPrice;
  compact?: boolean;
  showCrop?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const fresh = priceFreshness(price.priceDate, t);
  const unit = t(`enums.priceUnit.${price.unit}`);
  return (
    <Card onPress={onPress} style={compact ? styles.compactCard : undefined} tone={compact ? 'accent' : 'default'}>
      {showCrop ? (
        <AppText variant={compact ? 'large' : 'title'} bold numberOfLines={1}>
          {loc(price.crop)}
        </AppText>
      ) : null}
      <AppText variant="small" muted numberOfLines={compact ? 1 : 2}>
        {compact ? price.mandi.name : `${price.mandi.name}, ${price.mandi.district}`}
      </AppText>
      <AppText variant={compact ? 'title' : 'heading'} color={colors.primaryDark}>
        {formatMoney(price.price)}
        <AppText variant="small" muted>{` ${t('mandi.perUnit', { unit })}`}</AppText>
      </AppText>
      {!compact && price.minPrice != null && price.maxPrice != null ? (
        <AppText variant="small">
          {t('mandi.minMax', {
            min: formatMoney(price.minPrice).replace('₹', ''),
            max: formatMoney(price.maxPrice).replace('₹', ''),
          })}
        </AppText>
      ) : null}
      <View style={styles.row}>
        <Icon name="time-outline" size={16} color={fresh.old ? colors.warning : colors.textMuted} />
        <AppText variant="small" bold={fresh.old} color={fresh.old ? colors.warning : colors.textMuted}>
          {fresh.label}
        </AppText>
      </View>
    </Card>
  );
}

// ---------------- Weather ----------------

export function WeatherNow({
  current,
  fetchedAt,
  isStale,
  label,
  onPress,
}: {
  current: WeatherCurrent;
  fetchedAt: string;
  isStale: boolean;
  label?: string | null;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const visual = weatherVisual(current.weatherCode);
  return (
    <Card tone="info" onPress={onPress} accessibilityLabel={t('weather.title')}>
      {label ? (
        <View style={styles.row}>
          <Icon name="location-outline" size={18} color={colors.textMuted} />
          <AppText variant="small" muted>
            {label}
          </AppText>
        </View>
      ) : null}
      <View style={styles.row}>
        <Icon name={visual.icon} size={56} color={visual.color} />
        <View style={{ flex: 1 }}>
          <AppText variant="display">{`${Math.round(current.temperature)}°C`}</AppText>
          <AppText variant="large" bold>
            {t(`weather.codes.${visual.key}`)}
          </AppText>
        </View>
      </View>
      <View style={styles.weatherStats}>
        <Stat icon="umbrella" label={t('weather.rainChance')} value={`${Math.round(current.rainProbability)}%`} />
        <Stat icon="water-outline" label={t('weather.humidity')} value={`${Math.round(current.humidity)}%`} />
        <Stat icon="flag-outline" label={t('weather.wind')} value={`${Math.round(current.windSpeed)} km/h`} />
      </View>
      <AppText variant="small" muted>
        {t('time.updated', { time: formatTimeAgo(fetchedAt, t) })}
      </AppText>
      {isStale ? <StaleWarning /> : null}
    </Card>
  );
}

export function StaleWarning() {
  const { t } = useTranslation();
  return (
    <View style={styles.stale} accessibilityRole="alert">
      <Icon name="warning" size={20} color={colors.warning} />
      <AppText variant="small" bold color={colors.warning} style={{ flex: 1 }}>
        {t('weather.stale')}
      </AppText>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: 'umbrella' | 'water-outline' | 'flag-outline'; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={22} color={colors.info} />
      <AppText variant="large" bold>
        {value}
      </AppText>
      <AppText variant="small" muted center numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  taskOverdue: { borderColor: '#EF9A9A', borderLeftWidth: 5, borderLeftColor: colors.danger },
  taskDone: { backgroundColor: colors.surfaceMuted },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touch.primary },
  taskIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: touch.primary,
    height: touch.primary,
    borderRadius: touch.primary / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkDone: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  pill: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  compactCard: { width: 190 },
  weatherStats: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  stale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
});
