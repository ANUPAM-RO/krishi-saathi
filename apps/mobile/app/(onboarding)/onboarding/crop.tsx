import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Screen } from '@/components';
import { CropForm } from '@/features/CropForm';
import { OnboardingHeader } from '@/features/OnboardingHeader';

export default function OnboardingCropScreen() {
  const { t } = useTranslation();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const skip = (
    <Button title={t('onboarding.skip')} variant="ghost" size="medium" onPress={() => router.replace('/')} />
  );
  return (
    <Screen edges={['top', 'bottom']} keyboard>
      <OnboardingHeader step={3} title={t('onboarding.cropTitle')} subtitle={t('onboarding.cropSubtitle')} />
      <CropForm initialFarmId={farmId} onSaved={() => router.replace('/')} extra={skip} />
    </Screen>
  );
}
