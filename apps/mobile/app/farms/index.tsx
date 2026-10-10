import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFarms } from '@/api/hooks';
import { Button, ListItem, QueryBoundary, Screen } from '@/components';
import { formatNumber } from '@/lib/format';

export default function FarmsScreen() {
  const { t } = useTranslation();
  const query = useFarms();
  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Button title={t('farms.add')} icon="add-circle" onPress={() => router.push('/farms/new')} />
      <QueryBoundary
        query={query}
        isEmpty={(farms) => farms.length === 0}
        empty={{ icon: 'map-outline', title: t('farms.none'), message: t('farms.noneText') }}
      >
        {(farms) =>
          farms.map((f) => (
            <ListItem
              key={f.id}
              icon="map"
              title={f.name}
              subtitle={[
                `${formatNumber(f.area)} ${t(`enums.areaUnit.${f.areaUnit}`)}`,
                f.village,
                t('farms.activeCrops', { n: f.activeCropCount }),
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => router.push({ pathname: '/farms/[id]', params: { id: f.id } })}
            />
          ))
        }
      </QueryBoundary>
    </Screen>
  );
}
