import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { expensesByCategory, sumExpenses } from '@krishi/shared';
import { parseDateOnly } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';

const expenseInclude = {
  farmerCrop: { select: { id: true, crop: true, farm: { select: { id: true, name: true } } } },
} satisfies Prisma.ExpenseInclude;

export interface ExpenseInput {
  farmerCropId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  description?: string;
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, farmerCropId?: string) {
    const items = await this.prisma.expense.findMany({
      where: { farmerCropId, farmerCrop: { farm: { userId } } },
      include: expenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
    const plain = items.map((e) => ({ amount: Number(e.amount), category: e.category }));
    return { items, total: sumExpenses(plain), byCategory: expensesByCategory(plain) };
  }

  async create(userId: string, dto: ExpenseInput) {
    const fc = await this.prisma.farmerCrop.findFirst({
      where: { id: dto.farmerCropId, farm: { userId } },
      select: { id: true },
    });
    if (!fc) throw new NotFoundException('Crop not found');
    return this.prisma.expense.create({
      data: {
        farmerCropId: dto.farmerCropId,
        category: dto.category,
        amount: dto.amount,
        expenseDate: parseDateOnly(dto.expenseDate, 'expenseDate'),
        description: dto.description?.trim() || null,
      },
      include: expenseInclude,
    });
  }

  async update(userId: string, id: string, dto: Partial<Omit<ExpenseInput, 'farmerCropId'>>) {
    await this.findOwned(userId, id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        category: dto.category,
        amount: dto.amount,
        expenseDate: dto.expenseDate ? parseDateOnly(dto.expenseDate, 'expenseDate') : undefined,
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
      },
      include: expenseInclude,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, farmerCrop: { farm: { userId } } },
      select: { id: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');
  }
}
