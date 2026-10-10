import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Screen } from '@/components';
import { FarmForm } from '@/features/FarmForm';
import { OnboardingHeader } from '@/features/OnboardingHeader';

export default function OnboardingFarmScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom']} keyboard>
      <OnboardingHeader step={2} title={t('onboarding.farmTitle')} subtitle={t('onboarding.farmSubtitle')} />
      <FarmForm
        submitLabel={t('common.next')}
        onSaved={(farm) => router.replace({ pathname: '/onboarding/crop', params: { farmId: farm.id } })}
        extra={
          <Button
            title={t('onboarding.skip')}
            variant="ghost"
            size="medium"
            onPress={() => router.replace('/')}
          />
        }
      />
    </Screen>
  );
}
