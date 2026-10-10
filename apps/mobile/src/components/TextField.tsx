import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, radius, spacing, touch } from '@/theme';
import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  optionalLabel?: string;
  prefix?: string;
  large?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, optionalLabel, prefix, large, multiline, ...rest },
  ref,
) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label">
        {label}
        {optionalLabel ? (
          <AppText variant="small" muted>
            {`  (${optionalLabel})`}
          </AppText>
        ) : null}
      </AppText>
      <View style={[styles.inputRow, error ? styles.inputError : null, multiline && styles.multilineRow]}>
        {prefix ? (
          <AppText variant="large" bold style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.disabled}
          multiline={multiline}
          maxFontSizeMultiplier={1.5}
          style={[styles.input, large && styles.large, multiline && styles.multiline]}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="small" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.primary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  multilineRow: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  inputError: { borderColor: colors.danger },
  prefix: { marginRight: spacing.sm, color: colors.textMuted },
  input: { flex: 1, fontSize: fontSize.large, color: colors.text, paddingVertical: spacing.sm },
  large: { fontSize: fontSize.title, letterSpacing: 2 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
