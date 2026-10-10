function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  jwtSecret: string;
  otpSecret: string;
  accessTokenTtl: string;
  refreshTokenTtlDays: number;
  otpDevMode: boolean;
  smsProvider: 'console' | 'msg91';
  msg91AuthKey?: string;
  msg91TemplateId?: string;
  adminPhones: string[];
  pushEnabled: boolean;
  expoAccessToken?: string;
  weatherCacheMinutes: number;
  jobsEnabled: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  const required = ['DATABASE_URL', 'JWT_SECRET', 'OTP_SECRET'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  const config: AppConfig = {
    nodeEnv,
    port: Number(env.PORT ?? 4000),
    corsOrigins: list(env.CORS_ORIGINS),
    jwtSecret: env.JWT_SECRET!,
    otpSecret: env.OTP_SECRET!,
    accessTokenTtl: env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTokenTtlDays: Number(env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    otpDevMode: bool(env.OTP_DEV_MODE, false),
    smsProvider: env.SMS_PROVIDER === 'msg91' ? 'msg91' : 'console',
    msg91AuthKey: env.MSG91_AUTH_KEY || undefined,
    msg91TemplateId: env.MSG91_TEMPLATE_ID || undefined,
    adminPhones: list(env.ADMIN_PHONES),
    pushEnabled: bool(env.PUSH_ENABLED, false),
    expoAccessToken: env.EXPO_ACCESS_TOKEN || undefined,
    weatherCacheMinutes: Number(env.WEATHER_CACHE_MINUTES ?? 60),
    jobsEnabled: bool(env.JOBS_ENABLED, true),
  };

  if (isProd) {
    if (config.otpDevMode) throw new Error('OTP_DEV_MODE must not be enabled in production');
    if (config.jwtSecret.length < 32 || config.otpSecret.length < 32) {
      throw new Error('JWT_SECRET and OTP_SECRET must be at least 32 characters in production');
    }
    if (config.smsProvider === 'console') throw new Error('SMS_PROVIDER=console is not allowed in production');
  }
  return config;
}

export const APP_CONFIG = Symbol('APP_CONFIG');
