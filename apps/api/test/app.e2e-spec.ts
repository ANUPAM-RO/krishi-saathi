/**
 * API integration tests. Needs a migrated and seeded database (see README):
 *   npm run db:up && npm run db:deploy -w @krishi/api && npm run db:seed -w @krishi/api
 */
process.env.OTP_DEV_MODE = 'true';
process.env.JOBS_ENABLED = 'false';
process.env.PUSH_ENABLED = 'false';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { APP_CONFIG, AppConfig } from '../src/config/configuration';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const uniquePhone = (prefix: string) => `${prefix}${String(Date.now()).slice(-8)}`;
const isoDate = (offsetDays: number) =>
  new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

describe('Krishi Saathi API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  async function login(phone: string) {
    const sent = await http().post('/api/auth/send-otp').send({ phone }).expect(200);
    expect(sent.body.devCode).toMatch(/^\d{6}$/);
    const verified = await http()
      .post('/api/auth/verify-otp')
      .send({ phone, code: sent.body.devCode, language: 'hi' })
      .expect(200);
    return verified.body as { accessToken: string; refreshToken: string; user: { id: string; role: string } };
  }

  let farmerA: Awaited<ReturnType<typeof login>>;
  let farmerB: Awaited<ReturnType<typeof login>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, app.get<AppConfig>(APP_CONFIG));
    await app.init();
    prisma = app.get(PrismaService);

    farmerA = await login(uniquePhone('95'));
    farmerB = await login(uniquePhone('94'));
    createdUserIds.push(farmerA.user.id, farmerB.user.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  const auth = (t: { accessToken: string }) => ({ Authorization: `Bearer ${t.accessToken}` });

  describe('auth', () => {
    it('creates new users as farmers with the chosen language', () => {
      expect(farmerA.user.role).toBe('FARMER');
    });

    it('rejects requests without a token', () => http().get('/api/farms').expect(401));

    it('rejects a wrong OTP', async () => {
      const phone = uniquePhone('93');
      await http().post('/api/auth/send-otp').send({ phone }).expect(200);
      await http().post('/api/auth/verify-otp').send({ phone, code: '000000' }).expect(400);
    });

    it('rotates refresh tokens and detects reuse', async () => {
      const first = await http().post('/api/auth/refresh').send({ refreshToken: farmerB.refreshToken }).expect(200);
      await http().post('/api/auth/refresh').send({ refreshToken: farmerB.refreshToken }).expect(401);
      // Reuse revokes the whole session family.
      await http().post('/api/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
    });
  });

  describe('farm → crop → activities → expenses → profit', () => {
    let farmId: string;
    let farmerCropId: string;
    let activityId: string;
    let expenseId: string;

    it('creates a farm', async () => {
      const res = await http()
        .post('/api/farms')
        .set(auth(farmerA))
        .send({ name: 'Test field', area: 3, areaUnit: 'BIGHA', district: 'Purba Bardhaman', state: 'West Bengal' })
        .expect(201);
      expect(res.body.area).toBe(3);
      farmId = res.body.id;
    });

    it('validates farm input', () =>
      http().post('/api/farms').set(auth(farmerA)).send({ name: '', area: -2, areaUnit: 'YARD' }).expect(400));

    it('creates a crop and generates its calendar', async () => {
      const crop = await prisma.crop.findUniqueOrThrow({
        where: { code: 'wheat' },
        include: { _count: { select: { calendarTemplates: true } } },
      });
      const res = await http()
        .post('/api/farmer-crops')
        .set(auth(farmerA))
        .send({ farmId, cropId: crop.id, sowingDate: isoDate(-10), area: 3, areaUnit: 'BIGHA' })
        .expect(201);

      farmerCropId = res.body.id;
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.activities).toHaveLength(crop._count.calendarTemplates);
      expect(res.body.expectedHarvestDate.slice(0, 10)).toBe(isoDate(-10 + crop.durationDays));
      // Activities before today are assumed done when a crop is registered late.
      expect(res.body.activities.filter((a: { completed: boolean }) => a.completed).length).toBeGreaterThan(0);
      expect(res.body.profit.isEstimate).toBe(true);
      activityId = res.body.activities.find((a: { completed: boolean }) => !a.completed).id;
    });

    it('lists upcoming activities and completes one', async () => {
      const upcoming = await http().get('/api/activities?range=upcoming&days=60').set(auth(farmerA)).expect(200);
      expect(upcoming.body.some((a: { id: string }) => a.id === activityId)).toBe(true);
      const done = await http().post(`/api/activities/${activityId}/complete`).set(auth(farmerA)).expect(200);
      expect(done.body.completed).toBe(true);
    });

    it('adds, edits and totals expenses', async () => {
      const created = await http()
        .post('/api/expenses')
        .set(auth(farmerA))
        .send({ farmerCropId, category: 'SEED', amount: 1500.25, expenseDate: isoDate(-10) })
        .expect(201);
      expenseId = created.body.id;
      await http().put(`/api/expenses/${expenseId}`).set(auth(farmerA)).send({ amount: 1600 }).expect(200);
      const list = await http().get(`/api/expenses?farmerCropId=${farmerCropId}`).set(auth(farmerA)).expect(200);
      expect(list.body.total).toBe(1600);
      expect(list.body.byCategory).toEqual({ SEED: 1600 });
    });

    it('calculates profit from the farmer estimate', async () => {
      const res = await http()
        .put(`/api/farmer-crops/${farmerCropId}`)
        .set(auth(farmerA))
        .send({ expectedYield: 10, expectedPricePerQuintal: 2400 })
        .expect(200);
      expect(res.body.summary).toEqual({ expectedRevenue: 24000, totalExpenses: 1600, estimatedProfit: 22400, isEstimate: true });
    });

    it("hides one farmer's data from another", async () => {
      await http().get(`/api/farms/${farmId}`).set(auth(farmerB)).expect(404);
      await http().get(`/api/farmer-crops/${farmerCropId}`).set(auth(farmerB)).expect(404);
      await http().put(`/api/expenses/${expenseId}`).set(auth(farmerB)).send({ amount: 1 }).expect(404);
      await http().post(`/api/activities/${activityId}/complete`).set(auth(farmerB)).expect(404);
      const list = await http().get('/api/farmer-crops').set(auth(farmerB)).expect(200);
      expect(list.body).toEqual([]);
    });

    it('blocks farmers from admin endpoints', () => http().get('/api/admin/stats').set(auth(farmerA)).expect(403));

    it('returns a dashboard', async () => {
      const res = await http().get('/api/dashboard').set(auth(farmerA)).expect(200);
      expect(res.body.hasFarms).toBe(true);
      expect(res.body.activeCrops).toHaveLength(1);
      expect(res.body.totals.isEstimate).toBe(true);
    });

    it('deletes an expense and the farm', async () => {
      await http().delete(`/api/expenses/${expenseId}`).set(auth(farmerA)).expect(204);
      await http().delete(`/api/farms/${farmId}`).set(auth(farmerA)).expect(204);
      await http().get(`/api/farmer-crops/${farmerCropId}`).set(auth(farmerA)).expect(404);
    });
  });
});
