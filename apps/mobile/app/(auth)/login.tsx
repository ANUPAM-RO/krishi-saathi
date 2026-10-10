import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Button, FormError, Icon, Screen, TextField } from '@/components';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { isValidIndianMobile, normalizePhone } from '@/lib/phone';
import { colors, spacing, touch } from '@/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { language } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useMutation({
    mutationFn: (p: string) => api.auth.sendOtp(p),
    onSuccess: (res, p) => {
      router.push({ pathname: '/otp', params: { phone: p, devCode: res.devCode ?? '' } });
    },
  });

  const submit = () => {
    const p = normalizePhone(phone);
    if (!isValidIndianMobile(p)) {
      setError(t('errors.invalidPhone'));
      return;
    }
    setError(null);
    sendOtp.mutate(p);
  };

  return (
    <Screen edges={['top', 'bottom']} keyboard>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('language.settingsTitle')}
          onPress={() => router.push('/language')}
          style={styles.langBtn}
        >
          <Icon name="language" size={22} color={colors.primaryDark} />
          <AppText bold color={colors.primaryDark}>
            {LANGUAGE_NATIVE_NAMES[language]}
          </AppText>
        </Pressable>
      </View>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Icon name="leaf" size={48} color={colors.onPrimary} />
        </View>
        <AppText variant="heading" center>
          {t('auth.loginTitle')}
        </AppText>
        <AppText muted center>
          {t('auth.loginSubtitle')}
        </AppText>
      </View>
      <TextField
        label={t('auth.phoneLabel')}
        placeholder={t('auth.phonePlaceholder')}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^\d+\s]/g, ''))}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={16}
        prefix="+91"
        large
        error={error}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <FormError message={sendOtp.isError ? errorMessage(sendOtp.error, t) : null} />
      <Button title={t('auth.sendOtp')} icon="chatbox-ellipses" onPress={submit} loading={sendOtp.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  hero: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
