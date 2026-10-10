import { BadRequestException } from '@nestjs/common';

/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts "9876543210", "09876543210", "919876543210", "+91 98765 43210".
 */
export function normalizeIndianPhone(input: string): string {
  const digits = (input ?? '').replace(/\D/g, '');
  let national: string | undefined;
  if (digits.length === 10) national = digits;
  else if (digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91')) national = digits.slice(2);

  if (!national || !/^[6-9]\d{9}$/.test(national)) {
    throw new BadRequestException('Enter a valid 10-digit Indian mobile number');
  }
  return `+91${national}`;
}
