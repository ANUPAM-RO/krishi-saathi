import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'accent';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** `large` = 56dp primary action, `medium` = 48dp. */
  size?: 'large' | 'medium';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  accent: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
  secondary: { bg: colors.primaryLight, fg: colors.primaryDark, border: colors.primaryLight },
  outline: { bg: colors.surface, fg: colors.primaryDark, border: colors.primary },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'large',
  style,
  accessibilityHint,
}: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === 'large' ? touch.primary : touch.min,
          backgroundColor: p.bg,
          borderColor: p.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : icon ? (
          <Icon name={icon} size={size === 'large' ? 24 : 22} color={p.fg} />
        ) : null}
        <AppText
          style={{ color: p.fg, fontSize: size === 'large' ? fontSize.large : fontSize.body, fontWeight: '700', flexShrink: 1 }}
          numberOfLines={2}
          center
        >
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
