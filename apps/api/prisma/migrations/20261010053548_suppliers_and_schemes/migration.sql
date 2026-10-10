-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('TRACTOR', 'PUMP', 'FERTILIZER', 'SEED', 'PESTICIDE');

-- CreateEnum
CREATE TYPE "SchemeCategory" AS ENUM ('INCOME_SUPPORT', 'INSURANCE', 'CREDIT', 'SUBSIDY', 'OTHER');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categories" "SupplierCategory"[],
    "contact_person" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "village" TEXT,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_schemes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "SchemeCategory" NOT NULL,
    "benefits" TEXT,
    "eligibility" TEXT,
    "how_to_apply" TEXT,
    "documents" TEXT,
    "apply_url" TEXT,
    "helpline" TEXT,
    "language" "Language" NOT NULL,
    "state" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_state_district_idx" ON "suppliers"("state", "district");

-- CreateIndex
CREATE INDEX "government_schemes_language_is_published_idx" ON "government_schemes"("language", "is_published");
