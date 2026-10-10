import type { ExpenseCategory } from './enums';

export interface ExpenseLike {
  amount: number;
  category: ExpenseCategory;
}

/** Round to 2 decimal places (paise) to avoid floating point noise. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumExpenses(expenses: readonly Pick<ExpenseLike, 'amount'>[]): number {
  return roundMoney(expenses.reduce((total, e) => total + e.amount, 0));
}

export function expensesByCategory(expenses: readonly ExpenseLike[]): Partial<Record<ExpenseCategory, number>> {
  const totals: Partial<Record<ExpenseCategory, number>> = {};
  for (const e of expenses) totals[e.category] = roundMoney((totals[e.category] ?? 0) + e.amount);
  return totals;
}

export interface ProfitInput {
  /** Expected total yield, in quintals. */
  expectedYield: number | null;
  /** Expected selling price per quintal (INR). */
  expectedPricePerQuintal: number | null;
  totalExpenses: number;
}

export interface ProfitEstimate {
  expectedRevenue: number | null;
  totalExpenses: number;
  estimatedProfit: number | null;
  /** Always true: profitability figures are estimates, never guaranteed income. */
  isEstimate: true;
}

/**
 * Expected Revenue = Expected Yield × Expected Selling Price
 * Estimated Profit = Expected Revenue − Total Crop Expenses
 * Revenue and profit are null when yield or price is unknown.
 */
export function calculateProfit(input: ProfitInput): ProfitEstimate {
  const totalExpenses = roundMoney(input.totalExpenses);
  if (input.expectedYield == null || input.expectedPricePerQuintal == null) {
    return { expectedRevenue: null, totalExpenses, estimatedProfit: null, isEstimate: true };
  }
  if (input.expectedYield < 0 || input.expectedPricePerQuintal < 0) {
    throw new Error('Yield and price cannot be negative');
  }
  const expectedRevenue = roundMoney(input.expectedYield * input.expectedPricePerQuintal);
  return {
    expectedRevenue,
    totalExpenses,
    estimatedProfit: roundMoney(expectedRevenue - totalExpenses),
    isEstimate: true,
  };
}
