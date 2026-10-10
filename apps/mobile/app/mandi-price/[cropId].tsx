import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMandiCropPrices } from '@/api/hooks';
import { AppText, Card, QueryBoundary, Screen, SectionHeader } from '@/components';
import { MandiPriceCard } from '@/features/Cards';
import { useLanguage } from '@/i18n/localized';
import { formatDate, formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function MandiCropScreen() {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const { cropId, district } = useLocalSearchParams<{ cropId: string; district?: string }>();
  const query = useMandiCropPrices(cropId, district);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary query={query}>
        {(data) => {
          const history = [...data.history].sort((a, b) => b.date.localeCompare(a.date));
          const max = Math.max(1, ...history.map((h) => h.avgPrice));
          return (
            <>
              <AppText variant="heading">{loc(data.crop)}</AppText>
              {district ? <AppText muted>{district}</AppText> : null}

              <SectionHeader title={t('mandi.latest')} icon="storefront" />
              {data.latest.length === 0 ? (
                <Card>
                  <AppText muted>{t('mandi.none')}</AppText>
                </Card>
              ) : (
                data.latest.map((p) => <MandiPriceCard key={p.id} price={p} showCrop={false} />)
              )}

              <SectionHeader title={t('mandi.history')} icon="trending-up" />
              <Card style={{ gap: 0 }}>
                {history.length === 0 ? (
                  <AppText muted>{t('mandi.noHistory')}</AppText>
                ) : (
                  history.map((h, i) => (
                    <View key={h.date} style={[styles.row, i > 0 && styles.border]}>
                      <AppText style={{ width: 96 }}>{formatDate(h.date, t, { short: true })}</AppText>
                      {/* Simple bar so the trend is visible without a chart library. */}
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { width: `${Math.round((h.avgPrice / max) * 100)}%` }]} />
                      </View>
                      <AppText bold style={styles.price}>
                        {formatMoney(h.avgPrice)}
                      </AppText>
                    </View>
                  ))
                )}
              </Card>
            </>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.surfaceMuted, borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: '#A1887F', borderRadius: 5 },
  price: { minWidth: 76, textAlign: 'right' },
});
