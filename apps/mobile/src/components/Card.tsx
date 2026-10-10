import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'primary' | 'accent' | 'warning' | 'danger' | 'info';
  accessibilityLabel?: string;
}

const tones = {
  default: { bg: colors.surface, border: colors.border },
  primary: { bg: colors.primaryLight, border: '#A5D6A7' },
  accent: { bg: colors.accentLight, border: '#D7CCC8' },
  warning: { bg: colors.warningLight, border: '#FFCC80' },
  danger: { bg: colors.dangerLight, border: '#EF9A9A' },
  info: { bg: colors.infoLight, border: '#90CAF9' },
} as const;

export function Card({ children, onPress, style, tone = 'default', accessibilityLabel }: CardProps) {
  const t = tones[tone];
  const base = [styles.card, { backgroundColor: t.bg, borderColor: t.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow,
  },
});
