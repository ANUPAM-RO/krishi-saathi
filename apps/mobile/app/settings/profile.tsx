import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Card, InfoRow, Screen } from '@/components';
import { ProfileForm } from '@/features/ProfileForm';
import { displayPhone } from '@/lib/phone';

export default function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <Screen keyboard>
      {user ? (
        <Card>
          <InfoRow label={t('profile.phone')} value={displayPhone(user.phone)} />
        </Card>
      ) : null}
      <ProfileForm submitLabel={t('common.save')} onSaved={() => router.back()} />
    </Screen>
  );
}
