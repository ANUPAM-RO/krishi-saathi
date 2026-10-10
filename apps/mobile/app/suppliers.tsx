import { SUPPLIER_CATEGORIES, type SupplierCategory } from '@krishi/shared';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SupplierQuery } from '@/api/endpoints';
import { useNearbySuppliers } from '@/api/hooks';
import type { Supplier } from '@/api/types';
import { AppText, Button, Card, Chips, Icon, LoadingState, QueryBoundary, Screen } from '@/components';
import { SUPPLIER_ICONS } from '@/lib/enumUi';
import { formatNumber } from '@/lib/format';
import { useDeviceLocation } from '@/lib/location';
import { colors, radius, spacing } from '@/theme';

type Filter = SupplierCategory | 'ALL';

const openUrl = (url: string) => void Linking.openURL(url).catch(() => undefined);

export default function SuppliersScreen() {
  const { t } = useTranslation();
  const device = useDeviceLocation();
  const [category, setCategory] = useState<Filter>('ALL');

  // Nearest to the phone when location is available; otherwise the API measures from the farm.
  const q: SupplierQuery = {
    ...(device.coords ? { lat: device.coords.lat, lon: device.coords.lon } : {}),
    ...(category !== 'ALL' ? { category } : {}),
  };
  const query = useNearbySuppliers(q, !device.isPending);

  const options = [
    { value: 'ALL' as const, label: t('suppliers.all'), icon: 'apps' as const },
    ...SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: t(`enums.supplierCategory.${c}`), icon: SUPPLIER_ICONS[c] })),
  ];

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chips<Filter> value={category} onChange={setCategory} options={options} />
      </ScrollView>

      {device.isPending ? (
        <LoadingState />
      ) : (
        <QueryBoundary
          query={query}
          isEmpty={(d) => d.items.length === 0}
          empty={{ icon: 'storefront-outline', message: t('suppliers.none') }}
        >
          {(data) => (
            <>
              <AppText variant="small" muted>
                {t('suppliers.near', {
                  place: device.coords ? t('weather.myLocation') : data.location.label,
                  km: data.radiusKm,
                })}
              </AppText>
              {data.items.map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
            </>
          )}
        </QueryBoundary>
      )}
    </Screen>
  );
}

function SupplierCard({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation();
  const place = [s.village, s.district].filter(Boolean).join(', ');
  const distance = s.distanceKm != null ? t('suppliers.distance', { km: formatNumber(s.distanceKm, 1) }) : t('suppliers.inDistrict');

  return (
    <Card>
      <View style={styles.titleRow}>
        <AppText variant="title" style={{ flex: 1 }}>
          {s.name}
        </AppText>
        {s.isVerified ? (
          <View style={styles.verified} accessibilityLabel={t('suppliers.verified')}>
            <Icon name="checkmark-circle" size={18} color={colors.primary} />
            <AppText variant="small" bold color={colors.primaryDark}>
              {t('suppliers.verified')}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.tags}>
        {s.categories.map((c) => (
          <View key={c} style={styles.tag}>
            <Icon name={SUPPLIER_ICONS[c]} size={16} color={colors.primaryDark} />
            <AppText variant="small" color={colors.primaryDark}>
              {t(`enums.supplierCategory.${c}`)}
            </AppText>
          </View>
        ))}
      </View>

      {s.description ? <AppText>{s.description}</AppText> : null}

      <View style={styles.meta}>
        <Icon name="location" size={18} color={colors.textMuted} />
        <AppText variant="small" muted style={{ flex: 1 }}>
          {[distance, place].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      {s.contactPerson ? (
        <AppText variant="small" muted>
          {t('suppliers.contact', { name: s.contactPerson })}
        </AppText>
      ) : null}

      {s.phone || (s.latitude != null && s.longitude != null) ? (
        <View style={styles.actions}>
          {s.phone ? (
            <Button
              title={t('suppliers.call')}
              icon="call"
              size="medium"
              style={{ flex: 1 }}
              onPress={() => openUrl(`tel:${s.phone!.replace(/[^\d+]/g, '')}`)}
            />
          ) : null}
          {s.latitude != null && s.longitude != null ? (
            <Button
              title={t('suppliers.directions')}
              icon="navigate"
              variant="outline"
              size="medium"
              style={{ flex: 1 }}
              onPress={() => openUrl(`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`)}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
