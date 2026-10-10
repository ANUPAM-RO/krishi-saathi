import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import { qk } from '@/api/queryKeys';
import { Screen } from '@/components';
import { OnboardingHeader } from '@/features/OnboardingHeader';
import { ProfileForm } from '@/features/ProfileForm';

export default function OnboardingProfileScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const next = async () => {
    // Farmers without a farm are guided into Add Farm → Add Crop; others go home.
    try {
      const farms = await qc.fetchQuery({ queryKey: qk.farms, queryFn: api.farms.list });
      router.replace(farms.length === 0 ? '/onboarding/farm' : '/');
    } catch {
      router.replace('/onboarding/farm');
    }
  };

  return (
    <Screen edges={['top', 'bottom']} keyboard>
      <OnboardingHeader step={1} title={t('profile.setupTitle')} subtitle={t('profile.setupSubtitle')} />
      <ProfileForm submitLabel={t('common.next')} onSaved={next} />
    </Screen>
  );
}
