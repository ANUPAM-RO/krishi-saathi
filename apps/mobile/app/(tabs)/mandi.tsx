import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCropCatalog, useMandiPrices, useMandis } from '@/api/hooks';
import { AppText, Chips, QueryBoundary, Screen } from '@/components';
import { MandiPriceCard } from '@/features/Cards';
import { useLanguage } from '@/i18n/localized';
import { formatTimeAgo } from '@/lib/format';
import { spacing } from '@/theme';

const ALL = '__all__';

export default function MandiScreen() {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const [cropId, setCropId] = useState<string>(ALL);
  const [district, setDistrict] = useState<string>(ALL);
  const crops = useCropCatalog();
  const mandis = useMandis();
  const query = useMandiPrices({
    cropId: cropId === ALL ? undefined : cropId,
    district: district === ALL ? undefined : district,
  });

  const districts = useMemo(
    () => [...new Set((mandis.data ?? []).map((m) => m.district))].sort((a, b) => a.localeCompare(b)),
    [mandis.data],
  );

  const refresh = () => {
    void query.refetch();
    void mandis.refetch();
  };

  return (
    <Screen edges={[]} onRefresh={refresh} refreshing={query.isRefetching}>
      <View style={styles.filter}>
        <AppText variant="label">{t('mandi.filterCrop')}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chips
            value={cropId}
            onChange={setCropId}
            options={[
              { value: ALL, label: t('mandi.allCrops') },
              ...(crops.data ?? []).map((c) => ({ value: c.id, label: loc(c) })),
            ]}
          />
        </ScrollView>
      </View>
      {districts.length > 1 ? (
        <View style={styles.filter}>
          <AppText variant="label">{t('mandi.filterDistrict')}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chips
              value={district}
              onChange={setDistrict}
              options={[{ value: ALL, label: t('mandi.allDistricts') }, ...districts.map((d) => ({ value: d, label: d }))]}
            />
          </ScrollView>
        </View>
      ) : null}

      <QueryBoundary
        query={query}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: 'storefront-outline', message: t('mandi.none') }}
      >
        {(list) => (
          <>
            <AppText variant="small" muted>
              {t('time.updated', { time: formatTimeAgo(new Date(query.dataUpdatedAt).toISOString(), t) })}
            </AppText>
            {list.map((p) => (
              <MandiPriceCard
                key={p.id}
                price={p}
                onPress={() =>
                  router.push({
                    pathname: '/mandi-price/[cropId]',
                    params: district === ALL ? { cropId: p.crop.id } : { cropId: p.crop.id, district },
                  })
                }
              />
            ))}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: { gap: spacing.sm },
});
