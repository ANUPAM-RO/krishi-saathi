# Krishi Saathi REST API (v1)

Base URL: `http://localhost:4000/api` (dev). Interactive Swagger docs are served at `/api/docs` when the API is running.

## Conventions

- **Auth**: `Authorization: Bearer <accessToken>` on every endpoint except `send-otp`, `verify-otp`, `refresh` and `health`.
- **Ownership**: the server derives the farmer from the token. Clients never send `userId`. If a farmer asks for another farmer's resource, they get `404`.
- **Numbers**: decimal columns such as area, amount and price are returned as JSON numbers.
- **Dates**: every timestamp is an ISO-8601 string. Date-only fields (`sowingDate`, `expectedHarvestDate`, `scheduledDate`, `expenseDate`, `priceDate`) come back as midnight UTC, e.g. `"2026-07-01T00:00:00.000Z"`. Clients should use the first 10 characters. In request bodies, send date-only fields as `"YYYY-MM-DD"`.
- **Localised content**: master data carries every language. Crops have `name`, `nameHi`, `nameBn`; activities have `title`, `titleHi`, `titleBn` and `description*`. The client chooses which one to show. Notifications and advisories are written in a single language.
- **Errors**: `{ "statusCode": 400, "message": "..." | ["..."], "error": "Bad Request" }`.
- **Paged lists** (admin): `{ "items": [...], "total": 120, "page": 1, "pageSize": 20 }`, with `?page=&pageSize=` (max 100).
- **Estimates**: every profit object includes `isEstimate: true`. Profit must always be labelled as an estimate in the UI.

## Enums

| Enum | Values |
|---|---|
| Language | `en`, `hi`, `bn` |
| Role | `FARMER`, `ADMIN`, `EXPERT` |
| AreaUnit | `BIGHA`, `ACRE`, `HECTARE` |
| SoilType | `ALLUVIAL`, `CLAY`, `LOAMY`, `SANDY`, `LATERITE`, `RED`, `BLACK`, `OTHER` |
| CropSeason | `KHARIF`, `RABI`, `ZAID`, `PERENNIAL` |
| FarmerCropStatus | `PLANNED`, `ACTIVE`, `HARVESTED`, `FAILED` |
| ActivityType | `LAND_PREPARATION`, `SOWING`, `TRANSPLANTING`, `IRRIGATION`, `FERTILIZER`, `WEEDING`, `PEST_CONTROL`, `HARVEST`, `OTHER` |
| ExpenseCategory | `SEED`, `FERTILIZER`, `PESTICIDE`, `LABOUR`, `IRRIGATION`, `MACHINERY`, `TRANSPORT`, `OTHER` |
| NotificationType | `CROP_REMINDER`, `WEATHER_ALERT`, `PRICE_ALERT`, `ADVISORY`, `GENERAL` |
| PriceUnit | `QUINTAL`, `KG` |
| AlertSeverity | `INFO`, `WARNING`, `SEVERE` |

These are also exported from `@krishi/shared`.

## Shared shapes

```ts
User = { id, phone, name|null, role, language, village|null, district|null, state|null, isActive, createdAt }

Crop = { id, code, name, nameHi, nameBn, localName|null, season, durationDays, defaultYieldPerAcre: number|null, isActive }

Farm = { id, name, area, areaUnit, village|null, district|null, state|null, latitude|null, longitude|null,
         soilType|null, irrigationAvailable, createdAt, updatedAt, activeCropCount }

Activity = { id, farmerCropId, activityType, title, titleHi, titleBn, description|null, descriptionHi|null,
             descriptionBn|null, scheduledDate, completed, completedAt|null }

ActivityWithCrop = Activity & { farmerCrop: { id, farm: { id, name }, crop: Crop } }

ProfitSummary = { expectedRevenue: number|null, totalExpenses: number, estimatedProfit: number|null, isEstimate: true }

Profit = ProfitSummary & {
  byCategory: { [ExpenseCategory]: number },
  assumptions: {
    yieldQuintals: number|null, yieldSource: 'FARMER'|'CROP_DEFAULT'|null,
    pricePerQuintal: number|null, priceSource: 'FARMER'|'MANDI'|null,
    priceDate: string|null, mandiName: string|null, areaInAcres: number
  }
}

FarmerCrop = { id, farmId, farm: { id, name }, crop: Crop, sowingDate, expectedHarvestDate, area, areaUnit,
               status, expectedYield|null, expectedPricePerQuintal|null, notes|null, createdAt,
               progressPercent, nextActivity: Activity|null, summary: ProfitSummary }

FarmerCropDetail = FarmerCrop & { activities: Activity[], expenses: Expense[], profit: Profit }

Expense = { id, farmerCropId, category, amount, expenseDate, description|null, createdAt,
            farmerCrop: { id, crop: Crop, farm: { id, name } } }

Mandi = { id, name, district, state, latitude|null, longitude|null }

MandiPrice = { id, mandi: Mandi, crop: Crop, price, minPrice|null, maxPrice|null, unit, priceDate, source, updatedAt }

Notification = { id, type, title, message, data|null, createdAt, readAt|null }

Advisory = { id, crop: Crop|null, title, description, season|null, language, state|null, district|null,
             isPublished, publishedAt|null, createdAt }

WeatherCurrent = { temperature, humidity, rainProbability, rainfall, windSpeed, weatherCode, observedAt }
WeatherDay     = { date, tempMin, tempMax, rainProbability, rainfall, windSpeedMax, weatherCode }
WeatherAlert   = { id, severity, title, message, validFrom, validTo, district|null, state|null, cropId|null }
```

