import type { Language } from '@krishi/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Screen } from '@/components';
import { LanguagePicker } from '@/features/LanguagePicker';

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const { language, chooseLanguage } = useAuth();
  const [busy, setBusy] = useState(false);

  const select = async (lang: Language) => {
    setBusy(true);
    try {
      // Also saved to the server (PUT /farmers/me) inside chooseLanguage.
      await chooseLanguage(lang);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">{t('language.title')}</AppText>
      <LanguagePicker value={language} onSelect={select} busy={busy} />
    </Screen>
  );
}
