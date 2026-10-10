import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFarmerCrops } from '@/api/hooks';
import { Button, EmptyState, QueryBoundary, Screen, Segmented } from '@/components';
import { CropCard } from '@/features/Cards';

type Tab = 'active' | 'completed';

export default function CropsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('active');
  const query = useFarmerCrops();

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: t('crops.active'), icon: 'leaf' },
          { value: 'completed', label: t('crops.completed'), icon: 'checkmark-done' },
        ]}
      />
      <Button title={t('crops.add')} icon="add-circle" onPress={() => router.push('/crop/new')} />
      <QueryBoundary query={query}>
        {(all) => {
          const list = all
            .filter((fc) =>
              tab === 'active' ? fc.status === 'ACTIVE' || fc.status === 'PLANNED' : fc.status === 'HARVESTED' || fc.status === 'FAILED',
            )
            .sort((a, b) => b.sowingDate.localeCompare(a.sowingDate));
          if (list.length === 0) {
            return (
              <EmptyState
                icon={tab === 'active' ? 'leaf-outline' : 'checkmark-done-outline'}
                message={tab === 'active' ? t('crops.none') : t('crops.noneCompleted')}
              />
            );
          }
          return list.map((fc) => <CropCard key={fc.id} farmerCrop={fc} />);
        }}
      </QueryBoundary>
    </Screen>
  );
}
