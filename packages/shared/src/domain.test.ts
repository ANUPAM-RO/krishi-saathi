import {
  addDays,
  calculateExpectedHarvestDate,
  calculateProfit,
  convertArea,
  cropProgressPercent,
  diffInDays,
  distanceKm,
  expensesByCategory,
  formatDateOnly,
  generateActivitySchedule,
  sumExpenses,
  todayInIndia,
} from './index';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(formatDateOnly(addDays('2026-12-30', 3))).toBe('2027-01-02');
    expect(formatDateOnly(addDays('2026-03-01', -1))).toBe('2026-02-28');
  });

  it('ignores time of day', () => {
    expect(diffInDays('2026-06-01T23:59:00Z', '2026-06-02T00:01:00Z')).toBe(1);
  });

  it('uses the IST date for "today"', () => {
    // 20:00 UTC on 9 Oct is 01:30 IST on 10 Oct.
    expect(formatDateOnly(todayInIndia(new Date('2026-10-09T20:00:00Z')))).toBe('2026-10-10');
  });
});

describe('crop calendar', () => {
  it('calculates expected harvest from crop duration', () => {
    expect(formatDateOnly(calculateExpectedHarvestDate('2026-07-01', 120))).toBe('2026-10-29');
  });

  it('rejects invalid durations', () => {
    expect(() => calculateExpectedHarvestDate('2026-07-01', 0)).toThrow();
    expect(() => calculateExpectedHarvestDate('2026-07-01', 10.5)).toThrow();
  });

  it('generates a dated, ordered schedule including pre-sowing activities', () => {
    const schedule = generateActivitySchedule('2026-07-01', [
      { activityType: 'HARVEST' as const, dayOffset: 120 },
      { activityType: 'FERTILIZER' as const, dayOffset: 21, sortOrder: 2 },
      { activityType: 'WEEDING' as const, dayOffset: 21, sortOrder: 1 },
      { activityType: 'LAND_PREPARATION' as const, dayOffset: -7 },
    ]);
    expect(schedule.map((s) => [s.activityType, formatDateOnly(s.scheduledDate)])).toEqual([
      ['LAND_PREPARATION', '2026-06-24'],
      ['WEEDING', '2026-07-22'],
      ['FERTILIZER', '2026-07-22'],
      ['HARVEST', '2026-10-29'],
    ]);
  });

  it('clamps crop progress to 0..100', () => {
    expect(cropProgressPercent('2026-07-01', '2026-07-11', '2026-06-01')).toBe(0);
    expect(cropProgressPercent('2026-07-01', '2026-07-11', '2026-07-06')).toBe(50);
    expect(cropProgressPercent('2026-07-01', '2026-07-11', '2026-08-01')).toBe(100);
  });
});

describe('area conversion', () => {
  it('converts West Bengal bigha to acres and hectares', () => {
    expect(convertArea(3, 'BIGHA', 'ACRE')).toBeCloseTo(0.9917, 3);
    expect(convertArea(1, 'HECTARE', 'ACRE')).toBeCloseTo(2.4711, 3);
    expect(convertArea(2, 'ACRE', 'ACRE')).toBe(2);
  });

  it('rejects negative areas', () => {
    expect(() => convertArea(-1, 'ACRE', 'HECTARE')).toThrow();
  });
});

describe('expenses and profit', () => {
  const expenses = [
    { amount: 1200.1, category: 'SEED' as const },
    { amount: 800.2, category: 'FERTILIZER' as const },
    { amount: 99.7, category: 'SEED' as const },
  ];

  it('totals expenses without floating point noise', () => {
    expect(sumExpenses(expenses)).toBe(2100);
    expect(sumExpenses([])).toBe(0);
  });

  it('groups expenses by category', () => {
    expect(expensesByCategory(expenses)).toEqual({ SEED: 1299.8, FERTILIZER: 800.2 });
  });

  it('calculates revenue and profit as estimates', () => {
    expect(calculateProfit({ expectedYield: 20, expectedPricePerQuintal: 2300, totalExpenses: 18000 })).toEqual({
      expectedRevenue: 46000,
      totalExpenses: 18000,
      estimatedProfit: 28000,
      isEstimate: true,
    });
  });

  it('allows negative profit (a loss)', () => {
    expect(calculateProfit({ expectedYield: 5, expectedPricePerQuintal: 1000, totalExpenses: 8000 }).estimatedProfit).toBe(
      -3000,
    );
  });

  it('returns null revenue/profit when yield or price is unknown', () => {
    expect(calculateProfit({ expectedYield: null, expectedPricePerQuintal: 2000, totalExpenses: 500 })).toEqual({
      expectedRevenue: null,
      totalExpenses: 500,
      estimatedProfit: null,
      isEstimate: true,
    });
  });
});

describe('geo', () => {
  it('returns 0 for the same point', () => {
    expect(distanceKm(23.2324, 87.8615, 23.2324, 87.8615)).toBe(0);
  });

  it('measures road-trip scale distances', () => {
    // Bardhaman to Kolkata is roughly 95 km in a straight line.
    const d = distanceKm(23.2324, 87.8615, 22.5726, 88.3639);
    expect(d).toBeGreaterThan(85);
    expect(d).toBeLessThan(95);
  });
});
