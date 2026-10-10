/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import {
  addDays,
  calculateExpectedHarvestDate,
  generateActivitySchedule,
  todayInIndia,
} from '@krishi/shared';
import { ACTIVITY_LIBRARY, ADVISORIES, CROPS, MANDIS } from './seed-data';

const prisma = new PrismaClient();

const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? '+919999999999';
const DEMO_FARMER_PHONE = process.env.SEED_DEMO_PHONE ?? '+919876543210';
const PRICE_DAYS = 14;
/** Marks generated prices so nobody mistakes them for real market data. */
const SAMPLE_SOURCE = 'sample-seed';

/** Deterministic pseudo-random numbers so re-seeding produces the same sample prices. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function seedCrops() {
  for (const c of CROPS) {
    const { calendar, samplePrice: _p, ...data } = c;
    const crop = await prisma.crop.upsert({ where: { code: c.code }, create: data, update: data });

    // Only create templates for crops that have none, so admin edits survive re-seeding.
    const existing = await prisma.cropCalendarTemplate.count({ where: { cropId: crop.id } });
    if (existing === 0) {
      await prisma.cropCalendarTemplate.createMany({
        data: calendar.map(([key, dayOffset], i) => {
          const a = ACTIVITY_LIBRARY[key];
          return {
            cropId: crop.id,
            activityType: a.type,
            dayOffset,
            sortOrder: i,
            title: a.title.en,
            titleHi: a.title.hi,
            titleBn: a.title.bn,
            description: a.description.en,
            descriptionHi: a.description.hi,
            descriptionBn: a.description.bn,
          };
        }),
      });
    }
  }
  console.log(`✓ ${CROPS.length} crops with calendar templates`);
}

async function seedMandisAndPrices() {
  const crops = await prisma.crop.findMany({ select: { id: true, code: true } });
  const cropId = new Map(crops.map((c) => [c.code, c.id]));
  const today = todayInIndia();
  let priceCount = 0;

  for (const [mi, m] of MANDIS.entries()) {
    const mandi = await prisma.mandi.upsert({
      where: { name_district_state: { name: m.name, district: m.district, state: m.state } },
      create: m,
      update: { latitude: m.latitude, longitude: m.longitude },
    });

    const rand = seededRandom(mi + 1);
    for (const [ci, c] of CROPS.entries()) {
      // Not every mandi trades every crop, but every crop is traded in two of every three mandis.
      if ((mi + ci) % 3 === 0) continue;
      const base = c.samplePrice * (0.92 + rand() * 0.16);
      for (let d = 0; d < PRICE_DAYS; d++) {
        if (rand() < 0.2) continue; // markets don't report every day
        const priceDate = addDays(today, -d);
        const modal = Math.round(base * (0.96 + rand() * 0.08));
        const values = {
          price: modal,
          minPrice: Math.round(modal * 0.93),
          maxPrice: Math.round(modal * 1.06),
          unit: 'QUINTAL' as const,
          source: SAMPLE_SOURCE,
        };
        const key = { mandiId: mandi.id, cropId: cropId.get(c.code)!, priceDate };
        const existing = await prisma.mandiPrice.findUnique({ where: { mandiId_cropId_priceDate: key }, select: { source: true } });
        // Never overwrite real (imported/admin) prices with sample data.
        if (existing && existing.source !== SAMPLE_SOURCE) continue;
        await prisma.mandiPrice.upsert({
          where: { mandiId_cropId_priceDate: key },
          create: { ...key, ...values },
          update: values,
        });
        priceCount++;
      }
    }
  }
  console.log(`✓ ${MANDIS.length} mandis, ${priceCount} sample prices (source="${SAMPLE_SOURCE}")`);
}

async function seedUsers() {
  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    create: { phone: ADMIN_PHONE, name: 'Krishi Admin', role: 'ADMIN', language: 'en', state: 'West Bengal' },
    update: { role: 'ADMIN' },
  });

  const farmer = await prisma.user.upsert({
    where: { phone: DEMO_FARMER_PHONE },
    create: {
      phone: DEMO_FARMER_PHONE,
      name: 'Demo Farmer',
      language: 'bn',
      village: 'Memari',
      district: 'Purba Bardhaman',
      state: 'West Bengal',
    },
    update: {},
  });

  const farms = await prisma.farm.count({ where: { userId: farmer.id } });
  if (farms === 0) {
    const farm = await prisma.farm.create({
      data: {
        userId: farmer.id,
        name: 'North field',
        area: 3,
        areaUnit: 'BIGHA',
        village: 'Memari',
        district: 'Purba Bardhaman',
        state: 'West Bengal',
        latitude: 23.1765,
        longitude: 88.1058,
        soilType: 'ALLUVIAL',
        irrigationAvailable: true,
      },
    });

    const crop = await prisma.crop.findUniqueOrThrow({
      where: { code: 'paddy-aman' },
      include: { calendarTemplates: { where: { isActive: true } } },
    });
    const today = todayInIndia();
    const sowingDate = addDays(today, -45);
    const schedule = generateActivitySchedule(sowingDate, crop.calendarTemplates);

    await prisma.farmerCrop.create({
      data: {
        farmId: farm.id,
        cropId: crop.id,
        sowingDate,
        expectedHarvestDate: calculateExpectedHarvestDate(sowingDate, crop.durationDays),
        area: 3,
        areaUnit: 'BIGHA',
        status: 'ACTIVE',
        activities: {
          create: schedule.map((t) => ({
            templateId: t.id,
            activityType: t.activityType,
            title: t.title,
            titleHi: t.titleHi,
            titleBn: t.titleBn,
            description: t.description,
            descriptionHi: t.descriptionHi,
            descriptionBn: t.descriptionBn,
            scheduledDate: t.scheduledDate,
            completed: t.scheduledDate < addDays(today, -3),
            completedAt: t.scheduledDate < addDays(today, -3) ? t.scheduledDate : null,
          })),
        },
        expenses: {
          create: [
            { category: 'SEED', amount: 1200, expenseDate: sowingDate, description: 'Seed (sample)' },
            { category: 'LABOUR', amount: 3000, expenseDate: addDays(sowingDate, 25), description: 'Transplanting labour (sample)' },
            { category: 'FERTILIZER', amount: 1850, expenseDate: addDays(sowingDate, 24), description: 'Basal fertilizer (sample)' },
          ],
        },
      },
    });
  }
  console.log(`✓ admin ${admin.phone}, demo farmer ${farmer.phone}`);
}

async function seedAdvisories() {
  const admin = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE }, select: { id: true } });
  let created = 0;
  for (const a of ADVISORIES) {
    const exists = await prisma.cropAdvisory.findFirst({ where: { title: a.title }, select: { id: true } });
    if (exists) continue;
    const crop = await prisma.crop.findUnique({ where: { code: a.cropCode }, select: { id: true } });
    await prisma.cropAdvisory.create({
      data: {
        cropId: crop?.id,
        language: a.language,
        title: a.title,
        description: a.description,
        state: 'West Bengal',
        isPublished: true,
        publishedAt: new Date(),
        createdById: admin?.id,
      },
    });
    created++;
  }
  console.log(`✓ ${created} new advisories`);
}

async function main() {
  await seedCrops();
  await seedMandisAndPrices();
  await seedUsers();
  await seedAdvisories();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
