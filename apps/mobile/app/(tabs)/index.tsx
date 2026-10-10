import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '@/api/hooks';
import type { Dashboard } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  EstimateBadge,
  Icon,
  InfoRow,
  QueryBoundary,
  Screen,
  SectionHeader,
} from '@/components';
import { CropCard, MandiPriceCard, TaskItem, WeatherNow } from '@/features/Cards';
import { formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme';

function greetingKey(): 'home.greetingMorning' | 'home.greetingAfternoon' | 'home.greetingEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'home.greetingMorning';
  if (h < 17) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const query = useDashboard();
  const name = query.data?.user.name || user?.name || t('home.farmerFallback');

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <View>
        <AppText variant="large" muted>
          {t(greetingKey())},
        </AppText>
        <AppText variant="heading">{name}</AppText>
      </View>
      <QueryBoundary query={query}>{(data) => <DashboardBody data={data} />}</QueryBoundary>
    </Screen>
  );
}

function DashboardBody({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const profit = data.totals.estimatedProfit;

  return (
    <>
      {!data.hasFarms ? (
        <Card tone="primary">
          <EmptyState
            icon="map-outline"
            title={t('home.addFirstFarm')}
            message={t('home.addFirstFarmText')}
            actionLabel={t('farms.add')}
            onAction={() => router.push('/farms/new')}
          />
        </Card>
      ) : null}

      {data.overdueCount > 0 ? (
        <Card tone="danger" onPress={() => router.push({ pathname: '/tasks', params: { segment: 'overdue' } })}>
          <View style={styles.row}>
            <Icon name="alert-circle" size={30} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <AppText variant="large" bold color={colors.danger}>
                {t('home.overdue', { n: data.overdueCount })}
              </AppText>
              <AppText variant="small" bold>
                {t('home.viewOverdue')}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={24} color={colors.danger} />
          </View>
        </Card>
      ) : null}

      <SectionHeader
        title={t('home.todayTasks')}
        icon="today"
        actionLabel={t('common.seeAll')}
        onAction={() => router.push('/tasks')}
      />
      {data.todayTasks.length === 0 ? (
        <Card>
          <View style={styles.row}>
            <Icon name="checkmark-done-circle" size={28} color={colors.primary} />
            <AppText style={{ flex: 1 }}>{t('home.noTasksToday')}</AppText>
          </View>
        </Card>
      ) : (
        data.todayTasks.map((a) => <TaskItem key={a.id} activity={a} />)
      )}

      {data.upcomingTasks.length > 0 ? (
        <>
          <SectionHeader
            title={t('home.upcoming')}
            icon="calendar"
            actionLabel={t('common.seeAll')}
            onAction={() => router.push({ pathname: '/tasks', params: { segment: 'upcoming' } })}
          />
          {data.upcomingTasks.slice(0, 3).map((a) => (
            <TaskItem key={a.id} activity={a} />
          ))}
        </>
      ) : null}

      {data.weather ? (
        <WeatherNow
          current={data.weather.current}
          fetchedAt={data.weather.fetchedAt}
          isStale={data.weather.isStale}
          label={data.weather.location.label}
          onPress={() => router.push('/weather')}
        />
      ) : data.hasFarms ? (
        <Card tone="info" onPress={() => router.push('/weather')}>
          <View style={styles.row}>
            <Icon name="partly-sunny" size={28} color={colors.info} />
            <AppText style={{ flex: 1 }}>{t('home.weatherNotAvailable')}</AppText>
          </View>
        </Card>
      ) : null}

      {data.hasFarms ? (
        <>
          <SectionHeader
            title={t('home.activeCrops')}
            icon="leaf"
            actionLabel={t('crops.add')}
            onAction={() => router.push('/crop/new')}
          />
          {data.activeCrops.length === 0 ? (
            <Card>
              <AppText>{t('home.noActiveCrops')}</AppText>
              <Button title={t('crops.add')} icon="add-circle" onPress={() => router.push('/crop/new')} />
            </Card>
          ) : (
            data.activeCrops.map((fc) => <CropCard key={fc.id} farmerCrop={fc} />)
          )}
        </>
      ) : null}

      <SectionHeader
        title={t('home.mandiPrices')}
        icon="storefront"
        actionLabel={t('common.seeAll')}
        onAction={() => router.push('/mandi')}
      />
      {data.mandiPrices.length === 0 ? (
        <Card>
          <AppText muted>{t('home.noMandiPrices')}</AppText>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {data.mandiPrices.map((p) => (
            <MandiPriceCard
              key={p.id}
              price={p}
              compact
              onPress={() => router.push({ pathname: '/mandi-price/[cropId]', params: { cropId: p.crop.id } })}
            />
          ))}
        </ScrollView>
      )}

      {data.activeCrops.length > 0 ? (
        <Card tone="accent">
          <View style={styles.rowBetween}>
            <AppText variant="large" bold style={{ flex: 1 }}>
              {t('home.totals')}
            </AppText>
            <EstimateBadge />
          </View>
          <InfoRow label={t('profit.expenses')} value={formatMoney(data.totals.totalExpenses)} />
          <InfoRow
            label={t('profit.revenue')}
            value={data.totals.expectedRevenue != null ? formatMoney(data.totals.expectedRevenue) : t('profit.notAvailable')}
          />
          <InfoRow
            strong
            label={profit != null && profit < 0 ? t('profit.loss') : t('profit.profit')}
            value={profit != null ? formatMoney(profit) : t('profit.notAvailable')}
            color={profit == null ? undefined : profit < 0 ? colors.danger : colors.primaryDark}
          />
          <AppText variant="small" muted>
            {t('profit.disclaimer')}
          </AppText>
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strip: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg },
});
