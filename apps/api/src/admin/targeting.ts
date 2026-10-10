import { BadRequestException } from '@nestjs/common';
import { CropSeason, Language, Prisma } from '@prisma/client';
import { ACTIVE_CROP_STATUSES } from '../farmer-crops/farmer-crops.service';
import { PrismaService } from '../prisma/prisma.service';

export interface Target {
  all?: boolean;
  state?: string | null;
  district?: string | null;
  cropId?: string | null;
  language?: Language | null;
  userIds?: string[];
  season?: CropSeason | null;
}

/** Resolves a notification audience to active farmer ids. */
export async function resolveRecipients(prisma: PrismaService, target: Target): Promise<string[]> {
  const hasFilter = !!(target.state || target.district || target.cropId || target.language || target.userIds?.length);
  if (!target.all && !hasFilter) {
    throw new BadRequestException('Choose a target audience: all farmers, or at least one filter');
  }

  const where: Prisma.UserWhereInput = {
    role: 'FARMER',
    isActive: true,
    language: target.language ?? undefined,
    id: target.userIds?.length ? { in: target.userIds } : undefined,
    AND: [
      // A farmer matches a region if their profile or any of their farms is in it.
      ...(target.state
        ? [
            {
              OR: [
                { state: { equals: target.state, mode: 'insensitive' as const } },
                { farms: { some: { state: { equals: target.state, mode: 'insensitive' as const } } } },
              ],
            },
          ]
        : []),
      ...(target.district
        ? [
            {
              OR: [
                { district: { equals: target.district, mode: 'insensitive' as const } },
                { farms: { some: { district: { equals: target.district, mode: 'insensitive' as const } } } },
              ],
            },
          ]
        : []),
      ...(target.cropId
        ? [{ farms: { some: { farmerCrops: { some: { cropId: target.cropId, status: { in: ACTIVE_CROP_STATUSES } } } } } }]
        : []),
    ],
  };
  const users = await prisma.user.findMany({ where, select: { id: true } });
  return users.map((u) => u.id);
}
