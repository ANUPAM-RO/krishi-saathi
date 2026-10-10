import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, ProgressBar } from '@/components';
import { colors, spacing } from '@/theme';

/** Steps after login: 1 profile, 2 farm, 3 crop. */
export function OnboardingHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  const { t } = useTranslation();
  const total = 3;
  return (
    <View style={styles.wrap}>
      <AppText variant="small" bold color={colors.primaryDark}>
        {t('onboarding.step', { n: step, total })}
      </AppText>
      <ProgressBar percent={(step / total) * 100} />
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText muted>{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.md },
});
