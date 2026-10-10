import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFarmerCrop, useProfit } from '@/api/hooks';
import { AppText, QueryBoundary, Screen } from '@/components';
import { ProfitView } from '@/features/ProfitView';
import { useLanguage } from '@/i18n/localized';

export default function ProfitScreen() {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useProfit(id);
  const crop = useFarmerCrop(id).data;

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      {crop ? <AppText variant="heading">{`${loc(crop.crop)} · ${crop.farm.name}`}</AppText> : null}
      <QueryBoundary query={query} loadingMessage={t('states.loading')}>
        {(profit) => <ProfitView profit={profit} showCategories />}
      </QueryBoundary>
    </Screen>
  );
}
