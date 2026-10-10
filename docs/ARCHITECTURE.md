# Architecture

Krishi Saathi is an npm-workspaces monorepo with three apps and one shared package.

```
krishi-saathi/
├── apps/
│   ├── api/        NestJS REST API + Prisma (PostgreSQL) + scheduled jobs
│   ├── admin/      Next.js (App Router) + MUI admin dashboard
│   └── mobile/     Expo (React Native) farmer app, Android-first
├── packages/
│   └── shared/     Domain enums and pure business logic used by all three apps
└── docs/           API contract, architecture, QA checklist
```

```
 Farmer (Android, Expo app) ──┐                       ┌── Open-Meteo (weather + geocoding)
                              ├─ HTTPS/JSON ─► NestJS API ─┼── Expo push service ─► FCM ─► devices
 Admin (Next.js dashboard) ───┘        │              └── SMS provider (MSG91) for OTP
                                       │
                         PostgreSQL (Prisma) ◄── cron jobs (reminders, rain alerts,
                                                  push dispatch, cleanup)
```

## Shared business logic (`@krishi/shared`)

All rules that the scope requires to be unit-tested live here as pure functions, so the API, the admin app (calendar preview) and the mobile app (harvest date preview) calculate the same results:

- **Crop calendar:** `calculateExpectedHarvestDate`, `generateActivitySchedule` and `cropProgressPercent`.
- **Money:** `sumExpenses`, `expensesByCategory` and `calculateProfit`. Profit results always carry `isEstimate: true`.
- **Area:** `convertArea` / `toAcres`, where a bigha is the West Bengal bigha, 1,337.8 m².
- **Dates:** date-only helpers and `todayInIndia()`. Farm days follow IST, not the server's time zone.

## API design

- **Auth:** phone OTP. Codes are 6 digits, HMAC-hashed, expire after 5 minutes and allow at most 5 attempts. A phone can request a new code every 30 seconds and at most 5 per hour; the endpoint is also limited per IP. Sign-in issues a 15-minute JWT access token and a 30-day refresh token. The refresh token is opaque, stored as a SHA-256 hash, and replaced on every use. If a revoked token is used again, the user's whole session family is revoked.
- **Authorization:** guards apply globally in this order: throttler, then JWT, then roles. Ownership is always worked out from the token through `farm.userId` and is never trusted from the client. Another farmer's resources return `404`, so their existence isn't revealed. Deactivated accounts are blocked on the very next request.
- **Validation:** a global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`, using class-validator DTOs.
- **Serialisation:** an interceptor turns Prisma `Decimal` values into JSON numbers.
- **Resilience:**
  - Weather is cached per rounded location for 60 minutes. If Open-Meteo fails, the last known snapshot is returned with `isStale: true`.
  - Mandi prices carry `source` and `priceDate`, so clients can show how fresh they are.
  - The dashboard degrades to `weather: null` instead of failing.
- **Auditability:** admin changes to crops, calendar templates, mandis, prices, advisories, alerts, farmer accounts and job runs are written to `audit_logs` with before and after values.
- **Jobs:** `@nestjs/schedule` cron jobs run in the API process. On extra replicas, set `JOBS_ENABLED=false` so each job runs only once. Jobs are idempotent: `reminderSentAt` prevents duplicate reminders and rain alerts are de-duplicated per day.

## Data model

See `apps/api/prisma/schema.prisma`. It has the core tables from the scope (§8) plus these supporting tables:

| Table | Why |
|---|---|
| `crop_calendar_templates` | Admin-configured activities, each with a day offset from sowing. They are copied into `crop_activities` when a crop is planted. |
| `otp_requests`, `refresh_tokens`, `device_tokens` | Auth and push delivery |
| `weather_alerts` | Admin-published regional alerts |
| `audit_logs` | Admin change history |

Activity and calendar text is stored in English, Hindi and Bengali columns (`title`, `titleHi`, `titleBn`), and clients pick the one to show. Notifications and advisories are written in a single language and targeted to farmers who use that language.

## Mobile

Expo Router with route groups for auth, onboarding and tabs, react-query for data, and i18next for strings in Bengali (the default), Hindi and English. The react-query cache is persisted to AsyncStorage so the app still opens offline, and an offline banner is driven by NetInfo. Tokens are stored in `expo-secure-store`. Push notifications use `expo-notifications`.

## Known MVP trade-offs

- Admin tokens are kept in `localStorage`. Moving to httpOnly cookies behind a small Next.js proxy is recommended before production.
- Mandi prices come from admin CSV import or manual entry. Seed prices are labelled `sample-seed`. An automatic Agmarknet (data.gov.in) sync is a natural next step.
- Calendar and advisory content is general guidance and needs review by an agriculture SME before the pilot.
