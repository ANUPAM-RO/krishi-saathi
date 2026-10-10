import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fontSize } from '@/theme';

export type TextVariant = 'body' | 'small' | 'large' | 'title' | 'heading' | 'display' | 'label';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  muted?: boolean;
  bold?: boolean;
  center?: boolean;
}

export function AppText({ variant = 'body', color, muted, bold, center, style, ...rest }: AppTextProps) {
  const extra: TextStyle = {};
  if (color) extra.color = color;
  else if (muted) extra.color = colors.textMuted;
  if (bold) extra.fontWeight = '700';
  if (center) extra.textAlign = 'center';
  return <Text maxFontSizeMultiplier={1.6} style={[styles.base, styles[variant], extra, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontSize: fontSize.body, lineHeight: fontSize.body * 1.4 },
  body: {},
  small: { fontSize: fontSize.small, lineHeight: fontSize.small * 1.4 },
  large: { fontSize: fontSize.large, lineHeight: fontSize.large * 1.35 },
  title: { fontSize: fontSize.title, lineHeight: fontSize.title * 1.3, fontWeight: '700' },
  heading: { fontSize: fontSize.heading, lineHeight: fontSize.heading * 1.3, fontWeight: '700' },
  display: { fontSize: fontSize.display, lineHeight: fontSize.display * 1.25, fontWeight: '700' },
  label: { fontSize: fontSize.body, lineHeight: fontSize.body * 1.4, fontWeight: '600' },
});
