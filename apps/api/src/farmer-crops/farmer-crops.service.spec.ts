import { Prisma } from '@prisma/client';
import { PriceReferenceService } from '../mandi/price-reference.service';
import { PrismaService } from '../prisma/prisma.service';
import { FarmerCropsService } from './farmer-crops.service';

describe('FarmerCropsService.computeProfit', () => {
  const service = new FarmerCropsService({} as PrismaService, {} as PriceReferenceService);
  const dec = (n: number) => new Prisma.Decimal(n);

  const base = {
    cropId: 'crop-1',
    area: dec(3),
    areaUnit: 'BIGHA' as const,
    expectedYield: null,
    expectedPricePerQuintal: null,
    crop: { defaultYieldPerAcre: dec(12) } as never,
    farm: { id: 'f', name: 'Farm', district: 'Purba Bardhaman', state: 'West Bengal' },
    expenses: [
      { amount: dec(1200), category: 'SEED' as const },
      { amount: dec(1850.5), category: 'FERTILIZER' as const },
    ],
  };

  it('falls back to crop default yield and the latest mandi price', async () => {
    const lookup = jest.fn().mockResolvedValue({
      pricePerQuintal: 2300,
      priceDate: new Date('2026-10-01'),
      mandiName: 'Bardhaman',
    });
    const p = await service.computeProfit(base, lookup);

    expect(lookup).toHaveBeenCalledWith('crop-1', 'Purba Bardhaman', 'West Bengal');
    // 3 WB bigha ≈ 0.9917 acre × 12 q/acre = 11.9 q
    expect(p.assumptions).toMatchObject({ yieldSource: 'CROP_DEFAULT', yieldQuintals: 11.9, priceSource: 'MANDI', mandiName: 'Bardhaman' });
    expect(p.totalExpenses).toBe(3050.5);
    expect(p.expectedRevenue).toBe(27370);
    expect(p.estimatedProfit).toBe(24319.5);
    expect(p.isEstimate).toBe(true);
    expect(p.byCategory).toEqual({ SEED: 1200, FERTILIZER: 1850.5 });
  });

  it("prefers the farmer's own yield and price", async () => {
    const lookup = jest.fn();
    const p = await service.computeProfit(
      { ...base, expectedYield: dec(10), expectedPricePerQuintal: dec(2000) },
      lookup,
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(p.assumptions).toMatchObject({ yieldSource: 'FARMER', priceSource: 'FARMER' });
    expect(p.expectedRevenue).toBe(20000);
  });

  it('returns no revenue estimate when no price is known', async () => {
    const p = await service.computeProfit(base, jest.fn().mockResolvedValue(null));
    expect(p.expectedRevenue).toBeNull();
    expect(p.estimatedProfit).toBeNull();
    expect(p.totalExpenses).toBe(3050.5);
  });
});
