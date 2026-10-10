import { BadRequestException } from '@nestjs/common';
import { toDateOnly } from '@krishi/shared';

/** Parses a client-supplied YYYY-MM-DD (or ISO) string into a date-only Date, or throws 400. */
export function parseDateOnly(value: string, field = 'date'): Date {
  try {
    return toDateOnly(value);
  } catch {
    throw new BadRequestException(`${field} must be a valid date`);
  }
}
