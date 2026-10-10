import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message ?? t('states.loading')}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText muted>{message ?? t('states.loading')}</AppText>
    </View>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction, children }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={44} color={colors.primary} />
      </View>
      <AppText variant="title" center>
        {title ?? t('states.emptyTitle')}
      </AppText>
      {message ? (
        <AppText muted center>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} icon="add-circle" style={styles.action} />
      ) : null}
      {children}
    </View>
  );
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  icon?: IconName;
}

export function ErrorState({ message, onRetry, retrying, title, icon = 'alert-circle-outline' }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
        <Icon name={icon} size={44} color={colors.danger} />
      </View>
      <AppText variant="title" center>
        {title ?? t('states.errorTitle')}
      </AppText>
      <AppText muted center>
        {message}
      </AppText>
      {onRetry ? (
        <Button title={t('common.retry')} onPress={onRetry} icon="refresh" loading={retrying} style={styles.action} />
      ) : null}
    </View>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <ErrorState
      icon="cloud-offline-outline"
      title={t('states.offlineTitle')}
      message={t('states.offlineMessage')}
      onRetry={onRetry}
    />
  );
}

/** Small inline error line under a form. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert">
      <Icon name="alert-circle" size={22} color={colors.danger} />
      <AppText color={colors.danger} style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
  formError: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 8,
  },
});
