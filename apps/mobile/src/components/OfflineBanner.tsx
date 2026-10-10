import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOnline } from '@/lib/useOnline';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="cloud-offline" size={22} color={colors.textInverse} />
      <AppText variant="small" bold color={colors.textInverse} style={styles.text}>
        {t('states.offlineBanner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#5D4037',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1 },
});
