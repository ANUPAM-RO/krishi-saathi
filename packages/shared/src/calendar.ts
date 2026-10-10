import type { ActivityType } from './enums';
import { addDays, toDateOnly } from './dates';

export interface CalendarTemplateItem {
  activityType: ActivityType;
  /** Days after sowing (negative for pre-sowing work such as land preparation). */
  dayOffset: number;
  sortOrder?: number;
}

export type ScheduledActivity<T extends CalendarTemplateItem> = T & { scheduledDate: Date };

export function calculateExpectedHarvestDate(sowingDate: Date | string, durationDays: number): Date {
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error('Crop duration must be a positive whole number of days');
  }
  return addDays(sowingDate, durationDays);
}

/**
 * Turns a crop's calendar template into dated activities for one planting,
 * ordered by date, then by template sort order.
 */
export function generateActivitySchedule<T extends CalendarTemplateItem>(
  sowingDate: Date | string,
  templates: readonly T[],
): ScheduledActivity<T>[] {
  return templates
    .map((t) => ({ ...t, scheduledDate: addDays(sowingDate, t.dayOffset) }))
    .sort(
      (a, b) =>
        a.scheduledDate.getTime() - b.scheduledDate.getTime() || (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
}

/** How far a crop is through its season, 0–100. */
export function cropProgressPercent(
  sowingDate: Date | string,
  harvestDate: Date | string,
  today: Date | string = new Date(),
): number {
  const start = toDateOnly(sowingDate).getTime();
  const total = toDateOnly(harvestDate).getTime() - start;
  if (total <= 0) return 100;
  const elapsed = toDateOnly(today).getTime() - start;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
