const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalise any date-ish input to midnight UTC (date-only semantics). */
export function toDateOnly(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(input)}`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(input: Date | string, days: number): Date {
  return new Date(toDateOnly(input).getTime() + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function diffInDays(from: Date | string, to: Date | string): number {
  return Math.round((toDateOnly(to).getTime() - toDateOnly(from).getTime()) / MS_PER_DAY);
}

/** Format as YYYY-MM-DD. */
export function formatDateOnly(input: Date | string): string {
  return toDateOnly(input).toISOString().slice(0, 10);
}

/** Today's date in India (IST, UTC+5:30) as a date-only value. Farm activities are due by local date. */
export function todayInIndia(now: Date = new Date()): Date {
  return toDateOnly(new Date(now.getTime() + 330 * 60 * 1000));
}
