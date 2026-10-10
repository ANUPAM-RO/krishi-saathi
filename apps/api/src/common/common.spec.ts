import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { loadConfig } from '../config/configuration';
import { geocodeCandidates } from '../weather/weather.service';
import { pickLocalized, renderMessage } from './i18n/messages';
import { serializeDecimals } from './interceptors/serialize.interceptor';
import { normalizeIndianPhone } from './phone';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each(['12345', '5876543210', '+1 415 555 0100', ''])('rejects %s', (input) => {
    expect(() => normalizeIndianPhone(input)).toThrow(BadRequestException);
  });
});

describe('serializeDecimals', () => {
  it('converts nested Prisma decimals to numbers and keeps dates', () => {
    const date = new Date('2026-07-01T00:00:00Z');
    expect(
      serializeDecimals({ a: new Prisma.Decimal('12.50'), list: [{ b: new Prisma.Decimal(3) }], date, n: null }),
    ).toEqual({ a: 12.5, list: [{ b: 3 }], date, n: null });
  });
});

describe('server messages', () => {
  it('renders localised reminder text', () => {
    const msg = renderMessage('activityDueToday', 'bn', { activity: 'সেচ', crop: 'আলু', farm: 'উত্তর জমি' });
    expect(msg.title).toBe('আজ: সেচ');
    expect(msg.body).toContain('আলু');
  });

  it('picks the localised field with English fallback', () => {
    const crop = { name: 'Potato', nameHi: 'आलू', nameBn: 'আলু' };
    expect(pickLocalized(crop, 'name', 'bn')).toBe('আলু');
    expect(pickLocalized(crop, 'name', 'hi')).toBe('आलू');
    expect(pickLocalized(crop, 'name', 'en')).toBe('Potato');
    expect(pickLocalized({ name: 'Only English' }, 'name', 'bn')).toBe('Only English');
  });
});

describe('geocodeCandidates', () => {
  it('tries village, district, then district without a direction prefix', () => {
    expect(geocodeCandidates('Memari', 'Purba Bardhaman')).toEqual(['Memari', 'Purba Bardhaman', 'Bardhaman']);
    expect(geocodeCandidates(null, 'Hooghly')).toEqual(['Hooghly']);
    expect(geocodeCandidates(undefined, undefined)).toEqual([]);
  });
});

describe('loadConfig', () => {
  const base = { DATABASE_URL: 'postgres://x', JWT_SECRET: 'j', OTP_SECRET: 'o' };

  it('requires core secrets', () => {
    expect(() => loadConfig({ DATABASE_URL: 'x' } as NodeJS.ProcessEnv)).toThrow(/JWT_SECRET/);
  });

  it('refuses unsafe production settings', () => {
    const long = 'x'.repeat(40);
    const prod = { ...base, NODE_ENV: 'production', JWT_SECRET: long, OTP_SECRET: long, SMS_PROVIDER: 'msg91' };
    expect(() => loadConfig({ ...prod, OTP_DEV_MODE: 'true' } as NodeJS.ProcessEnv)).toThrow(/OTP_DEV_MODE/);
    expect(() => loadConfig({ ...prod, JWT_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow(/32 characters/);
    expect(() => loadConfig({ ...prod, SMS_PROVIDER: 'console' } as NodeJS.ProcessEnv)).toThrow(/SMS_PROVIDER/);
    expect(loadConfig(prod as NodeJS.ProcessEnv).otpDevMode).toBe(false);
  });

  it('parses lists and booleans', () => {
    const c = loadConfig({ ...base, ADMIN_PHONES: '+911, +912', OTP_DEV_MODE: 'true' } as NodeJS.ProcessEnv);
    expect(c.adminPhones).toEqual(['+911', '+912']);
    expect(c.otpDevMode).toBe(true);
  });
});
