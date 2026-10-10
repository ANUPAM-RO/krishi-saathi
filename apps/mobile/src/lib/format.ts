import { addDays, diffInDays, formatDateOnly, todayInIndia } from '@krishi/shared';
import type { TFunction } from 'i18next';

/** Indian digit grouping: 12,34,567.89 */
export function groupIndian(value: number, maxFractionDigits = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(maxFractionDigits);
  let [intPart, frac = ''] = fixed.split('.');
  frac = frac.replace(/0+$/, '');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${negative ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/** ₹ with Indian grouping (en-IN style). Whole rupees unless the value has paise. */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  const s = groupIndian(Math.abs(value), hasPaise ? 2 : 0);
  return `${value < 0 ? '-' : ''}₹${s}`;
}

export function formatNumber(value: number | null | undefined, maxFractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return groupIndian(value, maxFractionDigits);
}

/** First 10 chars of an API date (date-only values come as midnight UTC). */
export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function parts(isoOrDay: string): { y: number; m: number; d: number; weekday: number } {
  const day = dateOnly(isoOrDay);
  const [y, m, d] = day.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, weekday };
}

/** "12 Oct 2026" in the current language. Years are hidden for the current year when `short`. */
export function formatDate(iso: string | null | undefined, t: TFunction, opts: { short?: boolean } = {}): string {
  if (!iso) return '—';
  const { y, m, d } = parts(iso);
  if (!y || !m || !d) return '—';
  const thisYear = todayInIndia().getUTCFullYear();
  const month = t(`months.${m}`);
  return opts.short && y === thisYear ? `${d} ${month}` : `${d} ${month} ${y}`;
}

/** "Today" / "Yesterday" / "Tomorrow" or a formatted date. */
export function formatRelativeDay(iso: string | null | undefined, t: TFunction): string {
  if (!iso) return '—';
  const diff = diffInDays(todayInIndia(), dateOnly(iso));
  if (diff === 0) return t('common.today');
  if (diff === -1) return t('common.yesterday');
  if (diff === 1) return t('common.tomorrow');
  return formatDate(iso, t, { short: true });
}

export function weekdayName(iso: string, t: TFunction): string {
  return t(`weekdays.${parts(iso).weekday}`);
}

/** "5 min ago", "3 hours ago" for timestamps (freshness labels). */
export function formatTimeAgo(iso: string | null | undefined, t: TFunction, now: Date = new Date()): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const minutes = Math.max(0, Math.floor((now.getTime() - then) / 60000));
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  return t('time.daysAgo', { n: Math.floor(hours / 24) });
}

/** Whole days between a date-only value and today in India. */
export function daysOld(iso: string): number {
  return diffInDays(dateOnly(iso), todayInIndia());
}

export function todayString(): string {
  return formatDateOnly(todayInIndia());
}

export function shiftDay(day: string, delta: number): string {
  return formatDateOnly(addDays(day, delta));
}

/** Parse a user-typed decimal ("12.5", "12,5"). Returns NaN for junk, null for empty. */
export function parseDecimal(text: string): number | null {
  const s = text.trim().replace(/,/g, '.');
  if (!s) return null;
  if (!/^\d*\.?\d*$/.test(s)) return NaN;
  return Number(s);
}
