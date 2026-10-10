import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addDays, todayInIndia } from '@krishi/shared';
import { ACTIVE_CROP_STATUSES } from '../farmer-crops/farmer-crops.service';
import { PrismaService } from '../prisma/prisma.service';

export type ActivityRange = 'today' | 'upcoming' | 'overdue' | 'completed';

export const activityWithCropInclude = {
  farmerCrop: { select: { id: true, farm: { select: { id: true, name: true } }, crop: true } },
} satisfies Prisma.CropActivityInclude;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, range: ActivityRange, days = 7, take?: number) {
    const today = todayInIndia();
    const owned: Prisma.CropActivityWhereInput = {
      farmerCrop: { farm: { userId }, status: { in: ACTIVE_CROP_STATUSES } },
    };

    const byRange: Record<ActivityRange, Prisma.CropActivityWhereInput> = {
      today: { scheduledDate: today },
      upcoming: { scheduledDate: { gt: today, lte: addDays(today, days) }, completed: false },
      overdue: { scheduledDate: { lt: today }, completed: false },
      // Completed history includes harvested crops too.
      completed: { completed: true },
    };

    return this.prisma.cropActivity.findMany({
      where:
        range === 'completed'
          ? { farmerCrop: { farm: { userId } }, ...byRange.completed }
          : { ...owned, ...byRange[range] },
      include: activityWithCropInclude,
      orderBy:
        range === 'completed'
          ? [{ scheduledDate: 'desc' }]
          : [{ completed: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'asc' }],
      take: take ?? (range === 'completed' ? 100 : 200),
    });
  }

  countOverdue(userId: string) {
    return this.prisma.cropActivity.count({
      where: {
        farmerCrop: { farm: { userId }, status: { in: ACTIVE_CROP_STATUSES } },
        scheduledDate: { lt: todayInIndia() },
        completed: false,
      },
    });
  }

  async setCompleted(userId: string, id: string, completed: boolean) {
    const { count } = await this.prisma.cropActivity.updateMany({
      where: { id, farmerCrop: { farm: { userId } } },
      data: { completed, completedAt: completed ? new Date() : null },
    });
    if (count === 0) throw new NotFoundException('Activity not found');
    return this.prisma.cropActivity.findUniqueOrThrow({ where: { id } });
  }
}
