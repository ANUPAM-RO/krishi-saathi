import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** Always shown next to revenue/profit numbers: they are estimates, never guaranteed income. */
export function EstimateBadge() {
  const { t } = useTranslation();
  return (
    <View style={styles.estimate} accessibilityLabel={t('profit.estimate')}>
      <Icon name="information-circle" size={18} color={colors.warning} />
      <AppText variant="small" bold color={colors.warning}>
        {t('profit.estimate')}
      </AppText>
    </View>
  );
}

export function SectionHeader({
  title,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        {icon ? <Icon name={icon} size={24} color={colors.primaryDark} /> : null}
        <AppText variant="title" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {title}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <AppText bold color={colors.primary}>
            {actionLabel}
          </AppText>
          <Icon name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  iconBg?: string;
  right?: ReactNode;
  onPress?: () => void;
  badge?: number;
  chevron?: boolean;
  danger?: boolean;
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconColor = colors.primaryDark,
  iconBg = colors.primaryLight,
  right,
  onPress,
  badge,
  chevron = !!onPress,
  danger,
}: ListItemProps) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: danger ? colors.dangerLight : iconBg }]}>
          <Icon name={icon} size={26} color={danger ? colors.danger : iconColor} />
        </View>
      ) : null}
      <View style={styles.listText}>
        <AppText variant="large" bold color={danger ? colors.danger : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge ? <CountBadge count={badge} /> : null}
      {right}
      {chevron ? <Icon name="chevron-forward" size={22} color={colors.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.listItem}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}

export function CountBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <AppText variant="small" bold color={colors.textInverse}>
        {count > 99 ? '99+' : String(count)}
      </AppText>
    </View>
  );
}

export function ProgressBar({ percent, color = colors.primary }: { percent: number; color?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: p }}
    >
      <View style={[styles.progressFill, { width: `${p}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={styles.toggle}
    >
      {icon ? <Icon name={icon} size={26} color={colors.info} /> : null}
      <AppText variant="large" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: '#81C784', false: colors.border }}
        thumbColor={value ? colors.primary : '#f4f3f4'}
      />
    </Pressable>
  );
}

/** Label / value row used in summaries. */
export function InfoRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText muted style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant={strong ? 'large' : 'body'} bold={strong} color={color} style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  estimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.warningLight,
    borderColor: '#FFB74D',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', minHeight: touch.min },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  listText: { flex: 1, gap: 2 },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.primary,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  infoValue: { textAlign: 'right', flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
