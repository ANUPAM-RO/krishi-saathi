import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDeleteFarm, useFarm } from '@/api/hooks';
import { AppText, Button, Card, FormError, Icon, InfoRow, QueryBoundary, Screen, SectionHeader } from '@/components';
import { CropCard } from '@/features/Cards';
import { errorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function FarmDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useFarm(id);
  const del = useDeleteFarm();

  const confirmDelete = () =>
    Alert.alert(t('farms.deleteTitle'), t('farms.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          del.mutate(id, {
            onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/farms')),
          }),
      },
    ]);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary query={query}>
        {(farm) => (
          <>
            <Card>
              <View style={styles.row}>
                <Icon name="map" size={32} color={colors.primaryDark} />
                <AppText variant="heading" style={{ flex: 1 }}>
                  {farm.name}
                </AppText>
              </View>
              <InfoRow
                label={t('farms.area')}
                value={`${formatNumber(farm.area)} ${t(`enums.areaUnit.${farm.areaUnit}`)}`}
                strong
              />
              {farm.village ? <InfoRow label={t('profile.village')} value={farm.village} /> : null}
              {farm.district ? <InfoRow label={t('profile.district')} value={farm.district} /> : null}
              {farm.state ? <InfoRow label={t('profile.state')} value={farm.state} /> : null}
              <InfoRow
                label={t('farms.soil')}
                value={farm.soilType ? t(`enums.soilType.${farm.soilType}`) : t('common.notSet')}
              />
              <InfoRow
                label={t('farms.irrigation')}
                value={farm.irrigationAvailable ? t('farms.irrigationYes') : t('farms.irrigationNo')}
              />
              <InfoRow
                label={t('farms.location')}
                value={
                  farm.latitude != null && farm.longitude != null
                    ? `${farm.latitude.toFixed(4)}, ${farm.longitude.toFixed(4)}`
                    : t('common.notSet')
                }
              />
            </Card>
            <View style={styles.actions}>
              <Button
                title={t('common.edit')}
                variant="outline"
                size="medium"
                icon="create"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/farms/[id]/edit', params: { id: farm.id } })}
              />
              <Button
                title={t('farms.weatherHere')}
                variant="outline"
                size="medium"
                icon="partly-sunny"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/weather', params: { farmId: farm.id } })}
              />
            </View>

            <SectionHeader title={t('farms.crops')} icon="leaf" />
            {farm.farmerCrops.length === 0 ? (
              <Card>
                <AppText muted>{t('farms.noCrops')}</AppText>
              </Card>
            ) : (
              farm.farmerCrops.map((fc) => <CropCard key={fc.id} farmerCrop={fc} />)
            )}
            <Button
              title={t('farms.addCropHere')}
              icon="add-circle"
              onPress={() => router.push({ pathname: '/crop/new', params: { farmId: farm.id } })}
            />

            <FormError message={del.isError ? errorMessage(del.error, t) : null} />
            <Button
              title={t('common.delete')}
              variant="danger"
              size="medium"
              icon="trash"
              loading={del.isPending}
              onPress={confirmDelete}
              style={{ marginTop: spacing.xl }}
            />
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
