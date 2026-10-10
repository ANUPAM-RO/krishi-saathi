-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'ADMIN', 'EXPERT');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'hi', 'bn');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('BIGHA', 'ACRE', 'HECTARE');

-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('ALLUVIAL', 'CLAY', 'LOAMY', 'SANDY', 'LATERITE', 'RED', 'BLACK', 'OTHER');

-- CreateEnum
CREATE TYPE "CropSeason" AS ENUM ('KHARIF', 'RABI', 'ZAID', 'PERENNIAL');

-- CreateEnum
CREATE TYPE "FarmerCropStatus" AS ENUM ('PLANNED', 'ACTIVE', 'HARVESTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LAND_PREPARATION', 'SOWING', 'TRANSPLANTING', 'IRRIGATION', 'FERTILIZER', 'WEEDING', 'PEST_CONTROL', 'HARVEST', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SEED', 'FERTILIZER', 'PESTICIDE', 'LABOUR', 'IRRIGATION', 'MACHINERY', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CROP_REMINDER', 'WEATHER_ALERT', 'PRICE_ALERT', 'ADVISORY', 'GENERAL');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('QUINTAL', 'KG');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'SEVERE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'FARMER',
    "language" "Language" NOT NULL DEFAULT 'bn',
    "village" TEXT,
    "district" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" DECIMAL(10,3) NOT NULL,
    "area_unit" "AreaUnit" NOT NULL DEFAULT 'BIGHA',
    "village" TEXT,
    "district" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "soil_type" "SoilType",
    "irrigation_available" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hindi_name" TEXT NOT NULL,
    "bengali_name" TEXT NOT NULL,
    "local_name" TEXT,
    "season" "CropSeason" NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "default_yield_per_acre" DECIMAL(8,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_calendar_templates" (
    "id" TEXT NOT NULL,
    "crop_id" TEXT NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "day_offset" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_bn" TEXT NOT NULL,
    "description" TEXT,
    "description_hi" TEXT,
    "description_bn" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_calendar_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_crops" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "crop_id" TEXT NOT NULL,
    "sowing_date" DATE NOT NULL,
    "expected_harvest_date" DATE NOT NULL,
    "area" DECIMAL(10,3) NOT NULL,
    "area_unit" "AreaUnit" NOT NULL DEFAULT 'BIGHA',
    "status" "FarmerCropStatus" NOT NULL DEFAULT 'ACTIVE',
    "expected_yield" DECIMAL(10,2),
    "expected_price_per_quintal" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_activities" (
    "id" TEXT NOT NULL,
    "farmer_crop_id" TEXT NOT NULL,
    "template_id" TEXT,
    "activity_type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_hi" TEXT NOT NULL,
    "title_bn" TEXT NOT NULL,
    "description" TEXT,
    "description_hi" TEXT,
    "description_bn" TEXT,
    "scheduled_date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "farmer_crop_id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandi_prices" (
    "id" TEXT NOT NULL,
    "mandi_id" TEXT NOT NULL,
    "crop_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "min_price" DECIMAL(10,2),
    "max_price" DECIMAL(10,2),
    "unit" "PriceUnit" NOT NULL DEFAULT 'QUINTAL',
    "price_date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandi_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_records" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT,
    "location_key" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "rain_probability" DOUBLE PRECISION,
    "rainfall" DOUBLE PRECISION,
    "wind_speed" DOUBLE PRECISION,
    "weather_date" TIMESTAMP(3) NOT NULL,
    "forecast" JSONB,
    "source" TEXT NOT NULL DEFAULT 'open-meteo',
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_alerts" (
    "id" TEXT NOT NULL,
    "state" TEXT,
    "district" TEXT,
    "crop_id" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'bn',
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_advisories" (
    "id" TEXT NOT NULL,
    "crop_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "season" "CropSeason",
    "language" "Language" NOT NULL,
    "state" TEXT,
    "district" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_advisories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_district_idx" ON "users"("district");

-- CreateIndex
CREATE INDEX "otp_requests_phone_created_at_idx" ON "otp_requests"("phone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "farms_user_id_idx" ON "farms"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "crops_code_key" ON "crops"("code");

-- CreateIndex
CREATE INDEX "crop_calendar_templates_crop_id_idx" ON "crop_calendar_templates"("crop_id");

-- CreateIndex
CREATE INDEX "farmer_crops_farm_id_idx" ON "farmer_crops"("farm_id");

-- CreateIndex
CREATE INDEX "farmer_crops_crop_id_idx" ON "farmer_crops"("crop_id");

-- CreateIndex
CREATE INDEX "crop_activities_farmer_crop_id_scheduled_date_idx" ON "crop_activities"("farmer_crop_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "crop_activities_scheduled_date_completed_idx" ON "crop_activities"("scheduled_date", "completed");

-- CreateIndex
CREATE INDEX "expenses_farmer_crop_id_idx" ON "expenses"("farmer_crop_id");

-- CreateIndex
CREATE INDEX "mandis_state_district_idx" ON "mandis"("state", "district");

-- CreateIndex
CREATE UNIQUE INDEX "mandis_name_district_state_key" ON "mandis"("name", "district", "state");

-- CreateIndex
CREATE INDEX "mandi_prices_crop_id_price_date_idx" ON "mandi_prices"("crop_id", "price_date");

-- CreateIndex
CREATE UNIQUE INDEX "mandi_prices_mandi_id_crop_id_price_date_key" ON "mandi_prices"("mandi_id", "crop_id", "price_date");

-- CreateIndex
CREATE INDEX "weather_records_location_key_fetched_at_idx" ON "weather_records"("location_key", "fetched_at");

-- CreateIndex
CREATE INDEX "weather_alerts_state_district_valid_to_idx" ON "weather_alerts"("state", "district", "valid_to");

-- CreateIndex
CREATE INDEX "crop_advisories_crop_id_language_is_published_idx" ON "crop_advisories"("crop_id", "language", "is_published");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_sent_at_scheduled_at_idx" ON "notifications"("sent_at", "scheduled_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_calendar_templates" ADD CONSTRAINT "crop_calendar_templates_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_activities" ADD CONSTRAINT "crop_activities_farmer_crop_id_fkey" FOREIGN KEY ("farmer_crop_id") REFERENCES "farmer_crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_activities" ADD CONSTRAINT "crop_activities_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "crop_calendar_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_farmer_crop_id_fkey" FOREIGN KEY ("farmer_crop_id") REFERENCES "farmer_crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_prices" ADD CONSTRAINT "mandi_prices_mandi_id_fkey" FOREIGN KEY ("mandi_id") REFERENCES "mandis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_prices" ADD CONSTRAINT "mandi_prices_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_records" ADD CONSTRAINT "weather_records_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_alerts" ADD CONSTRAINT "weather_alerts_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_advisories" ADD CONSTRAINT "crop_advisories_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
