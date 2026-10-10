import type { Language } from '@krishi/shared';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-IN');

/** ₹ with Indian digit grouping, e.g. ₹1,23,456. */
export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return inr.format(Number(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return num.format(value);
}

/** First 10 chars of an ISO date (YYYY-MM-DD), for date-only fields. */
export function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

/** Readable date-only value, e.g. "01 Jul 2026". Interprets the value as a UTC calendar date. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const iso = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}

/** Timestamp in IST, e.g. "09 Oct 2026, 4:05 pm". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** ISO timestamp -> value for <input type="datetime-local"> in the browser's local time. */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "PEST_CONTROL" -> "Pest control". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  bn: 'Bengali (বাংলা)',
};

export function languageLabel(lang: string | null | undefined): string {
  if (!lang) return '—';
  return LANGUAGE_LABELS[lang as Language] ?? lang;
}

/** Calendar offset label: "Day -7 (before sowing)", "Day 0 (sowing day)", "Day 21". */
export function dayOffsetLabel(offset: number): string {
  if (offset < 0) return `Day ${offset} (before sowing)`;
  if (offset === 0) return 'Day 0 (sowing day)';
  return `Day ${offset}`;
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