`weatherCode` uses WMO codes as returned by Open-Meteo: 0 clear, 1–3 cloudy, 45/48 fog, 51–67 drizzle/rain, 80–82 showers, 95–99 thunderstorm.

## Auth

| Method & path | Body | Response |
|---|---|---|
| `POST /auth/send-otp` | `{ phone }`, a 10-digit Indian number or E.164 | `{ phone, expiresInSeconds, devCode? }`. `devCode` is only present when `OTP_DEV_MODE=true`. Rate-limited. |
| `POST /auth/verify-otp` | `{ phone, code, language? }` | `{ accessToken, refreshToken, user: User, isNewUser }`. Creates the farmer on first login. |
| `POST /auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }`. Rotates the refresh token. |
| `POST /auth/logout` | `{ refreshToken }` | `204` |
| `GET /auth/me` | | `User` |

Access tokens last 15 minutes. Refresh tokens last 30 days and are rotated on each use. Clients should call `refresh` when they get a `401`.

## Farmer

| Method & path | Body / query | Response |
|---|---|---|
| `GET /farmers/me` | | `User` |
| `PUT /farmers/me` | `{ name?, village?, district?, state?, language? }` | `User` |
| `POST /farmers/me/device-tokens` | `{ token, platform? }` | `204`. Registers a push token (Expo push token). |
| `DELETE /farmers/me/device-tokens/:token` | | `204` |

## Farms

| Method & path | Body / query | Response |
|---|---|---|
| `GET /farms` | | `Farm[]` |
| `POST /farms` | `{ name, area, areaUnit, village?, district?, state?, latitude?, longitude?, soilType?, irrigationAvailable? }` | `Farm` |
| `GET /farms/:id` | | `Farm & { farmerCrops: FarmerCrop[] }` |
| `PUT /farms/:id` | any field from POST | `Farm` |
| `DELETE /farms/:id` | | `204`. Also deletes the farm's crops, activities and expenses. |

## Crops (master data, read-only for farmers)

| Method & path | Response |
|---|---|
| `GET /crops?season=` | `Crop[]` (active crops only) |
| `GET /crops/:id` | `Crop & { calendar: { id, activityType, dayOffset, title, titleHi, titleBn }[] }` |

## Farmer crops

| Method & path | Body / query | Response |
|---|---|---|
| `GET /farmer-crops` | `?status=ACTIVE&farmId=` | `FarmerCrop[]` |
| `POST /farmer-crops` | `{ farmId, cropId, sowingDate, area, areaUnit, expectedYield?, expectedPricePerQuintal?, notes? }` | `FarmerCropDetail`. The server works out `expectedHarvestDate` from the crop's duration and generates activities from the crop calendar. |
| `GET /farmer-crops/:id` | | `FarmerCropDetail` |
| `PUT /farmer-crops/:id` | `{ sowingDate?, area?, areaUnit?, status?, expectedYield?, expectedPricePerQuintal?, notes? }` | `FarmerCropDetail`. Changing `sowingDate` reschedules activities that are not yet complete. |
| `DELETE /farmer-crops/:id` | | `204` |
| `GET /farmer-crops/:id/activities` | | `Activity[]`, ordered by date |
| `GET /farmer-crops/:id/profit` | | `Profit` |

