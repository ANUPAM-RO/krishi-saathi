import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Button, Card, FormError, Icon, Screen, TextField } from '@/components';
import { errorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const { t } = useTranslation();
  const { language, signIn } = useAuth();
  const params = useLocalSearchParams<{ phone?: string; devCode?: string }>();
  const phone = params.phone ?? '';
  const [devCode, setDevCode] = useState(params.devCode || '');
  const [code, setCode] = useState(params.devCode || '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Without a phone number there is nothing to verify.
  useEffect(() => {
    if (!phone) router.replace('/login');
  }, [phone]);

  const verify = useMutation({
    mutationFn: () => api.auth.verifyOtp(phone, code.trim(), language),
    // The root layout moves the farmer on once signed in.
    onSuccess: (res) => signIn(res),
  });

  const resend = useMutation({
    mutationFn: () => api.auth.sendOtp(phone),
    onSuccess: (res) => {
      setSecondsLeft(RESEND_SECONDS);
      setInfo(t('auth.otpSent'));
      if (res.devCode) {
        setDevCode(res.devCode);
        setCode(res.devCode);
      }
    },
  });

  const submit = () => {
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError(t('errors.invalidOtp'));
      return;
    }
    setError(null);
    setInfo(null);
    verify.mutate();
  };

  const verifyError = verify.isError
    ? isApiError(verify.error) && (verify.error.status === 400 || verify.error.status === 401)
      ? t('errors.wrongOtp')
      : errorMessage(verify.error, t)
    : null;

  return (
    <Screen edges={['top', 'bottom']} keyboard>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Icon name="chatbox-ellipses" size={44} color={colors.onPrimary} />
        </View>
        <AppText variant="heading" center>
          {t('auth.otpTitle')}
        </AppText>
        <AppText center>{t('auth.otpSubtitle', { phone: `+91 ${phone}` })}</AppText>
      </View>
      <TextField
        label={t('auth.otpLabel')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={8}
        large
        autoFocus
        error={error}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {devCode ? (
        <Card tone="warning">
          <AppText variant="small" bold>
            {t('auth.devHint', { code: devCode })}
          </AppText>
        </Card>
      ) : null}
      <FormError message={verifyError ?? (resend.isError ? errorMessage(resend.error, t) : null)} />
      {info ? (
        <AppText variant="small" color={colors.primaryDark} bold>
          {info}
        </AppText>
      ) : null}
      <Button title={t('auth.verify')} icon="checkmark-circle" onPress={submit} loading={verify.isPending} />
      <Button
        title={secondsLeft > 0 ? t('auth.resendIn', { n: secondsLeft }) : t('auth.resend')}
        variant="outline"
        size="medium"
        icon="refresh"
        disabled={secondsLeft > 0}
        loading={resend.isPending}
        onPress={() => resend.mutate()}
      />
      <Button
        title={t('auth.changeNumber')}
        variant="ghost"
        size="medium"
        icon="arrow-back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
