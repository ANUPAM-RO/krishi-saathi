import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface ChipsProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  label?: string;
  error?: string | null;
}

/** Single-choice wrap of large chips. Works as a simple "select" for short lists. */
export function Chips<T extends string>({ options, value, onChange, label, error }: ChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}
            >
              {selected ? (
                <Icon name="checkmark-circle" size={20} color={colors.onPrimary} />
              ) : o.icon ? (
                <Icon name={o.icon} size={20} color={colors.primaryDark} />
              ) : null}
              <AppText bold={selected} color={selected ? colors.onPrimary : colors.text}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export interface SegmentedProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/** Equal-width segmented buttons, e.g. Bigha / Acre / Hectare or task ranges. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.segment} accessibilityRole="tablist">
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={[styles.segmentItem, i > 0 && styles.segmentDivider, selected && styles.segmentSelected]}
            >
              {o.icon ? (
                <Icon name={o.icon} size={20} color={selected ? colors.onPrimary : colors.primaryDark} />
              ) : null}
              <AppText
                variant="small"
                bold
                center
                numberOfLines={2}
                color={selected ? colors.onPrimary : colors.primaryDark}
              >
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  segmentItem: {
    flex: 1,
    minHeight: touch.min + 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: colors.primary },
  segmentSelected: { backgroundColor: colors.primary },
});
