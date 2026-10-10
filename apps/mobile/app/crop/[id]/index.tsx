import { FARMER_CROP_STATUSES, type FarmerCropStatus } from '@krishi/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFarmerCrop, useUpdateFarmerCrop } from '@/api/hooks';
import type { FarmerCropDetail } from '@/api/types';
import {
  AppText,
  Button,
  Card,
  Chips,
  Divider,
  FormError,
  Icon,
  InfoRow,
  ListItem,
  ProgressBar,
  QueryBoundary,
  Screen,
  SectionHeader,
} from '@/components';
import { TaskItem } from '@/features/Cards';
import { ProfitView } from '@/features/ProfitView';
import { useLanguage } from '@/i18n/localized';
import { EXPENSE_ICONS, STATUS_COLORS } from '@/lib/enumUi';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export default function CropDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useFarmerCrop(id);
  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary query={query}>{(fc) => <CropDetailBody fc={fc} />}</QueryBoundary>
    </Screen>
  );
}

function CropDetailBody({ fc }: { fc: FarmerCropDetail }) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const update = useUpdateFarmerCrop();
  const [showStatus, setShowStatus] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const activities = [...fc.activities].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const upcoming = activities.filter((a) => !a.completed);
  const completed = activities.filter((a) => a.completed).reverse();
  const expenses = [...fc.expenses].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  const expenseTotal = fc.profit.totalExpenses;
  const statusColor = STATUS_COLORS[fc.status];
  const isOpen = fc.status === 'ACTIVE' || fc.status === 'PLANNED';

  const setStatus = (status: FarmerCropStatus) => {
    if (status === fc.status) return;
    update.mutate({ id: fc.id, body: { status } }, { onSuccess: () => setShowStatus(false) });
  };

  return (
    <>
      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{loc(fc.crop)}</AppText>
            <AppText muted>{fc.farm.name}</AppText>
          </View>
          <View style={[styles.pill, { borderColor: statusColor }]}>
            <AppText bold color={statusColor}>
              {t(`enums.cropStatus.${fc.status}`)}
            </AppText>
          </View>
        </View>
        <ProgressBar percent={fc.progressPercent} color={statusColor} />
        <AppText bold>{t('crops.progress', { n: Math.round(fc.progressPercent) })}</AppText>
        <InfoRow label={t('crops.sowingDate')} value={formatDate(fc.sowingDate, t)} />
        <InfoRow label={t('crops.expectedHarvest')} value={formatDate(fc.expectedHarvestDate, t)} />
        <InfoRow label={t('crops.area')} value={`${formatNumber(fc.area)} ${t(`enums.areaUnit.${fc.areaUnit}`)}`} />
        <InfoRow label={t('crops.season')} value={t(`enums.season.${fc.crop.season}`)} />
        {fc.notes ? <InfoRow label={t('crops.notes')} value={fc.notes} /> : null}
      </Card>

      {/* Status actions */}
      {isOpen ? (
        <Button
          title={t('crops.markHarvested')}
          icon="basket"
          variant="accent"
          loading={update.isPending && !showStatus}
          onPress={() => setStatus('HARVESTED')}
        />
      ) : null}
      <View style={styles.actions}>
        <Button
          title={t('crops.changeStatus')}
          variant="outline"
          size="medium"
          icon="swap-horizontal"
          style={{ flex: 1 }}
          onPress={() => setShowStatus((s) => !s)}
        />
        <Button
          title={t('crops.editEstimate')}
          variant="outline"
          size="medium"
          icon="create"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/crop/[id]/edit', params: { id: fc.id } })}
        />
      </View>
      {showStatus ? (
        <Card>
          <Chips
            label={t('crops.status')}
            value={fc.status}
            onChange={setStatus}
            options={FARMER_CROP_STATUSES.map((s) => ({ value: s, label: t(`enums.cropStatus.${s}`) }))}
          />
        </Card>
      ) : null}
      <FormError message={update.isError ? errorMessage(update.error, t) : null} />

      {/* Timeline */}
      <SectionHeader title={t('crops.upcomingTasks')} icon="calendar" />
      {upcoming.length === 0 ? (
        <Card>
          <AppText muted>{t('crops.noTasks')}</AppText>
        </Card>
      ) : (
        upcoming.map((a) => <TaskItem key={a.id} activity={a} showCrop={false} />)
      )}
      {completed.length > 0 ? (
        <>
          <SectionHeader
            title={`${t('crops.completedTasks')} (${completed.length})`}
            icon="checkmark-done"
            actionLabel={showDone ? t('common.close') : t('common.seeAll')}
            onAction={() => setShowDone((s) => !s)}
          />
          {(showDone ? completed : completed.slice(0, 2)).map((a) => (
            <TaskItem key={a.id} activity={a} showCrop={false} />
          ))}
        </>
      ) : null}

      {/* Expenses */}
      <SectionHeader
        title={t('crops.expenses')}
        icon="wallet"
        actionLabel={expenses.length > 0 ? t('common.seeAll') : undefined}
        onAction={() => router.push({ pathname: '/expenses', params: { farmerCropId: fc.id } })}
      />
      <Card>
        {expenses.length === 0 ? (
          <AppText muted>{t('crops.noExpenses')}</AppText>
        ) : (
          expenses.slice(0, 5).map((e) => (
            <View key={e.id} style={styles.expenseRow}>
              <View style={styles.expIcon}>
                <Icon name={EXPENSE_ICONS[e.category]} size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText bold>{t(`enums.expenseCategory.${e.category}`)}</AppText>
                <AppText variant="small" muted>
                  {formatDate(e.expenseDate, t, { short: true })}
                </AppText>
              </View>
              <AppText bold>{formatMoney(e.amount)}</AppText>
            </View>
          ))
        )}
        <Divider />
        <InfoRow strong label={t('expenses.total')} value={formatMoney(expenseTotal)} />
      </Card>
      <Button
        title={t('crops.addExpense')}
        icon="add-circle"
        variant="secondary"
        onPress={() => router.push({ pathname: '/expenses/new', params: { farmerCropId: fc.id } })}
      />

      {/* Profit (estimate) */}
      <ProfitView profit={fc.profit} />
      <ListItem
        icon="calculator"
        title={t('crops.viewProfit')}
        onPress={() => router.push({ pathname: '/crop/[id]/profit', params: { id: fc.id } })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  expIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
