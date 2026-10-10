import type { Language } from '@krishi/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Icon, Screen } from '@/components';
import { LanguagePicker } from '@/features/LanguagePicker';
import i18n, { LANGUAGE_ORDER } from '@/i18n';
import { colors, spacing } from '@/theme';

export default function LanguageSelectScreen() {
  const { t } = useTranslation();
  const { language, languageChosen, chooseLanguage } = useAuth();
  const [busy, setBusy] = useState(false);

  const select = async (lang: Language) => {
    setBusy(true);
    try {
      await chooseLanguage(lang);
      if (router.canGoBack()) router.back();
      else router.replace('/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Icon name="leaf" size={56} color={colors.onPrimary} />
        </View>
        <AppText variant="display" color={colors.primaryDark} center>
          {t('common.appName')}
        </AppText>
        <AppText variant="large" center>
          {LANGUAGE_ORDER.map((l) => i18n.getFixedT(l)('language.title')).join(' · ')}
        </AppText>
        <AppText muted center>
          {t('language.subtitle')}
        </AppText>
      </View>
      <LanguagePicker value={languageChosen ? language : null} onSelect={select} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
