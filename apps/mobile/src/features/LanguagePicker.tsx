import type { Language } from '@krishi/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '@/components';
import { LANGUAGE_NATIVE_NAMES, LANGUAGE_ORDER } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

const SAMPLE: Record<Language, string> = {
  bn: 'অ্যাপটি বাংলায় দেখুন',
  hi: 'ऐप हिन्दी में देखें',
  en: 'Use the app in English',
};

/** Three very large buttons, each written in its own script so anyone can find theirs. */
export function LanguagePicker({
  value,
  onSelect,
  busy,
}: {
  value: Language | null;
  onSelect: (lang: Language) => void;
  busy?: boolean;
}) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {LANGUAGE_ORDER.map((lang) => {
        const selected = value === lang;
        return (
          <Pressable
            key={lang}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: busy }}
            accessibilityLabel={LANGUAGE_NATIVE_NAMES[lang]}
            onPress={busy ? undefined : () => onSelect(lang)}
            style={({ pressed }) => [styles.item, selected && styles.selected, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.text}>
              <AppText variant="heading" color={selected ? colors.onPrimary : colors.primaryDark}>
                {LANGUAGE_NATIVE_NAMES[lang]}
              </AppText>
              <AppText variant="small" color={selected ? colors.onPrimary : colors.textMuted}>
                {SAMPLE[lang]}
              </AppText>
            </View>
            <Icon
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={32}
              color={selected ? colors.onPrimary : colors.border}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  selected: { backgroundColor: colors.primary },
  text: { flex: 1, gap: 2 },
});
