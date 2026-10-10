import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDate, shiftDay, todayString, weekdayName } from '@/lib/format';
import { colors, radius, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface DatePickerProps {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  /** YYYY-MM-DD bounds (inclusive). */
  minDate?: string;
  maxDate?: string;
  /** Show the Yesterday shortcut (default true). */
  showYesterday?: boolean;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function compose(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function clamp(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/**
 * Dependency-free date picker: day / month / year steppers plus Today and Yesterday shortcuts.
 * Large buttons, no scrolling wheels.
 */
export function DatePicker({ label, value, onChange, minDate, maxDate, showYesterday = true }: DatePickerProps) {
  const { t } = useTranslation();
  const [y, m, d] = value.split('-').map(Number);
  const today = todayString();
  const yesterday = shiftDay(today, -1);

  const set = (next: string) => onChange(clamp(next, minDate, maxDate));
  const stepDay = (delta: number) => set(shiftDay(value, delta));
  const stepMonth = (delta: number) => {
    let nm = m + delta;
    let ny = y;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    } else if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    set(compose(ny, nm, Math.min(d, daysInMonth(ny, nm))));
  };
  const stepYear = (delta: number) => {
    const ny = y + delta;
    set(compose(ny, m, Math.min(d, daysInMonth(ny, m))));
  };

  const rows: { key: string; label: string; value: string; step: (n: number) => void }[] = [
    { key: 'day', label: t('datePicker.day'), value: String(d), step: stepDay },
    { key: 'month', label: t('datePicker.month'), value: t(`months.${m}`), step: stepMonth },
    { key: 'year', label: t('datePicker.year'), value: String(y), step: stepYear },
  ];

  const shortcuts = [{ v: today, label: t('common.today') }];
  if (showYesterday) shortcuts.push({ v: yesterday, label: t('common.yesterday') });

  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.display} accessibilityLiveRegion="polite">
        <Icon name="calendar" size={28} color={colors.primaryDark} />
        <AppText variant="title" color={colors.primaryDark}>
          {`${weekdayName(value, t)}, ${formatDate(value, t)}`}
        </AppText>
      </View>
      <View style={styles.shortcuts}>
        {shortcuts.map((s) => {
          const selected = s.v === value;
          const disabled = (minDate && s.v < minDate) || (maxDate && s.v > maxDate);
          return (
            <Pressable
              key={s.v}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!disabled }}
              onPress={disabled ? undefined : () => onChange(s.v)}
              style={[styles.shortcut, selected && styles.shortcutSelected, disabled && { opacity: 0.4 }]}
            >
              <AppText bold color={selected ? colors.onPrimary : colors.primaryDark}>
                {s.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {rows.map((r) => (
        <View key={r.key} style={styles.stepRow}>
          <StepButton icon="remove" label={`${r.label} −`} onPress={() => r.step(-1)} />
          <View style={styles.stepValue}>
            <AppText variant="small" muted>
              {r.label}
            </AppText>
            <AppText variant="large" bold>
              {r.value}
            </AppText>
          </View>
          <StepButton icon="add" label={`${r.label} +`} onPress={() => r.step(1)} />
        </View>
      ))}
    </View>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: colors.primaryLight }]}
    >
      <Icon name={icon} size={28} color={colors.primaryDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  shortcuts: { flexDirection: 'row', gap: spacing.sm },
  shortcut: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  shortcutSelected: { backgroundColor: colors.primary },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: touch.primary,
    height: touch.primary,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    flex: 1,
    minHeight: touch.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
