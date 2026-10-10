import { EXPENSE_CATEGORIES } from '@krishi/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useExpenses, useFarmerCrops } from '@/api/hooks';
import { AppText, Button, Card, Chips, Divider, InfoRow, ListItem, QueryBoundary, Screen, SectionHeader } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { EXPENSE_ICONS } from '@/lib/enumUi';
import { formatDate, formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme';

const ALL = '__all__';

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const params = useLocalSearchParams<{ farmerCropId?: string }>();
  const [cropFilter, setCropFilter] = useState<string>(params.farmerCropId || ALL);
  const crops = useFarmerCrops();
  const query = useExpenses(cropFilter === ALL ? undefined : cropFilter);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Button
        title={t('expenses.add')}
        icon="add-circle"
        onPress={() =>
          router.push({
            pathname: '/expenses/new',
            params: cropFilter === ALL ? {} : { farmerCropId: cropFilter },
          })
        }
      />
      {(crops.data?.length ?? 0) > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">{t('expenses.crop')}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chips
              value={cropFilter}
              onChange={setCropFilter}
              options={[
                { value: ALL, label: t('expenses.allCrops') },
                ...(crops.data ?? []).map((fc) => ({ value: fc.id, label: `${loc(fc.crop)} · ${fc.farm.name}` })),
              ]}
            />
          </ScrollView>
        </View>
      ) : null}

      <QueryBoundary
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={{ icon: 'wallet-outline', message: t('expenses.none') }}
      >
        {(data) => (
          <>
            <Card tone="accent">
              <AppText variant="small" muted>
                {t('expenses.total')}
              </AppText>
              <AppText variant="display" color={colors.accent}>
                {formatMoney(data.total)}
              </AppText>
              <Divider />
              <AppText bold>{t('expenses.byCategory')}</AppText>
              {EXPENSE_CATEGORIES.filter((c) => (data.byCategory[c] ?? 0) > 0).map((c) => (
                <InfoRow key={c} label={t(`enums.expenseCategory.${c}`)} value={formatMoney(data.byCategory[c] ?? 0)} />
              ))}
            </Card>
            <SectionHeader title={t('expenses.title')} icon="list" />
            {[...data.items]
              .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
              .map((e) => (
                <ListItem
                  key={e.id}
                  icon={EXPENSE_ICONS[e.category]}
                  iconBg={colors.accentLight}
                  iconColor={colors.accent}
                  title={`${t(`enums.expenseCategory.${e.category}`)} · ${formatMoney(e.amount)}`}
                  subtitle={[
                    formatDate(e.expenseDate, t),
                    `${loc(e.farmerCrop.crop)} (${e.farmerCrop.farm.name})`,
                    e.description,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => router.push({ pathname: '/expenses/[id]', params: { id: e.id } })}
                />
              ))}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