## Activities

| Method & path | Body / query | Response |
|---|---|---|
| `GET /activities` | `?range=today\|upcoming\|overdue\|completed&days=7` | `ActivityWithCrop[]`. `today` returns everything due today. `upcoming` covers the next `days` days, excluding today. `overdue` is past and not complete. |
| `POST /activities/:id/complete` | | `Activity` |
| `POST /activities/:id/uncomplete` | | `Activity` |

"Today" means the date in India (IST).

## Expenses

| Method & path | Body / query | Response |
|---|---|---|
| `GET /expenses` | `?farmerCropId=` | `{ items: Expense[], total, byCategory }` |
| `POST /expenses` | `{ farmerCropId, category, amount, expenseDate, description? }` | `Expense` |
| `PUT /expenses/:id` | any field from POST except `farmerCropId` | `Expense` |
| `DELETE /expenses/:id` | | `204` |

## Weather

| Method & path | Query | Response |
|---|---|---|
| `GET /weather/current` | `?farmId=` (defaults to the farmer's first farm) or `?lat=&lon=` | `{ location: { latitude, longitude, label }, current: WeatherCurrent, fetchedAt, isStale, source }` |
| `GET /weather/forecast` | same | `{ location, daily: WeatherDay[7], alerts: WeatherAlert[], fetchedAt, isStale, source }` |

Results are cached for 1 hour. If the provider fails, the last known data is returned with `isStale: true`. If nothing is cached, the response is `503`.

## Mandi prices

| Method & path | Query | Response |
|---|---|---|
| `GET /mandis` | `?state=&district=` | `Mandi[]` |
| `GET /mandi-prices` | `?cropId=&mandiId=&district=&state=` | `MandiPrice[]`: the latest price for each mandi and crop pair, newest first |
| `GET /mandi-prices/:cropId` | `?district=&state=&days=30` | `{ crop: Crop, latest: MandiPrice[], history: { date, avgPrice }[] }` |

## Dashboard

`GET /dashboard` returns:

```ts
{
  user: User,
  activeCrops: FarmerCrop[],
  todayTasks: ActivityWithCrop[],
  overdueCount: number,
  upcomingTasks: ActivityWithCrop[],     // next 7 days, max 5
  weather: { current: WeatherCurrent, location, fetchedAt, isStale } | null,
  mandiPrices: MandiPrice[],             // latest prices for the farmer's active crops, max 6
  totals: ProfitSummary,                 // across active crops
  unreadNotifications: number,
  hasFarms: boolean
}
```

## Notifications and advisories

| Method & path | Response |
|---|---|
| `GET /notifications?page=&pageSize=` | `{ items: Notification[], unreadCount, total, page, pageSize }` |
| `POST /notifications/:id/read` | `Notification` |
| `POST /notifications/read-all` | `204` |
| `GET /advisories?cropId=&language=` | `Advisory[]`: published only. Defaults to the farmer's language. |

## Admin (`role = ADMIN`), prefix `/admin`

Admins sign in through the same OTP flow. A phone number becomes an admin through the `ADMIN_PHONES` env var or the seed script.

| Method & path | Body / query | Response |
|---|---|---|
| `GET /admin/stats` | | `{ farmers, farms, activeCrops, tasksDueToday, overdueTasks, completedTasksLast7Days, notificationsLast7Days, activeWeatherAlerts, latestMandiPriceDate, farmersByDistrict: {district,count}[], cropsByType: {cropId,name,count}[] }` |
| `GET /admin/farmers` | `?search=&district=&isActive=&page=&pageSize=` | Paged `User & { farmCount, activeCropCount, lastLoginAt }` |
| `GET /admin/farmers/:id` | | `User & { farms: (Farm & { farmerCrops: FarmerCrop-lite[] })[] }` |
| `PATCH /admin/farmers/:id` | `{ name?, village?, district?, state?, language?, isActive? }` | `User` |
| `GET /admin/farms` | `?search=&district=&page=&pageSize=` | Paged `Farm & { user: {id,name,phone}, cropCount }` |
| `GET /admin/crops` | | `Crop[]` (including inactive) with `templateCount` |
| `POST /admin/crops` | `{ code, name, nameHi, nameBn, localName?, season, durationDays, defaultYieldPerAcre?, isActive? }` | `Crop` |
| `PUT /admin/crops/:id` | partial of POST | `Crop` |
| `GET /admin/crops/:id/calendar` | | `Template[]` |
| `POST /admin/crops/:id/calendar` | `{ activityType, dayOffset, title, titleHi, titleBn, description?, descriptionHi?, descriptionBn?, sortOrder? }` | `Template` |
| `PUT /admin/calendar-templates/:id` | partial | `Template` |
| `DELETE /admin/calendar-templates/:id` | | `204` |
| `GET /admin/mandis` / `POST` / `PUT /admin/mandis/:id` | `{ name, district, state, latitude?, longitude?, isActive? }` | `Mandi` |
| `GET /admin/mandi-prices` | `?cropId=&mandiId=&from=&to=&page=&pageSize=` | Paged `MandiPrice` |
| `POST /admin/mandi-prices` | `{ mandiId, cropId, price, minPrice?, maxPrice?, unit?, priceDate, source? }` | `MandiPrice`. Upserts on (mandi, crop, date). |
| `PUT /admin/mandi-prices/:id` / `DELETE` | partial | `MandiPrice` / `204` |
| `POST /admin/mandi-prices/import` | `{ source?, rows: { mandiName, district, state, cropCode, price, minPrice?, maxPrice?, unit?, priceDate }[] }` (max 2000) | `{ created, updated, errors: { row, message }[] }`. Creates unknown mandis automatically. |
| `GET /admin/advisories` | `?cropId=&language=&page=` | Paged `Advisory` |
| `POST /admin/advisories` | `{ cropId?, title, description, season?, language, state?, district? }` | `Advisory` (draft) |
| `PUT /admin/advisories/:id` / `DELETE` | | `Advisory` / `204` |
| `POST /admin/advisories/:id/publish` | `{ notify?: boolean }` | `{ advisory, notified }`. With `notify`, the advisory is sent to matching farmers: those with the crop who use the advisory's language and live in its region. |
| `GET /admin/weather-alerts` | `?active=true&page=` | Paged `WeatherAlert` |
| `POST /admin/weather-alerts` | `{ severity, title, message, language, validFrom, validTo, state?, district?, cropId?, notify? }` | `{ alert, notified }` |
| `PUT /admin/weather-alerts/:id` / `DELETE` | | |
| `GET /admin/notifications` | `?type=&page=` | Paged `Notification & { user: {id,name,phone} }` |
| `POST /admin/notifications/send` | `{ type, title, message, target: { all?, state?, district?, cropId?, language?, userIds? }, scheduledAt? }` | `{ recipients }` |
| `GET /admin/audit-logs` | `?entity=&page=` | Paged `{ id, action, entity, entityId, changes, createdAt, actor: {id,name,phone}|null }` |
| `GET /admin/settings` | | `{ languages, areaUnits, soilTypes, seasons, activityTypes, expenseCategories, notificationTypes, priceUnits, severities }` |
| `POST /admin/jobs/:name/run` | `name` ∈ `reminders`, `weather-check`, `dispatch`, `cleanup` | Runs a background job immediately, for pilots and QA. Returns the job's result. |

Changes to crops, calendar templates, mandis, prices, advisories, alerts and farmer accounts are written to the audit log.

## Behaviour notes

- **Registering a crop late.** If a farmer adds a crop whose sowing date is in the past, activities dated before today are created as `completed: true` with `completedAt: null`, meaning "assumed done". This keeps a new user from opening the app to a wall of overdue tasks.
- **Crop status.** A crop with a future sowing date starts as `PLANNED`; otherwise it starts as `ACTIVE`. Both count as active for tasks, reminders and the dashboard.
- **Template edits.** Calendar template changes only affect crops planted after the change. Existing activities keep their own copy of the template text.
- **Reminders.** At 07:00 IST, one `CROP_REMINDER` is sent for each activity due today, in the farmer's language.
- **Rain alerts.** At 18:00 IST, a `WEATHER_ALERT` is sent if tomorrow's forecast for any of a farmer's farms shows at least a 70% chance of rain and at least 20 mm. A farmer gets at most one per day.
- **Weather alert language.** `/weather/forecast` only returns admin alerts written in the farmer's language. Admins should publish one alert per language.
- **Push.** Push notifications go through the Expo push service, which uses FCM on Android. They are only sent when `PUSH_ENABLED=true`. In-app notifications are always created.

## Health

`GET /health` returns `{ status: "ok", db: "ok" | "error", time }`.
