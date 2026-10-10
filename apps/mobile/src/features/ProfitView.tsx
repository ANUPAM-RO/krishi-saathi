import { EXPENSE_CATEGORIES } from '@krishi/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Profit } from '@/api/types';
import { AppText, Card, Divider, EstimateBadge, Icon, InfoRow } from '@/components';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { colors, spacing } from '@/theme';

/** Revenue / expenses / profit with the assumptions behind them. Always labelled as an estimate. */
export function ProfitView({ profit, showCategories = false }: { profit: Profit; showCategories?: boolean }) {
  const { t } = useTranslation();
  const a = profit.assumptions;
  const p = profit.estimatedProfit;
  const isLoss = p != null && p < 0;

  return (
    <>
      <Card tone="accent">
        <View style={styles.rowBetween}>
          <AppText variant="title" style={{ flex: 1 }}>
            {t('profit.title')}
          </AppText>
          <EstimateBadge />
        </View>
        <InfoRow
          label={t('profit.revenue')}
          value={profit.expectedRevenue != null ? formatMoney(profit.expectedRevenue) : t('profit.notAvailable')}
        />
        <InfoRow label={t('profit.expenses')} value={`− ${formatMoney(profit.totalExpenses)}`} />
        <Divider />
        <InfoRow
          strong
          label={isLoss ? t('profit.loss') : t('profit.profit')}
          value={p != null ? formatMoney(p) : t('profit.notAvailable')}
          color={p == null ? undefined : isLoss ? colors.danger : colors.primaryDark}
        />
        {profit.expectedRevenue == null ? (
          <AppText variant="small" color={colors.warning} bold>
            {t('profit.missingData')}
          </AppText>
        ) : null}
        <View style={styles.disclaimer}>
          <Icon name="information-circle" size={22} color={colors.warning} />
          <AppText variant="small" style={{ flex: 1 }}>
            {t('profit.disclaimer')}
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="large" bold>
          {t('profit.assumptions')}
        </AppText>
        <InfoRow label={t('profit.area')} value={t('profit.areaAcres', { n: formatNumber(a.areaInAcres) })} />
        <InfoRow
          label={t('profit.yield')}
          value={a.yieldQuintals != null ? t('profit.yieldValue', { n: formatNumber(a.yieldQuintals) }) : t('profit.notAvailable')}
        />
        <InfoRow
          label={t('profit.yieldSource')}
          value={a.yieldSource ? t(`profit.sources.${a.yieldSource}`) : t('profit.notAvailable')}
        />
        <InfoRow
          label={t('profit.price')}
          value={
            a.pricePerQuintal != null
              ? `${formatMoney(a.pricePerQuintal)} / ${t('common.quintal')}`
              : t('profit.notAvailable')
          }
        />
        <InfoRow
          label={t('profit.priceSource')}
          value={a.priceSource ? t(`profit.sources.${a.priceSource}`) : t('profit.notAvailable')}
        />
        {a.priceSource === 'MANDI' ? (
          <>
            {a.mandiName ? <InfoRow label={t('profit.mandi')} value={a.mandiName} /> : null}
            {a.priceDate ? <InfoRow label={t('profit.priceDate')} value={formatDate(a.priceDate, t)} /> : null}
          </>
        ) : null}
      </Card>

      {showCategories ? (
        <Card>
          <AppText variant="large" bold>
            {t('profit.byCategory')}
          </AppText>
          {EXPENSE_CATEGORIES.filter((c) => (profit.byCategory[c] ?? 0) > 0).map((c) => (
            <InfoRow key={c} label={t(`enums.expenseCategory.${c}`)} value={formatMoney(profit.byCategory[c] ?? 0)} />
          ))}
          <Divider />
          <InfoRow strong label={t('expenses.total')} value={formatMoney(profit.totalExpenses)} />
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disclaimer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: 8,
  },
});
